import { existsSync } from 'node:fs';

import type { LauncherSettings, ModLoader } from '../types';
import { mergeProfileIntoSettings } from '../types';
import { normalizeSelectedVersionId } from '../minecraft/versionManifest';
import type { LauncherProfile } from '../profiles/profileTypes';
import {
	DEFAULT_GLOBAL_SETTINGS,
	ensureDefaultProfile,
	ensureProfilesMigrated,
	getActiveProfile,
	getProfileById,
	loadGlobalSettings,
	saveGlobalSettings,
	saveProfile,
	profilesPath,
	globalSettingsPath,
} from '../profiles/profilesStore';

const LOADERS: ModLoader[] = ['vanilla', 'fabric', 'forge', 'quilt', 'neoforge'];

function normalizeModLoader(v: unknown): ModLoader {
	if (typeof v === 'string' && LOADERS.includes(v as ModLoader)) return v as ModLoader;
	return 'fabric';
}

function ensureInitialized(userData: string): void {
	ensureProfilesMigrated(userData);
	if (!existsSync(profilesPath(userData))) {
		ensureDefaultProfile(userData);
	}
}

export function settingsPath(userData: string): string {
	return globalSettingsPath(userData);
}

export function loadSettings(userData: string): LauncherSettings {
	ensureInitialized(userData);
	const global = loadGlobalSettings(userData);
	const active = getActiveProfile(userData) ?? ensureDefaultProfile(userData);
	return mergeProfileIntoSettings(active, global);
}

export function patchSettings(userData: string, patch: Partial<LauncherSettings>): LauncherSettings {
	ensureInitialized(userData);
	let global = loadGlobalSettings(userData);

	// Switch active profile first so every other key in this patch applies to the intended profile
	// (a single `settings:set` may bundle `selectedProfileId` with `selectedModLoader`, RAM, etc.).
	if (patch.selectedProfileId !== undefined) {
		const sid = patch.selectedProfileId;
		if (typeof sid === 'string' && sid.length > 0 && sid !== global.activeProfileId) {
			const exists = getProfileById(userData, sid);
			if (exists) {
				global = { ...global, activeProfileId: sid };
				saveGlobalSettings(userData, global);
				global = loadGlobalSettings(userData);
			}
		}
	}

	const active = getActiveProfile(userData) ?? ensureDefaultProfile(userData);
	let nextGlobal = { ...global };
	let nextProfile: LauncherProfile = { ...active };

	if (typeof patch.closeLauncherAfterGameStart === 'boolean') {
		nextGlobal.closeLauncherAfterGameStart = patch.closeLauncherAfterGameStart;
	}
	if (typeof patch.extraJvmArgs === 'string') {
		nextGlobal.extraJvmArgs = patch.extraJvmArgs;
	}
	if (typeof patch.language === 'string') nextGlobal.language = patch.language;
	if (typeof patch.startOnBoot === 'boolean') nextGlobal.startOnBoot = patch.startOnBoot;
	if (typeof patch.minimizeToTray === 'boolean') nextGlobal.minimizeToTray = patch.minimizeToTray;
	if (typeof patch.checkForUpdates === 'boolean') nextGlobal.checkForUpdates = patch.checkForUpdates;
	if (typeof patch.discordRichPresence === 'boolean') nextGlobal.discordRichPresence = patch.discordRichPresence;
	if (typeof patch.theme === 'string') nextGlobal.theme = patch.theme;
	if (typeof patch.accent === 'string') nextGlobal.accent = patch.accent;
	if (typeof patch.animationsEnabled === 'boolean') nextGlobal.animationsEnabled = patch.animationsEnabled;
	if (typeof patch.reduceMotion === 'boolean') nextGlobal.reduceMotion = patch.reduceMotion;
	if (patch.accentIntensity === 'subtle' || patch.accentIntensity === 'normal' || patch.accentIntensity === 'strong') {
		nextGlobal.accentIntensity = patch.accentIntensity;
	}
	if (typeof patch.desktopNotifications === 'boolean') nextGlobal.desktopNotifications = patch.desktopNotifications;
	if (typeof patch.updatePrompts === 'boolean') nextGlobal.updatePrompts = patch.updatePrompts;
	if (typeof patch.newsHighlights === 'boolean') nextGlobal.newsHighlights = patch.newsHighlights;
	if (typeof patch.parallelDownloads === 'boolean') nextGlobal.parallelDownloads = patch.parallelDownloads;
	if (typeof patch.debugMode === 'boolean') nextGlobal.debugMode = patch.debugMode;

	if (typeof patch.ramMb === 'number') nextProfile.ramMb = patch.ramMb;
	if (typeof patch.javaPath === 'string') nextProfile.javaPath = patch.javaPath;
	if (typeof patch.gameDirectory === 'string') nextProfile.gameDirectory = patch.gameDirectory;
	if (typeof patch.resolutionWidth === 'number') nextProfile.resolutionWidth = patch.resolutionWidth;
	if (typeof patch.resolutionHeight === 'number') nextProfile.resolutionHeight = patch.resolutionHeight;
	if (typeof patch.fullscreen === 'boolean') nextProfile.fullscreen = patch.fullscreen;
	if (patch.selectedVersionId !== undefined) {
		nextProfile.minecraftVersion = normalizeSelectedVersionId(patch.selectedVersionId) ?? nextProfile.minecraftVersion;
	}
	if (patch.selectedModLoader !== undefined) {
		nextProfile.loader = normalizeModLoader(patch.selectedModLoader);
	}
	if (typeof patch.profileName === 'string' && patch.profileName.trim()) {
		nextProfile.name = patch.profileName.trim();
	}
	if (typeof patch.loaderVersion === 'string') {
		nextProfile.loaderVersion = patch.loaderVersion;
	}
	if (typeof patch.profileIcon === 'string') {
		nextProfile.icon = patch.profileIcon;
	}
	if (typeof patch.profileColor === 'string') {
		nextProfile.color = patch.profileColor;
	}
	if (typeof patch.profileExtraJvmArgs === 'string') {
		nextProfile.profileExtraJvmArgs = patch.profileExtraJvmArgs;
	}
	if (typeof patch.modsDirectory === 'string') {
		nextProfile.modsDirectory = patch.modsDirectory;
	}
	if (patch.lastPlayedAtEpochSec !== undefined) {
		nextProfile.lastPlayedAtEpochSec = patch.lastPlayedAtEpochSec;
	}
	if (patch.lastPlayedVersionId !== undefined) {
		nextProfile.lastPlayedVersionId = patch.lastPlayedVersionId;
	}

	saveGlobalSettings(userData, nextGlobal);
	saveProfile(userData, nextProfile);
	return loadSettings(userData);
}

