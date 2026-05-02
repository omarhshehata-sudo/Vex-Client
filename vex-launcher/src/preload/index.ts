import { contextBridge, ipcRenderer } from 'electron';

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

export type ModLoader = 'vanilla' | 'fabric' | 'forge' | 'quilt' | 'neoforge';

export type ModsGetStateResponse = {
	state: { version: 2; installedMods: unknown[] };
	settings: Record<string, unknown>;
	profileId: string | null;
	modCount: number;
};

export type ModsSearchResponse =
	| { ok: true; result: unknown }
	| { ok: false; title: string; detail: string };

contextBridge.exposeInMainWorld('vexLauncher', {
	platform: process.platform,

	openExternal: (url: string) => ipcRenderer.invoke('open-external', url) as Promise<{ ok: boolean; error?: string }>,

	authGetProfile: () => ipcRenderer.invoke('auth:getProfile') as Promise<AuthProfileResponse>,
	authSignIn: () => ipcRenderer.invoke('auth:signIn') as Promise<AuthSignInResponse>,
	authSignOut: () => ipcRenderer.invoke('auth:signOut') as Promise<{ ok: boolean }>,

	settingsGet: () => ipcRenderer.invoke('settings:get') as Promise<Record<string, unknown>>,
	settingsSet: (patch: Record<string, unknown>) => ipcRenderer.invoke('settings:set', patch) as Promise<Record<string, unknown>>,
	settingsResetDefaults: () => ipcRenderer.invoke('settings:resetDefaults') as Promise<Record<string, unknown>>,
	launcherClearCache: () =>
		ipcRenderer.invoke('launcher:clearCache') as Promise<{ ok: true } | { ok: false; message: string }>,

	versionsList: () => ipcRenderer.invoke('versions:list') as Promise<VersionsListResponse>,
	versionsListInstalled: () =>
		ipcRenderer.invoke('versions:listInstalled') as Promise<{ ok: true; ids: string[] } | { ok: false; title: string; detail: string }>,
	versionsInstall: (versionId: string) => ipcRenderer.invoke('versions:install', versionId) as Promise<LaunchGateResponse>,
	versionsDelete: (versionId: string) => ipcRenderer.invoke('versions:delete', versionId) as Promise<LaunchGateResponse>,
	javaDetect: () => ipcRenderer.invoke('java:detect') as Promise<JavaDetectResponse>,
	javaValidate: (javaPath: string) => ipcRenderer.invoke('java:validate', javaPath) as Promise<JavaValidateResponse>,

	updatesCheck: () =>
		ipcRenderer.invoke('updates:check') as Promise<{
			ok: boolean;
			available?: boolean;
			message?: string;
		}>,

	launchCheckAccount: () => ipcRenderer.invoke('launch:checkAccount') as Promise<LaunchGateResponse>,
	launchCheckJava: () => ipcRenderer.invoke('launch:checkJava') as Promise<LaunchGateResponse>,
	launchCheckMinecraftFiles: () => ipcRenderer.invoke('launch:checkMinecraftFiles') as Promise<LaunchGateResponse>,
	launchPrepare: () => ipcRenderer.invoke('launch:prepare') as Promise<LaunchPrepareResponse>,
	launchLaunchMinecraft: () => ipcRenderer.invoke('launch:launchMinecraft') as Promise<LaunchMinecraftInvokeResponse>,
	launchDevTestLaunch: () => ipcRenderer.invoke('launch:devTestLaunch') as Promise<DevTestLaunchResponse>,

	launchValidate: () => ipcRenderer.invoke('launch:validate') as Promise<LaunchGateResponse>,
	launchDescribe: () => ipcRenderer.invoke('launch:describe') as Promise<{ ok: boolean; text?: string }>,

	/** Subscribe to stdout/stderr and status lines from the current launch. */
	launchConsoleOn: (handler: (line: LaunchConsoleLine) => void): void => {
		ipcRenderer.removeAllListeners('launch:console');
		ipcRenderer.on('launch:console', (_e, line: LaunchConsoleLine) => handler(String(line)));
	},

	launchConsoleOff: (): void => {
		ipcRenderer.removeAllListeners('launch:console');
	},

	launchStatusOn: (handler: (ev: LaunchStatusEvent) => void): void => {
		ipcRenderer.removeAllListeners('launch:status');
		ipcRenderer.on('launch:status', (_e, ev: LaunchStatusEvent) => handler(ev));
	},

	launchStatusOff: (): void => {
		ipcRenderer.removeAllListeners('launch:status');
	},

	modsGetState: () => ipcRenderer.invoke('mods:getState') as Promise<ModsGetStateResponse>,
	modsSearch: (opts: {
		query: string;
		limit?: number;
		offset?: number;
		gameVersion?: string;
		loader?: string;
		sort?: 'relevance' | 'downloads' | 'follows' | 'updated' | 'newest';
	}) => ipcRenderer.invoke('mods:search', opts) as Promise<ModsSearchResponse>,
	modsGetProject: (id: string) => ipcRenderer.invoke('mods:getProject', id) as Promise<{ ok: true; project: unknown } | ModsFail>,
	modsListProjectVersions: (projectId: string, gameVersion?: string, loader?: string) =>
		ipcRenderer.invoke('mods:listProjectVersions', projectId, gameVersion, loader) as Promise<
			{ ok: true; versions: unknown[] } | ModsFail
		>,
	modsGetVersion: (versionId: string) =>
		ipcRenderer.invoke('mods:getVersion', versionId) as Promise<{ ok: true; version: unknown } | ModsFail>,
	modsInstallVersion: (opts: { versionId: string; minecraftVersion: string; loader: ModLoader; installDeps: boolean }) =>
		ipcRenderer.invoke('mods:installVersion', opts) as Promise<
			{ ok: true; mod: unknown; installedDeps: string[] } | ModsFail
		>,
	modsResolveLatest: (opts: { projectId: string; minecraftVersion: string; loader: ModLoader }) =>
		ipcRenderer.invoke('mods:resolveLatest', opts) as Promise<{ ok: true; version: unknown } | ModsFail>,
	modsSetEnabled: (modId: string, enabled: boolean) =>
		ipcRenderer.invoke('mods:setEnabled', modId, enabled) as Promise<LaunchGateResponse>,
	modsDelete: (modId: string) => ipcRenderer.invoke('mods:delete', modId) as Promise<LaunchGateResponse>,
	modsOpenModsFolder: (profileId: string) =>
		ipcRenderer.invoke('mods:openModsFolder', profileId) as Promise<LaunchGateResponse>,
	modsPickImportJars: () => ipcRenderer.invoke('mods:pickImportJars') as Promise<{ ok: true; paths: string[] }>,
	modsImportPaths: (opts: { paths: string[]; minecraftVersion: string; loader: ModLoader }) =>
		ipcRenderer.invoke('mods:importPaths', opts) as Promise<{ ok: true; mods: unknown[] } | ModsFail>,
	modsSetProfileSelection: (patch: { selectedModLoader?: ModLoader; selectedProfileId?: string | null }) =>
		ipcRenderer.invoke('mods:setProfileSelection', patch) as Promise<{ ok: true }>,

	profilesList: () => ipcRenderer.invoke('profiles:list') as Promise<{ ok: true; profiles: unknown[] }>,
	profilesSetActive: (profileId: string) =>
		ipcRenderer.invoke('profiles:setActive', profileId) as Promise<{ ok: true } | { ok: false; title: string; detail: string }>,
	profilesCreate: (input: Record<string, unknown>) =>
		ipcRenderer.invoke('profiles:create', input) as Promise<{ ok: true; profile: unknown } | { ok: false; title: string; detail: string }>,
	profilesUpdate: (opts: { id: string; patch: Record<string, unknown> }) =>
		ipcRenderer.invoke('profiles:update', opts) as Promise<{ ok: true; profile: unknown } | { ok: false; title: string; detail: string }>,
	profilesDelete: (profileId: string) =>
		ipcRenderer.invoke('profiles:delete', profileId) as Promise<{ ok: true } | { ok: false; title: string; detail: string }>,
	profilesDuplicate: (profileId: string) =>
		ipcRenderer.invoke('profiles:duplicate', profileId) as Promise<{ ok: true; profile: unknown } | { ok: false; title: string; detail: string }>,
});
