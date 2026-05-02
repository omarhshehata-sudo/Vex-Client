import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

import type { ModLoader } from '../mods/modsTypes';
import { createDefaultProfileShape, type LauncherProfile, type ProfilesFile } from './profileTypes';

export function profilesPath(userData: string): string {
	return join(userData, 'vex-launcher-profiles.json');
}

export function globalSettingsPath(userData: string): string {
	return join(userData, 'vex-launcher-settings.json');
}

export type LauncherGlobalSettings = {
	activeProfileId: string | null;
	closeLauncherAfterGameStart: boolean;
	extraJvmArgs: string;
	/** General / appearance (merged into `LauncherSettings` for the renderer). */
	language: string;
	startOnBoot: boolean;
	minimizeToTray: boolean;
	checkForUpdates: boolean;
	discordRichPresence: boolean;
	theme: string;
	accent: string;
	animationsEnabled: boolean;
	reduceMotion: boolean;
	accentIntensity: 'subtle' | 'normal' | 'strong';
	desktopNotifications: boolean;
	updatePrompts: boolean;
	newsHighlights: boolean;
	parallelDownloads: boolean;
	debugMode: boolean;
};

export const DEFAULT_GLOBAL_SETTINGS: LauncherGlobalSettings = {
	activeProfileId: null,
	closeLauncherAfterGameStart: false,
	extraJvmArgs: '',
	language: 'English',
	startOnBoot: false,
	minimizeToTray: false,
	checkForUpdates: true,
	discordRichPresence: true,
	theme: 'Dark Purple',
	accent: 'purple',
	animationsEnabled: true,
	reduceMotion: false,
	accentIntensity: 'normal',
	desktopNotifications: true,
	updatePrompts: true,
	newsHighlights: true,
	parallelDownloads: false,
	debugMode: false,
};

function readJson<T>(path: string, fallback: T): T {
	if (!existsSync(path)) return fallback;
	try {
		return JSON.parse(readFileSync(path, 'utf8')) as T;
	} catch {
		return fallback;
	}
}

export function loadProfilesFile(userData: string): ProfilesFile {
	const raw = readJson<Partial<ProfilesFile>>(profilesPath(userData), { version: 1, profiles: [] });
	return {
		version: 1,
		profiles: Array.isArray(raw.profiles) ? (raw.profiles as LauncherProfile[]) : [],
	};
}

export function saveProfilesFile(userData: string, file: ProfilesFile): void {
	const p = profilesPath(userData);
	mkdirSync(dirname(p), { recursive: true });
	writeFileSync(p, JSON.stringify(file, null, 2), 'utf8');
}

function readBool(raw: Record<string, unknown>, key: string, fallback: boolean): boolean {
	const v = raw[key];
	return typeof v === 'boolean' ? v : fallback;
}

function readStr(raw: Record<string, unknown>, key: string, fallback: string): string {
	const v = raw[key];
	return typeof v === 'string' ? v : fallback;
}

function readAccentIntensity(raw: Record<string, unknown>): 'subtle' | 'normal' | 'strong' {
	const v = raw.accentIntensity;
	if (v === 'subtle' || v === 'strong' || v === 'normal') return v;
	return DEFAULT_GLOBAL_SETTINGS.accentIntensity;
}

export function loadGlobalSettings(userData: string): LauncherGlobalSettings {
	const p = globalSettingsPath(userData);
	const raw = readJson<Record<string, unknown>>(p, {});
	const activeProfileId =
		typeof raw.activeProfileId === 'string' || raw.activeProfileId === null ? (raw.activeProfileId as string | null) : null;
	const g = DEFAULT_GLOBAL_SETTINGS;
	return {
		activeProfileId,
		closeLauncherAfterGameStart: readBool(raw, 'closeLauncherAfterGameStart', g.closeLauncherAfterGameStart),
		extraJvmArgs: readStr(raw, 'extraJvmArgs', g.extraJvmArgs),
		language: readStr(raw, 'language', g.language),
		startOnBoot: readBool(raw, 'startOnBoot', g.startOnBoot),
		minimizeToTray: readBool(raw, 'minimizeToTray', g.minimizeToTray),
		checkForUpdates: readBool(raw, 'checkForUpdates', g.checkForUpdates),
		discordRichPresence: readBool(raw, 'discordRichPresence', g.discordRichPresence),
		theme: readStr(raw, 'theme', g.theme),
		accent: readStr(raw, 'accent', g.accent),
		animationsEnabled: readBool(raw, 'animationsEnabled', g.animationsEnabled),
		reduceMotion: readBool(raw, 'reduceMotion', g.reduceMotion),
		accentIntensity: readAccentIntensity(raw),
		desktopNotifications: readBool(raw, 'desktopNotifications', g.desktopNotifications),
		updatePrompts: readBool(raw, 'updatePrompts', g.updatePrompts),
		newsHighlights: readBool(raw, 'newsHighlights', g.newsHighlights),
		parallelDownloads: readBool(raw, 'parallelDownloads', g.parallelDownloads),
		debugMode: readBool(raw, 'debugMode', g.debugMode),
	};
}

