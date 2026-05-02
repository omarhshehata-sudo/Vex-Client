import { mkdirSync } from 'node:fs';
import { BrowserWindow, dialog, ipcMain, shell } from 'electron';

import { loadSettings, patchSettings } from '../settings/settingsStore';
import { getProfileById } from '../profiles/profilesStore';
import { getProject, getVersion, listProjectVersions, searchMods, type ModrinthSearchSort } from '../mods/modrinthClient';
import { deleteMod, importLocalModJars, installModrinthVersion, listModsForProfile, resolveCompatibleVersionId, setModEnabled } from '../mods/modsInstall';
import type { ModLoader } from '../mods/modsTypes';
import { profileModsDir, resolveProfileModsDirectory } from '../mods/modsPaths';
import { loadModsState } from '../mods/modsStore';

type Fail = { ok: false; title: string; detail: string };
type Ok = { ok: true };

function fail(title: string, detail: string): Fail {
	return { ok: false, title, detail };
}

export function registerModsIpc(getUserData: () => string): void {
	ipcMain.handle('mods:getState', async () => {
		const ud = getUserData();
		const settings = loadSettings(ud);
		const state = loadModsState(ud);
		const launcherProfileId = settings.launcherProfileId;
		const profileMods = listModsForProfile(state, launcherProfileId);
		const modCount = profileMods.length;
		return { state, settings, profileId: launcherProfileId, modCount };
	});

	ipcMain.handle(
		'mods:search',
		async (
			_e,
			opts: {
				query: string;
				limit?: number;
				offset?: number;
				gameVersion?: string;
				loader?: string;
				sort?: ModrinthSearchSort;
			},
		) => {
			try {
				const r = await searchMods({
					query: opts.query ?? '',
					limit: Math.min(50, Math.max(1, opts.limit ?? 20)),
					offset: Math.max(0, opts.offset ?? 0),
					gameVersion: opts.gameVersion,
					loader: opts.loader,
					sort: opts.sort ?? 'relevance',
				});
				return { ok: true as const, result: r };
			} catch (e) {
				return { ok: false as const, title: 'Modrinth search failed', detail: e instanceof Error ? e.message : String(e) };
			}
		},
	);

	ipcMain.handle('mods:getProject', async (_e, id: string) => {
		try {
			const p = await getProject(String(id ?? '').trim());
			return { ok: true as const, project: p };
		} catch (e) {
			return { ok: false as const, title: 'Project load failed', detail: e instanceof Error ? e.message : String(e) };
		}
	});

	ipcMain.handle('mods:listProjectVersions', async (_e, projectId: string, gameVersion?: string, loader?: string) => {
		try {
			const loaders = loader ? [loader] : undefined;
			const gv = gameVersion ? [gameVersion] : undefined;
			const list = await listProjectVersions(String(projectId ?? '').trim(), { gameVersions: gv, loaders });
			return { ok: true as const, versions: list };
		} catch (e) {
			return { ok: false as const, title: 'Versions load failed', detail: e instanceof Error ? e.message : String(e) };
		}
	});

	ipcMain.handle('mods:getVersion', async (_e, versionId: string) => {
		try {
			const v = await getVersion(String(versionId ?? '').trim());
			return { ok: true as const, version: v };
		} catch (e) {
			return { ok: false as const, title: 'Version load failed', detail: e instanceof Error ? e.message : String(e) };
		}
	});

	ipcMain.handle(
		'mods:installVersion',
		async (
			_e,
			opts: { versionId: string; minecraftVersion: string; loader: ModLoader; installDeps: boolean },
		): Promise<{ ok: true; mod: unknown; installedDeps: string[] } | Fail> => {
			const ud = getUserData();
			const settings = loadSettings(ud);
			try {
				const version = await getVersion(String(opts.versionId ?? '').trim());
				const r = await installModrinthVersion({
					userData: ud,
					settings,
					minecraftVersion: String(opts.minecraftVersion ?? '').trim(),
					loader: opts.loader,
					version,
					installDeps: Boolean(opts.installDeps),
				});
				if (!r.ok) return r;
				return { ok: true, mod: r.mod, installedDeps: r.installedDeps };
			} catch (e) {
				return fail('Install failed', e instanceof Error ? e.message : String(e));
			}
		},
	);

	ipcMain.handle(
		'mods:resolveLatest',
		async (_e, opts: { projectId: string; minecraftVersion: string; loader: ModLoader }) => {
			try {
				const r = await resolveCompatibleVersionId(opts.projectId, opts.minecraftVersion, opts.loader);
				if (!r.ok) return r;
				return { ok: true as const, version: r.version };
			} catch (e) {
				return fail('Resolve failed', e instanceof Error ? e.message : String(e));
			}
		},
	);

	ipcMain.handle('mods:setEnabled', async (_e, modId: string, enabled: boolean) => {
		try {
			return setModEnabled(getUserData(), String(modId), Boolean(enabled));
		} catch (e) {
			return fail('Toggle failed', e instanceof Error ? e.message : String(e));
		}
	});

	ipcMain.handle('mods:delete', async (_e, modId: string) => {
		try {
			return deleteMod(getUserData(), String(modId));
		} catch (e) {
			return fail('Delete failed', e instanceof Error ? e.message : String(e));
		}
	});

	ipcMain.handle('mods:openModsFolder', async (_e, profileId: string) => {
		const ud = getUserData();
		const id = String(profileId ?? '').trim();
		if (!id) return fail('Invalid profile', '');
		const lp = getProfileById(ud, id);
		let dir: string;
		try {
			dir = lp ? resolveProfileModsDirectory(ud, lp) : profileModsDir(ud, id);
		} catch (e) {
			return fail('Could not resolve mods folder', e instanceof Error ? e.message : String(e));
		}
		mkdirSync(dir, { recursive: true });
		const r = await shell.openPath(dir);
		if (r) return fail('Could not open folder', r);
		return { ok: true as const };
	});

	ipcMain.handle('mods:pickImportJars', async (event) => {
		const win = BrowserWindow.fromWebContents(event.sender);
		const r = await dialog.showOpenDialog(win ?? undefined, {
			title: 'Select mod .jar files',
			properties: ['openFile', 'multiSelections'],
			filters: [{ name: 'Minecraft mods', extensions: ['jar'] }],
		});
		if (r.canceled || !r.filePaths?.length) return { ok: true as const, paths: [] as string[] };
		return { ok: true as const, paths: r.filePaths };
	});

	ipcMain.handle(
		'mods:importPaths',
		async (_e, opts: { paths: string[]; minecraftVersion: string; loader: ModLoader }) => {
			const ud = getUserData();
			const settings = loadSettings(ud);
			const paths = (opts.paths ?? []).map((p) => String(p).trim()).filter(Boolean);
			if (!paths.length) return fail('No files', 'Pick one or more .jar files.');
			try {
				const r = importLocalModJars({
					userData: ud,
					settings,
					minecraftVersion: String(opts.minecraftVersion ?? '').trim(),
					loader: opts.loader,
					sourcePaths: paths,
				});
				return r;
			} catch (e) {
				return fail('Import failed', e instanceof Error ? e.message : String(e));
			}
		},
	);

	ipcMain.handle('mods:setProfileSelection', async (_e, patch: { selectedModLoader?: ModLoader; selectedProfileId?: string | null }) => {
		const ud = getUserData();
		const p: Record<string, unknown> = {};
		if (patch.selectedModLoader !== undefined) p.selectedModLoader = patch.selectedModLoader;
		if (patch.selectedProfileId !== undefined) p.selectedProfileId = patch.selectedProfileId;
		patchSettings(ud, p as Parameters<typeof patchSettings>[1]);
		return { ok: true as const };
	});
}
