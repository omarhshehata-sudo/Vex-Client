import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { basename, delimiter, join } from 'node:path';

import { getProfileById } from '../profiles/profilesStore';
import type { LauncherSettings } from '../types';
import type { ModsPersistedState } from './modsTypes';
import { profileIdFrom } from './modsTypes';
import { profileModsDir, resolveProfileModsDirectory } from './modsPaths';
import { loadModsState } from './modsStore';

function activeJarPaths(modsDir: string): string[] {
	if (!existsSync(modsDir)) return [];
	return readdirSync(modsDir)
		.filter((f) => f.toLowerCase().endsWith('.jar') && !f.toLowerCase().endsWith('.jar.disabled'))
		.map((f) => join(modsDir, f));
}

/** Extra JVM flags so Fabric/Quilt pick up profile mods outside default game dir mods folder. */
export function fabricStyleAddModsJvmArg(modsDir: string): string[] {
	const jars = activeJarPaths(modsDir);
	if (!jars.length) return [];
	const joined = jars.join(delimiter);
	return [`-Dfabric.addMods=${joined}`];
}

function resolveModsDirForLaunch(userData: string, settings: LauncherSettings): string {
	const id = settings.selectedProfileId ?? settings.launcherProfileId;
	if (!id) {
		const mc = settings.selectedVersionId?.trim() ?? '';
		const loader = settings.selectedModLoader;
		return profileModsDir(userData, profileIdFrom(mc, loader));
	}
	const lp = getProfileById(userData, id);
	if (lp) {
		try {
			return resolveProfileModsDirectory(userData, lp);
		} catch {
			return profileModsDir(userData, id);
		}
	}
	return profileModsDir(userData, id);
}

export function buildModsJvmArgs(userData: string, settings: LauncherSettings): string[] {
	const loader = settings.selectedModLoader;
	if (loader === 'vanilla') return [];
	const modsDir = resolveModsDirForLaunch(userData, settings);
	if (loader === 'fabric' || loader === 'quilt') {
		return fabricStyleAddModsJvmArg(modsDir);
	}
	return [];
}

/** Forge/NeoForge/Vanilla discover jars from gameDirectory/mods — copy enabled profile jars before launch. */
export function syncForgeProfileModsToGameDir(userData: string, settings: LauncherSettings, _state: ModsPersistedState): void {
	const loader = settings.selectedModLoader;
	if (loader !== 'forge' && loader !== 'neoforge' && loader !== 'vanilla') return;
	const modsDir = resolveModsDirForLaunch(userData, settings);
	const destRoot = join(settings.gameDirectory, 'mods');
	mkdirSync(destRoot, { recursive: true });
	const jars = activeJarPaths(modsDir);
	for (const src of jars) {
		const dest = join(destRoot, basename(src));
		try {
			copyFileSync(src, dest);
		} catch {
			/* ignore single-file failure */
		}
	}
}

export function applyModsForLaunch(userData: string, settings: LauncherSettings): string[] {
	const state = loadModsState(userData);
	syncForgeProfileModsToGameDir(userData, settings, state);
	return buildModsJvmArgs(userData, settings);
}
