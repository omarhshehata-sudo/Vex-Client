import type { LauncherGlobalSettings } from './profiles/profilesStore';
import type { LauncherProfile } from './profiles/profileTypes';
import type { ModLoader } from './mods/modsTypes';

export type { ModLoader };
export type { LauncherGlobalSettings } from './profiles/profilesStore';
export type { LauncherProfile } from './profiles/profileTypes';

export type AuthErrorCode =
	| 'MISSING_CLIENT_ID'
	| 'PORT_IN_USE'
	| 'LOGIN_TIMEOUT'
	| 'MICROSOFT_DENIED'
	| 'MICROSOFT_TOKEN'
	| 'XBOX_AUTH'
	| 'NOT_OWNED'
	| 'TOKEN_EXPIRED'
	| 'UNKNOWN';

export type LauncherAuthState = {
	username: string;
	uuid: string;
	/** Xbox user id used by Minecraft auth args (`auth_xuid`). */
	xuid: string;
	mcAccessToken: string;
	mcExpiresAtEpochSec: number;
	msRefreshToken: string;
};

/**
 * Merged view: active profile fields + global launcher settings.
 * Persisted separately (see `vex-launcher-profiles.json` + `vex-launcher-settings.json`).
 */
export type LauncherSettings = {
	ramMb: number;
	javaPath: string;
	gameDirectory: string;
	resolutionWidth: number;
	resolutionHeight: number;
	fullscreen: boolean;
	selectedVersionId: string | null;
	/** When true, exit the launcher after a successful (simulated or real) game start. */
	closeLauncherAfterGameStart: boolean;
	/** Global extra JVM flags (after profile `profileExtraJvmArgs`). */
	extraJvmArgs: string;
	lastPlayedVersionId: string | null;
	lastPlayedAtEpochSec: number | null;
	/** Includes `vanilla`. */
	selectedModLoader: ModLoader;
	/** Active launcher profile UUID (mods + disk layout). */
	selectedProfileId: string | null;
	/** Same as `selectedProfileId` when a profile is active. */
	launcherProfileId: string;
	profileName: string;
	loaderVersion: string;
	profileIcon: string;
	profileColor: string;
	profileExtraJvmArgs: string;
	/** Absolute override, or empty for default `<userData>/profiles/<id>/mods`. */
	modsDirectory: string;
	/** From global settings — persisted in `vex-launcher-settings.json`. */
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

export const DEFAULT_SETTINGS: LauncherSettings = {
	ramMb: 4096,
	javaPath: 'java',
	gameDirectory: '',
	resolutionWidth: 1280,
	resolutionHeight: 720,
	fullscreen: false,
	selectedVersionId: '1.21.4',
	closeLauncherAfterGameStart: false,
	extraJvmArgs: '',
	lastPlayedVersionId: null,
	lastPlayedAtEpochSec: null,
	selectedModLoader: 'fabric',
	selectedProfileId: null,
	launcherProfileId: '',
	profileName: 'Default',
	loaderVersion: '',
	profileIcon: '🎮',
	profileColor: '#7C5CFF',
	profileExtraJvmArgs: '',
	modsDirectory: '',
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

export function mergeProfileIntoSettings(profile: LauncherProfile, global: LauncherGlobalSettings): LauncherSettings {
	return {
		...DEFAULT_SETTINGS,
		ramMb: profile.ramMb,
		javaPath: profile.javaPath,
		gameDirectory: profile.gameDirectory,
		resolutionWidth: profile.resolutionWidth,
		resolutionHeight: profile.resolutionHeight,
		fullscreen: profile.fullscreen,
		selectedVersionId: profile.minecraftVersion,
		closeLauncherAfterGameStart: global.closeLauncherAfterGameStart,
		extraJvmArgs: global.extraJvmArgs,
		lastPlayedVersionId: profile.lastPlayedVersionId ?? null,
		lastPlayedAtEpochSec: profile.lastPlayedAtEpochSec,
		selectedModLoader: profile.loader,
		selectedProfileId: profile.id,
		launcherProfileId: profile.id,
		profileName: profile.name,
		loaderVersion: profile.loaderVersion,
		profileIcon: profile.icon,
		profileColor: profile.color,
		profileExtraJvmArgs: profile.profileExtraJvmArgs,
		modsDirectory: profile.modsDirectory,
		language: global.language,
		startOnBoot: global.startOnBoot,
		minimizeToTray: global.minimizeToTray,
		checkForUpdates: global.checkForUpdates,
		discordRichPresence: global.discordRichPresence,
		theme: global.theme,
		accent: global.accent,
		animationsEnabled: global.animationsEnabled,
		reduceMotion: global.reduceMotion,
		accentIntensity: global.accentIntensity,
		desktopNotifications: global.desktopNotifications,
		updatePrompts: global.updatePrompts,
		newsHighlights: global.newsHighlights,
		parallelDownloads: global.parallelDownloads,
		debugMode: global.debugMode,
	};
}
