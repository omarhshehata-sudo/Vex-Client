import { copyFileSync, existsSync, renameSync, unlinkSync } from 'node:fs';
import { basename, join } from 'node:path';
import { randomUUID } from 'node:crypto';

import { getProfileById } from '../profiles/profilesStore';
import type { LauncherSettings } from '../types';
import type { InstalledModRecord, ModLoader } from './modsTypes';
import { assertModFilePathAllowed, profileModsDir, resolveProfileModsDirectory } from './modsPaths';
import { addInstalledMod, loadModsState, saveModsState } from './modsStore';
import { downloadToFile, getProject, listProjectVersions, pickPrimaryFile, type ModrinthVersion } from './modrinthClient';

export type InstallResult =
	| { ok: true; mod: InstalledModRecord; installedDeps: string[] }
	| { ok: false; title: string; detail: string };

function loaderList(loader: ModLoader): string[] {
	if (loader === 'vanilla') return [];
	return [loader];
}

function findCompatibleVersion(versions: ModrinthVersion[], mc: string, loader: ModLoader): ModrinthVersion | null {
	const loaders = loaderList(loader);
	if (!loaders.length) return null;
	for (const v of versions) {
		const okMc = v.game_versions?.includes(mc);
		const okLd = v.loaders?.some((l) => loaders.includes(l as ModLoader));
		if (okMc && okLd) return v;
	}
	return null;
}

export async function resolveCompatibleVersionId(
	projectId: string,
	minecraftVersion: string,
	loader: ModLoader,
): Promise<{ ok: true; version: ModrinthVersion } | { ok: false; title: string; detail: string }> {
	const list = await listProjectVersions(projectId, {
		gameVersions: [minecraftVersion],
		loaders: loaderList(loader),
	});
	const v = findCompatibleVersion(list, minecraftVersion, loader);
	if (!v) {
		return {
			ok: false,
			title: 'No compatible file',
			detail: `No Modrinth release for ${minecraftVersion} + ${loader} on this project.`,
		};
	}
	return { ok: true, version: v };
}

function resolveModsInstallDir(userData: string, settings: LauncherSettings): string {
	const id = settings.selectedProfileId ?? settings.launcherProfileId;
	if (!id) throw new Error('No active profile.');
	const lp = getProfileById(userData, id);
	if (lp) return resolveProfileModsDirectory(userData, lp);
	return profileModsDir(userData, id);
}

export async function installModrinthVersion(opts: {
	userData: string;
	settings: LauncherSettings;
	minecraftVersion: string;
	loader: ModLoader;
	version: ModrinthVersion;
	installDeps: boolean;
	visit?: Set<string>;
}): Promise<InstallResult> {
	const visit = opts.visit ?? new Set<string>();
	const { userData, settings, minecraftVersion, loader, version, installDeps } = opts;

	if (loader === 'vanilla') {
		return { ok: false, title: 'Vanilla', detail: 'Modrinth mods cannot be installed on a vanilla profile.' };
	}

	if (visit.has(version.project_id)) {
		return { ok: false, title: 'Circular dependency', detail: `Stopped at ${version.project_id}.` };
	}
	visit.add(version.project_id);

	const launcherProfileId = settings.selectedProfileId ?? settings.launcherProfileId;
	if (!launcherProfileId) {
		return { ok: false, title: 'No profile', detail: 'Select a launcher profile first.' };
	}

	let state = loadModsState(userData);

	const dup = state.installedMods.some((m) => m.projectId === version.project_id && m.launcherProfileId === launcherProfileId);
	if (dup) {
		return { ok: false, title: 'Already installed', detail: 'This project is already in the profile.' };
	}

	const modsDir = resolveModsInstallDir(userData, settings);
	const file = pickPrimaryFile(version);
	if (!file?.url) {
		return { ok: false, title: 'No file', detail: 'This Modrinth version has no downloadable jar.' };
	}

	const destName = file.filename || `${version.project_id}-${version.version_number}.jar`;
	if (!destName.toLowerCase().endsWith('.jar')) {
		return { ok: false, title: 'Unsupported file', detail: 'Expected a .jar primary file.' };
	}
	const destPath = join(modsDir, destName);

	if (existsSync(destPath)) {
		return { ok: false, title: 'Already installed', detail: `${destName} already exists in this profile.` };
	}

	const installedDeps: string[] = [];

	if (installDeps) {
		for (const dep of version.dependencies ?? []) {
			if (dep.dependency_type !== 'required') continue;
			if (!dep.project_id) continue;
			if (visit.has(dep.project_id)) continue;

			const already = state.installedMods.some((m) => m.projectId === dep.project_id && m.launcherProfileId === launcherProfileId);
			if (already) continue;

			const r = await resolveCompatibleVersionId(dep.project_id, minecraftVersion, loader);
			if (!r.ok) continue;

			const sub = await installModrinthVersion({
				userData,
				settings,
				minecraftVersion,
				loader,
				version: r.version,
				installDeps: true,
				visit,
			});
			if (sub.ok) {
				installedDeps.push(sub.mod.name);
				state = loadModsState(userData);
			}
		}
	}

	await downloadToFile(file.url, destPath);

	const proj = await getProject(version.project_id).catch(() => ({ title: version.name, icon_url: undefined } as { title: string; icon_url?: string | null }));

	const lp = getProfileById(userData, launcherProfileId);
	const mod: InstalledModRecord = {
		id: randomUUID(),
		source: 'modrinth',
		projectId: version.project_id,
		versionId: version.id,
		name: proj.title ?? version.name,
		filename: destName,
		filePath: lp ? assertModFilePathAllowed(userData, lp, destPath) : destPath,
		minecraftVersion,
		loader,
		launcherProfileId,
		enabled: true,
		installedAt: new Date().toISOString(),
		iconUrl: proj.icon_url ?? undefined,
		fileSizeBytes: file.size,
	};

	state = addInstalledMod(state, mod);
	saveModsState(userData, state);

	return { ok: true, mod, installedDeps };
}

