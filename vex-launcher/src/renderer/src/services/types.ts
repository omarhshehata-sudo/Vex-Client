export type ModLoader = 'vanilla' | 'fabric' | 'forge' | 'quilt' | 'neoforge';

export type ModSource = 'modrinth' | 'local';

export type InstalledModRecord = {
	id: string;
	source: ModSource;
	projectId?: string;
	versionId?: string;
	name: string;
	filename: string;
	filePath: string;
	minecraftVersion: string;
	loader: ModLoader;
	launcherProfileId?: string;
	enabled: boolean;
	installedAt: string;
	iconUrl?: string;
	author?: string;
	fileSizeBytes?: number;
};

export type ModsPersistedState = {
	version: 2;
	installedMods: InstalledModRecord[];
};

export type LauncherSettings = {
	ramMb: number;
	javaPath: string;
	gameDirectory: string;
	resolutionWidth: number;
	resolutionHeight: number;
	fullscreen: boolean;
	selectedVersionId: string | null;
	closeLauncherAfterGameStart: boolean;
	extraJvmArgs: string;
	lastPlayedVersionId: string | null;
	lastPlayedAtEpochSec: number | null;
	selectedModLoader: ModLoader;
	selectedProfileId: string | null;
	launcherProfileId: string;
	profileName: string;
	loaderVersion: string;
	profileIcon: string;
	profileColor: string;
	profileExtraJvmArgs: string;
	modsDirectory: string;
	/** Merged from global launcher JSON (same keys as main process `LauncherSettings`). */
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

export type LauncherProfile = {
	id: string;
	name: string;
	minecraftVersion: string;
	loader: ModLoader;
	loaderVersion: string;
	ramMb: number;
	javaPath: string;
	gameDirectory: string;
	modsDirectory: string;
	resolutionWidth: number;
	resolutionHeight: number;
	fullscreen: boolean;
	icon: string;
	color: string;
	profileExtraJvmArgs: string;
	lastPlayedVersionId: string | null;
	lastPlayedAtEpochSec: number | null;
	createdAtEpochSec: number;
};

export type AuthProfile = {
	signedIn: boolean;
	username?: string;
	uuid?: string;
	expiresAtEpochSec?: number;
	stale?: boolean;
};

export type VersionEntry = { id: string; type: string; label?: string; tags?: string[] };
