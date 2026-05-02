import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { loadGlobalSettings, loadProfilesFile } from '../profiles/profilesStore';
import type { InstalledModRecord, ModsPersistedState } from './modsTypes';
import { EMPTY_MODS_STATE, profileIdFrom } from './modsTypes';

export function modsStatePath(userData: string): string {
	return join(userData, 'vex-mods-state.json');
}

function migrateInstalledMods(userData: string, mods: InstalledModRecord[]): InstalledModRecord[] {
	const pf = loadProfilesFile(userData);
	const g = loadGlobalSettings(userData);
	const activeId = g.activeProfileId ?? pf.profiles[0]?.id ?? '';

	return mods.map((m) => {
		if (m.launcherProfileId) return m;
		const key = profileIdFrom(m.minecraftVersion, m.loader);
		const candidates = pf.profiles.filter((p) => profileIdFrom(p.minecraftVersion, p.loader) === key);
		const pid = candidates.length === 1 ? candidates[0]!.id : activeId;
		return { ...m, launcherProfileId: pid };
	});
}

export function loadModsState(userData: string): ModsPersistedState {
	const p = modsStatePath(userData);
	if (!existsSync(p)) {
		return { ...EMPTY_MODS_STATE };
	}
	try {
		const raw = JSON.parse(readFileSync(p, 'utf8')) as Partial<{
			version: number;
			profiles: unknown[];
			installedMods: InstalledModRecord[];
		}>;
		const ver = typeof raw.version === 'number' ? raw.version : 1;
		let installedMods = Array.isArray(raw.installedMods) ? raw.installedMods : [];

		if (ver < 2) {
			installedMods = migrateInstalledMods(userData, installedMods);
			const next: ModsPersistedState = { version: 2, installedMods };
			saveModsState(userData, next);
			return next;
		}

		return {
			version: 2,
			installedMods,
		};
	} catch {
		return { ...EMPTY_MODS_STATE };
	}
}

export function saveModsState(userData: string, state: ModsPersistedState): void {
	const path = modsStatePath(userData);
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, JSON.stringify(state, null, 2), 'utf8');
}

export function addInstalledMod(state: ModsPersistedState, mod: InstalledModRecord): ModsPersistedState {
	return { ...state, installedMods: [...state.installedMods.filter((m) => m.id !== mod.id), mod] };
}

export function removeInstalledMod(state: ModsPersistedState, modId: string): ModsPersistedState {
	return { ...state, installedMods: state.installedMods.filter((m) => m.id !== modId) };
}

export function updateInstalledMod(state: ModsPersistedState, modId: string, patch: Partial<InstalledModRecord>): ModsPersistedState {
	return {
		...state,
		installedMods: state.installedMods.map((m) => (m.id === modId ? { ...m, ...patch } : m)),
	};
}