export function saveGlobalSettings(userData: string, g: LauncherGlobalSettings): void {
	const p = globalSettingsPath(userData);
	mkdirSync(dirname(p), { recursive: true });
	writeFileSync(p, JSON.stringify(g, null, 2), 'utf8');
}

function normalizeLoader(v: unknown): ModLoader {
	const LOADERS: ModLoader[] = ['vanilla', 'fabric', 'forge', 'quilt', 'neoforge'];
	if (typeof v === 'string' && LOADERS.includes(v as ModLoader)) return v as ModLoader;
	return 'fabric';
}

export function getActiveProfile(userData: string): LauncherProfile | null {
	const g = loadGlobalSettings(userData);
	const pf = loadProfilesFile(userData);
	if (!pf.profiles.length) return null;
	const id = g.activeProfileId;
	let p = id ? pf.profiles.find((x) => x.id === id) : undefined;
	if (!p) {
		p = pf.profiles[0];
		if (p && id !== p.id) {
			saveGlobalSettings(userData, { ...g, activeProfileId: p.id });
		}
	}
	return p ?? null;
}

/** Migrate legacy single-file settings into profiles + global. */
export function ensureProfilesMigrated(userData: string): void {
	if (existsSync(profilesPath(userData))) return;

	const p = globalSettingsPath(userData);
	if (!existsSync(p)) return;

	try {
		const raw = JSON.parse(readFileSync(p, 'utf8')) as Record<string, unknown>;

		const looksLegacy =
			typeof raw.ramMb === 'number' ||
			(typeof raw.gameDirectory === 'string' && raw.gameDirectory.length > 0 && 'selectedVersionId' in raw) ||
			(typeof raw.selectedVersionId === 'string' && raw.selectedVersionId.length > 0 && 'selectedModLoader' in raw);

		if (!looksLegacy) return;

		const fallbackGameDir = join(userData, 'instances', 'default');
		const gameDirectory =
			typeof raw.gameDirectory === 'string' && raw.gameDirectory.length > 0 ? raw.gameDirectory : fallbackGameDir;
		const id = randomUUID();
		const now = Math.floor(Date.now() / 1000);
		const loader = normalizeLoader(raw.selectedModLoader);

		const profile: LauncherProfile = {
			id,
			name: 'Default',
			minecraftVersion:
				typeof raw.selectedVersionId === 'string' && raw.selectedVersionId ? raw.selectedVersionId : '1.21.4',
			loader,
			loaderVersion: typeof raw.loaderVersion === 'string' ? raw.loaderVersion : '',
			ramMb: typeof raw.ramMb === 'number' ? raw.ramMb : 4096,
			javaPath: typeof raw.javaPath === 'string' ? raw.javaPath : 'java',
			gameDirectory,
			modsDirectory: '',
			resolutionWidth: typeof raw.resolutionWidth === 'number' ? raw.resolutionWidth : 1280,
			resolutionHeight: typeof raw.resolutionHeight === 'number' ? raw.resolutionHeight : 720,
			fullscreen: typeof raw.fullscreen === 'boolean' ? raw.fullscreen : false,
			icon: '🎮',
			color: '#7C5CFF',
			profileExtraJvmArgs: '',
			lastPlayedVersionId: typeof raw.lastPlayedVersionId === 'string' ? raw.lastPlayedVersionId : null,
			lastPlayedAtEpochSec:
				typeof raw.lastPlayedAtEpochSec === 'number' || raw.lastPlayedAtEpochSec === null
					? (raw.lastPlayedAtEpochSec as number | null)
					: null,
			createdAtEpochSec: now,
		};

		saveProfilesFile(userData, { version: 1, profiles: [profile] });
		const global: LauncherGlobalSettings = {
			...DEFAULT_GLOBAL_SETTINGS,
			activeProfileId: id,
			closeLauncherAfterGameStart:
				typeof raw.closeLauncherAfterGameStart === 'boolean' ? raw.closeLauncherAfterGameStart : false,
			extraJvmArgs: typeof raw.extraJvmArgs === 'string' ? raw.extraJvmArgs : '',
		};
		saveGlobalSettings(userData, global);
	} catch {
		/* ignore broken migration */
	}
}

