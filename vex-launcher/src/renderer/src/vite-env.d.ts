/// <reference types="vite/client" />

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
	selectedModLoader: 'vanilla' | 'fabric' | 'forge' | 'quilt' | 'neoforge';
	selectedProfileId: string | null;
	launcherProfileId: string;
	profileName: string;
	loaderVersion: string;
	profileIcon: string;
	profileColor: string;
	profileExtraJvmArgs: string;
	modsDirectory: string;
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

export type AuthProfileResponse =
	| { signedIn: false; stale?: boolean }
	| { signedIn: true; username: string; uuid: string; expiresAtEpochSec: number };

export type AuthSignInResponse =
	| { ok: true; profile: { username: string; uuid: string; expiresAtEpochSec: number } }
	| { ok: false; code: string; message: string };

export type VersionsListResponse =
	| { ok: true; versions: Array<{ id: string; type: string; label?: string; tags?: string[] }> }
	| { ok: false; message: string };

export type JavaCandidate = { path: string; versionText?: string; major?: number };
export type JavaDetectResponse = { ok: true; candidates: JavaCandidate[] };
export type JavaValidateResponse = { ok: true; candidate: JavaCandidate } | { ok: false; message: string };

export type LaunchGateResponse = { ok: true } | { ok: false; title: string; detail: string };

export type LaunchPrepareResponse = { ok: true; summary: string } | LaunchGateResponse;

export type LaunchMinecraftInvokeResponse =
	| { ok: true; mode: 'started'; message: string }
	| { ok: false; title: string; detail: string };

export type LaunchConsoleLine = string;
export type DevTestLaunchResponse = { ok: true; message: string } | { ok: false; title: string; detail: string };
export type LaunchStatusEvent = { phase: string; percent?: number; detail?: string; at: number };

export type VexLauncherApi = {
	platform: NodeJS.Platform;
	openExternal: (url: string) => Promise<{ ok: boolean; error?: string }>;
	authGetProfile: () => Promise<AuthProfileResponse>;
	authSignIn: () => Promise<AuthSignInResponse>;
	authSignOut: () => Promise<{ ok: boolean }>;
	settingsGet: () => Promise<LauncherSettings>;
	settingsSet: (patch: Partial<LauncherSettings>) => Promise<LauncherSettings>;
	settingsResetDefaults: () => Promise<LauncherSettings>;
	launcherClearCache: () => Promise<{ ok: true } | { ok: false; message: string }>;
	versionsList: () => Promise<VersionsListResponse>;
	versionsListInstalled: () => Promise<{ ok: true; ids: string[] } | { ok: false; title: string; detail: string }>;
	versionsInstall: (versionId: string) => Promise<LaunchGateResponse>;
	versionsDelete: (versionId: string) => Promise<LaunchGateResponse>;
	javaDetect: () => Promise<JavaDetectResponse>;
	javaValidate: (javaPath: string) => Promise<JavaValidateResponse>;
	updatesCheck: () => Promise<{ ok: boolean; available?: boolean; message?: string }>;
	launchCheckAccount: () => Promise<LaunchGateResponse>;
	launchCheckJava: () => Promise<LaunchGateResponse>;
	launchCheckMinecraftFiles: () => Promise<LaunchGateResponse>;
	launchPrepare: () => Promise<LaunchPrepareResponse>;
	launchLaunchMinecraft: () => Promise<LaunchMinecraftInvokeResponse>;
	launchDevTestLaunch: () => Promise<DevTestLaunchResponse>;
	launchValidate: () => Promise<LaunchGateResponse>;
	launchDescribe: () => Promise<{ ok: boolean; text?: string }>;

	launchConsoleOn: (handler: (line: LaunchConsoleLine) => void) => void;
	launchConsoleOff: () => void;
	launchStatusOn: (handler: (ev: LaunchStatusEvent) => void) => void;
	launchStatusOff: () => void;

	modsGetState: () => Promise<{ state: unknown; settings: LauncherSettings; profileId: string | null; modCount: number }>;
	modsSearch: (opts: {
		query: string;
		limit?: number;
		offset?: number;
		gameVersion?: string;
		loader?: string;
		sort?: 'relevance' | 'downloads' | 'follows' | 'updated' | 'newest';
	}) => Promise<{ ok: true; result: unknown } | { ok: false; title: string; detail: string }>;
	modsGetProject: (id: string) => Promise<{ ok: true; project: unknown } | { ok: false; title: string; detail: string }>;
	modsListProjectVersions: (
		projectId: string,
		gameVersion?: string,
		loader?: string,
	) => Promise<{ ok: true; versions: unknown[] } | { ok: false; title: string; detail: string }>;
	modsGetVersion: (versionId: string) => Promise<{ ok: true; version: unknown } | { ok: false; title: string; detail: string }>;
	modsInstallVersion: (opts: {
		versionId: string;
		minecraftVersion: string;
		loader: LauncherSettings['selectedModLoader'];
		installDeps: boolean;
	}) => Promise<{ ok: true; mod: unknown; installedDeps: string[] } | { ok: false; title: string; detail: string }>;
	modsResolveLatest: (opts: {
		projectId: string;
		minecraftVersion: string;
		loader: LauncherSettings['selectedModLoader'];
	}) => Promise<{ ok: true; version: unknown } | { ok: false; title: string; detail: string }>;
	modsSetEnabled: (modId: string, enabled: boolean) => Promise<LaunchGateResponse>;
	modsDelete: (modId: string) => Promise<LaunchGateResponse>;
	modsOpenModsFolder: (profileId: string) => Promise<LaunchGateResponse>;
	modsPickImportJars: () => Promise<{ ok?: boolean; paths: string[] }>;
	modsImportPaths: (opts: {
		paths: string[];
		minecraftVersion: string;
		loader: LauncherSettings['selectedModLoader'];
	}) => Promise<{ ok: true; mods: unknown[] } | { ok: false; title: string; detail: string }>;
	modsSetProfileSelection: (patch: {
		selectedModLoader?: LauncherSettings['selectedModLoader'];
		selectedProfileId?: string | null;
	}) => Promise<{ ok: true }>;

	profilesList: () => Promise<{ ok: true; profiles: unknown[] }>;
	profilesSetActive: (profileId: string) => Promise<{ ok: true } | { ok: false; title: string; detail: string }>;
	profilesCreate: (input: Record<string, unknown>) => Promise<{ ok: true; profile: unknown } | { ok: false; title: string; detail: string }>;
	profilesUpdate: (opts: { id: string; patch: Record<string, unknown> }) => Promise<{ ok: true; profile: unknown } | { ok: false; title: string; detail: string }>;
	profilesDelete: (profileId: string) => Promise<{ ok: true } | { ok: false; title: string; detail: string }>;
	profilesDuplicate: (profileId: string) => Promise<{ ok: true; profile: unknown } | { ok: false; title: string; detail: string }>;
};

declare global {
	interface Window {
		vexLauncher?: VexLauncherApi;
	}
}
