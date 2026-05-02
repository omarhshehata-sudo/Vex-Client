import { mkdirSync } from 'node:fs';
import { ipcMain } from 'electron';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

import type { LauncherProfile } from '../profiles/profileTypes';
import { createDefaultProfileShape } from '../profiles/profileTypes';
import {
	deleteProfileById,
	duplicateProfile,
	getProfileById,
	listProfiles,
	loadGlobalSettings,
	saveGlobalSettings,
	saveProfile,
	setActiveProfileId,
} from '../profiles/profilesStore';
import type { ModLoader } from '../mods/modsTypes';

type Fail = { ok: false; title: string; detail: string };

function fail(title: string, detail: string): Fail {
	return { ok: false, title, detail };
}

const LOADERS: ModLoader[] = ['vanilla', 'fabric', 'forge', 'quilt', 'neoforge'];

function normalizeLoader(v: unknown): ModLoader {
	if (typeof v === 'string' && LOADERS.includes(v as ModLoader)) return v as ModLoader;
	return 'fabric';
}

export function registerProfilesIpc(getUserData: () => string): void {
	ipcMain.handle('profiles:list', async () => {
		const ud = getUserData();
		return { ok: true as const, profiles: listProfiles(ud) };
	});

	ipcMain.handle('profiles:setActive', async (_e, profileId: string) => {
		const id = String(profileId ?? '').trim();
		if (!id) return fail('Invalid profile', '');
		const p = getProfileById(getUserData(), id);
		if (!p) return fail('Not found', 'That profile does not exist.');
		setActiveProfileId(getUserData(), id);
		return { ok: true as const };
	});

	ipcMain.handle('profiles:create', async (_e, input: Partial<LauncherProfile> & { name?: string; minecraftVersion?: string }) => {
		const ud = getUserData();
		const now = Math.floor(Date.now() / 1000);
		const id = randomUUID();
		const fallbackGameDir = join(ud, 'instances', id.slice(0, 8));
		const name = typeof input.name === 'string' && input.name.trim() ? input.name.trim() : 'New profile';
		const mc = typeof input.minecraftVersion === 'string' && input.minecraftVersion.trim() ? input.minecraftVersion.trim() : '1.21.4';
		const loader = normalizeLoader(input.loader);
		const base = createDefaultProfileShape({
			id,
			name,
			gameDirectory: typeof input.gameDirectory === 'string' && input.gameDirectory.trim() ? input.gameDirectory.trim() : fallbackGameDir,
			minecraftVersion: mc,
			createdAtEpochSec: now,
			loader,
		});
		const profile: LauncherProfile = {
			...base,
			loaderVersion: typeof input.loaderVersion === 'string' ? input.loaderVersion : base.loaderVersion,
			ramMb: typeof input.ramMb === 'number' ? input.ramMb : base.ramMb,
			javaPath: typeof input.javaPath === 'string' ? input.javaPath : base.javaPath,
			modsDirectory: typeof input.modsDirectory === 'string' ? input.modsDirectory : base.modsDirectory,
			resolutionWidth: typeof input.resolutionWidth === 'number' ? input.resolutionWidth : base.resolutionWidth,
			resolutionHeight: typeof input.resolutionHeight === 'number' ? input.resolutionHeight : base.resolutionHeight,
			fullscreen: typeof input.fullscreen === 'boolean' ? input.fullscreen : base.fullscreen,
			icon: typeof input.icon === 'string' ? input.icon : base.icon,
			color: typeof input.color === 'string' ? input.color : base.color,
			profileExtraJvmArgs: typeof input.profileExtraJvmArgs === 'string' ? input.profileExtraJvmArgs : base.profileExtraJvmArgs,
		};
		mkdirSync(profile.gameDirectory, { recursive: true });
		saveProfile(ud, profile);
		const g = loadGlobalSettings(ud);
		saveGlobalSettings(ud, { ...g, activeProfileId: id });
		return { ok: true as const, profile };
	});

	ipcMain.handle('profiles:update', async (_e, opts: { id: string; patch: Partial<LauncherProfile> }) => {
		const ud = getUserData();
		const id = String(opts?.id ?? '').trim();
		if (!id) return fail('Invalid profile', '');
		const cur = getProfileById(ud, id);
		if (!cur) return fail('Not found', 'That profile does not exist.');
		const { id: _ignore, ...rest } = opts.patch ?? {};
		const p: LauncherProfile = { ...cur, ...rest, id: cur.id };
		saveProfile(ud, p);
		return { ok: true as const, profile: p };
	});

	ipcMain.handle('profiles:delete', async (_e, profileId: string) => {
		const id = String(profileId ?? '').trim();
		if (!id) return fail('Invalid profile', '');
		const r = deleteProfileById(getUserData(), id);
		if (!r.ok) return fail('Cannot delete', r.detail);
		return { ok: true as const };
	});

	ipcMain.handle('profiles:duplicate', async (_e, profileId: string) => {
		const id = String(profileId ?? '').trim();
		if (!id) return fail('Invalid profile', '');
		const copy = duplicateProfile(getUserData(), id);
		if (!copy) return fail('Not found', 'That profile does not exist.');
		return { ok: true as const, profile: copy };
	});
}