/** Restore global UX + launcher flags and reset the active profile’s launch-related fields (keeps profile id, name, game dir, MC version). */
export function resetSettingsToDefaults(userData: string): LauncherSettings {
	ensureInitialized(userData);
	const global = loadGlobalSettings(userData);
	const active = getActiveProfile(userData) ?? ensureDefaultProfile(userData);
	const nextGlobal = { ...DEFAULT_GLOBAL_SETTINGS, activeProfileId: global.activeProfileId };
	const nextProfile: LauncherProfile = {
		...active,
		ramMb: 4096,
		javaPath: 'java',
		resolutionWidth: 1280,
		resolutionHeight: 720,
		fullscreen: false,
		loader: 'fabric',
		loaderVersion: '',
		modsDirectory: '',
		profileExtraJvmArgs: '',
		icon: '🎮',
		color: '#7C5CFF',
	};
	saveGlobalSettings(userData, nextGlobal);
	saveProfile(userData, nextProfile);
	return loadSettings(userData);
}

/** @deprecated Flat save — profiles migration replaced this. */
export function saveSettings(userData: string, settings: LauncherSettings): void {
	ensureInitialized(userData);
	const global = loadGlobalSettings(userData);
	const active = getActiveProfile(userData) ?? ensureDefaultProfile(userData);
	const nextGlobal = {
		...global,
		closeLauncherAfterGameStart: settings.closeLauncherAfterGameStart,
		extraJvmArgs: settings.extraJvmArgs,
		activeProfileId: active.id,
		language: settings.language,
		startOnBoot: settings.startOnBoot,
		minimizeToTray: settings.minimizeToTray,
		checkForUpdates: settings.checkForUpdates,
		discordRichPresence: settings.discordRichPresence,
		theme: settings.theme,
		accent: settings.accent,
		animationsEnabled: settings.animationsEnabled,
		reduceMotion: settings.reduceMotion,
		accentIntensity: settings.accentIntensity,
		desktopNotifications: settings.desktopNotifications,
		updatePrompts: settings.updatePrompts,
		newsHighlights: settings.newsHighlights,
		parallelDownloads: settings.parallelDownloads,
		debugMode: settings.debugMode,
	};
	const nextProfile: LauncherProfile = {
		...active,
		name: settings.profileName || active.name,
		minecraftVersion: settings.selectedVersionId ?? active.minecraftVersion,
		loader: normalizeModLoader(settings.selectedModLoader),
		loaderVersion: settings.loaderVersion,
		ramMb: settings.ramMb,
		javaPath: settings.javaPath,
		gameDirectory: settings.gameDirectory || active.gameDirectory,
		modsDirectory: settings.modsDirectory,
		resolutionWidth: settings.resolutionWidth,
		resolutionHeight: settings.resolutionHeight,
		fullscreen: settings.fullscreen,
		icon: settings.profileIcon,
		color: settings.profileColor,
		profileExtraJvmArgs: settings.profileExtraJvmArgs,
		lastPlayedAtEpochSec: settings.lastPlayedAtEpochSec ?? active.lastPlayedAtEpochSec,
		lastPlayedVersionId: settings.lastPlayedVersionId ?? active.lastPlayedVersionId,
	};
	saveGlobalSettings(userData, nextGlobal);
	saveProfile(userData, nextProfile);
}