export function ensureDefaultProfile(userData: string): LauncherProfile {
	let pf = loadProfilesFile(userData);
	if (pf.profiles.length) return pf.profiles[0]!;

	const fallbackGameDir = join(userData, 'instances', 'default');
	mkdirSync(fallbackGameDir, { recursive: true });
	const id = randomUUID();
	const now = Math.floor(Date.now() / 1000);
	const profile = createDefaultProfileShape({
		id,
		name: 'Default',
		gameDirectory: fallbackGameDir,
		minecraftVersion: '1.21.4',
		createdAtEpochSec: now,
	});
	pf = { version: 1, profiles: [profile] };
	saveProfilesFile(userData, pf);
	const g = loadGlobalSettings(userData);
	saveGlobalSettings(userData, { ...g, activeProfileId: id });
	return profile;
}

export function listProfiles(userData: string): LauncherProfile[] {
	ensureProfilesMigrated(userData);
	const pf = loadProfilesFile(userData);
	if (!pf.profiles.length) return [ensureDefaultProfile(userData)];
	return pf.profiles;
}

export function saveProfile(userData: string, profile: LauncherProfile): void {
	const pf = loadProfilesFile(userData);
	const rest = pf.profiles.filter((p) => p.id !== profile.id);
	saveProfilesFile(userData, { version: 1, profiles: [...rest, profile] });
}

export function deleteProfileById(userData: string, profileId: string): { ok: true } | { ok: false; detail: string } {
	const pf = loadProfilesFile(userData);
	if (pf.profiles.length <= 1) {
		return { ok: false, detail: 'Cannot delete the last profile.' };
	}
	const next = pf.profiles.filter((p) => p.id !== profileId);
	saveProfilesFile(userData, { version: 1, profiles: next });
	const g = loadGlobalSettings(userData);
	if (g.activeProfileId === profileId) {
		saveGlobalSettings(userData, { ...g, activeProfileId: next[0]?.id ?? null });
	}
	return { ok: true };
}

export function duplicateProfile(userData: string, profileId: string): LauncherProfile | null {
	const pf = loadProfilesFile(userData);
	const src = pf.profiles.find((p) => p.id === profileId);
	if (!src) return null;
	const copy: LauncherProfile = {
		...src,
		id: randomUUID(),
		name: `${src.name} (copy)`,
		lastPlayedVersionId: null,
		lastPlayedAtEpochSec: null,
		createdAtEpochSec: Math.floor(Date.now() / 1000),
	};
	saveProfilesFile(userData, { version: 1, profiles: [...pf.profiles, copy] });
	return copy;
}

export function setActiveProfileId(userData: string, id: string | null): void {
	const g = loadGlobalSettings(userData);
	saveGlobalSettings(userData, { ...g, activeProfileId: id });
}

export function touchProfileLastPlayed(userData: string, profileId: string): void {
	const p = loadProfilesFile(userData).profiles.find((x) => x.id === profileId);
	if (!p) return;
	saveProfile(userData, { ...p, lastPlayedAtEpochSec: Math.floor(Date.now() / 1000) });
}

export function getProfileById(userData: string, id: string): LauncherProfile | null {
	return loadProfilesFile(userData).profiles.find((p) => p.id === id) ?? null;
}