export function setModEnabled(userData: string, modId: string, enabled: boolean): { ok: true } | { ok: false; title: string; detail: string } {
	const state = loadModsState(userData);
	const mod = state.installedMods.find((m) => m.id === modId);
	if (!mod) return { ok: false, title: 'Not found', detail: 'Mod entry missing.' };
	const lp = mod.launcherProfileId ? getProfileById(userData, mod.launcherProfileId) : null;

	let abs: string;
	try {
		abs = assertModFilePathAllowed(userData, lp, mod.filePath);
	} catch (e) {
		return { ok: false, title: 'Invalid path', detail: e instanceof Error ? e.message : String(e) };
	}

	const cur = abs;
	const isDisabled = cur.toLowerCase().endsWith('.disabled');
	let nextPath = cur;

	if (enabled && isDisabled) {
		const enabledPath = cur.slice(0, -'.disabled'.length);
		if (existsSync(enabledPath)) {
			return { ok: false, title: 'Conflict', detail: `Cannot enable: ${basename(enabledPath)} already exists.` };
		}
		renameSync(cur, enabledPath);
		nextPath = assertModFilePathAllowed(userData, lp, enabledPath);
	} else if (!enabled && !isDisabled) {
		const dis = `${cur}.disabled`;
		if (existsSync(dis)) {
			return { ok: false, title: 'Conflict', detail: `${basename(dis)} already exists.` };
		}
		renameSync(cur, dis);
		nextPath = assertModFilePathAllowed(userData, lp, dis);
	}

	const nextState = {
		...state,
		installedMods: state.installedMods.map((m) => (m.id === modId ? { ...m, filePath: nextPath, enabled } : m)),
	};
	saveModsState(userData, nextState);
	return { ok: true };
}

export function deleteMod(userData: string, modId: string): { ok: true } | { ok: false; title: string; detail: string } {
	let state = loadModsState(userData);
	const mod = state.installedMods.find((m) => m.id === modId);
	if (!mod) return { ok: false, title: 'Not found', detail: 'Mod entry missing.' };
	const lp = mod.launcherProfileId ? getProfileById(userData, mod.launcherProfileId) : null;
	try {
		const abs = assertModFilePathAllowed(userData, lp, mod.filePath);
		if (existsSync(abs)) unlinkSync(abs);
	} catch (e) {
		return { ok: false, title: 'Delete failed', detail: e instanceof Error ? e.message : String(e) };
	}
	state = { ...state, installedMods: state.installedMods.filter((m) => m.id !== modId) };
	saveModsState(userData, state);
	return { ok: true };
}

export function listModsForProfile(state: ReturnType<typeof loadModsState>, launcherProfileId: string): InstalledModRecord[] {
	return state.installedMods.filter((m) => m.launcherProfileId === launcherProfileId);
}

export function importLocalModJars(opts: {
	userData: string;
	settings: LauncherSettings;
	minecraftVersion: string;
	loader: ModLoader;
	sourcePaths: string[];
}): { ok: true; mods: InstalledModRecord[] } | { ok: false; title: string; detail: string } {
	const { userData, settings, minecraftVersion, loader, sourcePaths } = opts;
	const launcherProfileId = settings.selectedProfileId ?? settings.launcherProfileId;
	if (!launcherProfileId) {
		return { ok: false, title: 'No profile', detail: 'Select a launcher profile first.' };
	}
	if (loader === 'vanilla') {
		return { ok: false, title: 'Vanilla', detail: 'Importing mods is not supported for vanilla profiles.' };
	}
	const modsDir = resolveModsInstallDir(userData, settings);
	let state = loadModsState(userData);
	const lp = getProfileById(userData, launcherProfileId);
	const out: InstalledModRecord[] = [];

	for (const src of sourcePaths) {
		const name = basename(src);
		if (!name.toLowerCase().endsWith('.jar')) {
			return { ok: false, title: 'Invalid file', detail: `Not a .jar: ${name}` };
		}
		if (!existsSync(src)) {
			return { ok: false, title: 'Missing file', detail: `Source not found: ${src}` };
		}
		const dest = join(modsDir, name);
		if (existsSync(dest)) {
			return { ok: false, title: 'Already exists', detail: `${name} is already in this profile.` };
		}
	}

	for (const src of sourcePaths) {
		const name = basename(src);
		const dest = join(modsDir, name);
		try {
			copyFileSync(src, dest);
		} catch (e) {
			return { ok: false, title: 'Import failed', detail: e instanceof Error ? e.message : String(e) };
		}
		const abs = lp ? assertModFilePathAllowed(userData, lp, dest) : dest;
		const mod: InstalledModRecord = {
			id: randomUUID(),
			source: 'local',
			name: name.replace(/\.jar$/i, ''),
			filename: name,
			filePath: abs,
			minecraftVersion,
			loader,
			launcherProfileId,
			enabled: true,
			installedAt: new Date().toISOString(),
		};
		state = addInstalledMod(state, mod);
		out.push(mod);
	}
	saveModsState(userData, state);
	return { ok: true, mods: out };
}
