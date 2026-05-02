import { BrowserWindow, app, ipcMain, session, shell } from 'electron';
import { DEFAULT_SETTINGS, type LauncherAuthState, type LauncherSettings } from '../types';
import { clearAuthState, loadAuthState, saveAuthState } from '../auth/authPersistence';
import { AuthError, refreshMinecraftSession, signInInteractive } from '../auth/microsoftAuth';
import {
	checkDownloadPrerequisites,
	checkLaunchPrerequisites,
	describePendingLaunch,
	validateJava,
} from '../launcher/launchPipeline';
import { LauncherService } from '../launcher/LauncherService';
import { launchMinecraft } from '../launcher/launchMinecraft';
import { listMinecraftVersions } from '../minecraft/versionManifest';
import { VersionService } from '../minecraft/services/versionService';
import { deleteInstalledVersion, listInstalledVersionIds } from '../minecraft/versionFolderUtils';
import { detectJavaCandidates, validateJavaPath } from '../java/javaDetect';
import { loadSettings, patchSettings, resetSettingsToDefaults } from '../settings/settingsStore';
import { existsSync } from 'node:fs';

import { registerModsIpc } from './modsIpc';
import { registerProfilesIpc } from './profilesIpc';

type Fail = { ok: false; title: string; detail: string };
type Ok = { ok: true };

function fail(title: string, detail: string): Fail {
	return { ok: false, title, detail };
}

export function registerIpc(getUserData: () => string): void {
	registerModsIpc(getUserData);
	registerProfilesIpc(getUserData);

	ipcMain.handle('open-external', async (_e, url: string) => {
		const trimmed = String(url ?? '').trim();
		if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
			return { ok: false as const, error: 'invalid_url' as const };
		}
		await shell.openExternal(trimmed);
		return { ok: true as const };
	});

	ipcMain.handle('auth:getProfile', async () => {
		const ud = getUserData();
		let state = loadAuthState(ud);
		if (!state) {
			return { signedIn: false as const };
		}
		const now = Math.floor(Date.now() / 1000);
		if (state.mcExpiresAtEpochSec <= now + 120) {
			try {
				state = await refreshMinecraftSession(state);
				saveAuthState(ud, state);
			} catch {
				clearAuthState(ud);
				return { signedIn: false as const, stale: true as const };
			}
		}
		return {
			signedIn: true as const,
			username: state.username,
			uuid: state.uuid,
			expiresAtEpochSec: state.mcExpiresAtEpochSec,
		};
	});

	ipcMain.handle('auth:signIn', async () => {
		const ud = getUserData();
		try {
			const state: LauncherAuthState = await signInInteractive();
			saveAuthState(ud, state);
			return {
				ok: true as const,
				profile: {
					username: state.username,
					uuid: state.uuid,
					expiresAtEpochSec: state.mcExpiresAtEpochSec,
				},
			};
		} catch (e) {
			if (e instanceof AuthError) {
				return { ok: false as const, code: e.code, message: e.message };
			}
			return { ok: false as const, code: 'UNKNOWN' as const, message: e instanceof Error ? e.message : String(e) };
		}
	});

	ipcMain.handle('auth:signOut', async () => {
		clearAuthState(getUserData());
		return { ok: true as const };
	});

	ipcMain.handle('settings:get', async () => loadSettings(getUserData()));

	ipcMain.handle('settings:set', async (_e, patch: Partial<LauncherSettings>) => {
		const ud = getUserData();
		const next = patchSettings(ud, patch);
		if (typeof patch.startOnBoot === 'boolean') {
			try {
				app.setLoginItemSettings({ openAtLogin: patch.startOnBoot });
			} catch {
				/* ignore */
			}
		}
		return next;
	});

	ipcMain.handle('settings:resetDefaults', async () => {
		const ud = getUserData();
		const next = resetSettingsToDefaults(ud);
		try {
			app.setLoginItemSettings({ openAtLogin: Boolean(next.startOnBoot) });
		} catch {
			/* ignore */
		}
		return next;
	});

	ipcMain.handle('launcher:clearCache', async () => {
		try {
			await session.defaultSession.clearCache();
			return { ok: true as const };
		} catch (e) {
			return { ok: false as const, message: e instanceof Error ? e.message : String(e) };
		}
	});

	ipcMain.handle('versions:list', async () => {
		try {
			const versions = await listMinecraftVersions();
			return { ok: true as const, versions };
		} catch (e) {
			return {
				ok: false as const,
				message: e instanceof Error ? e.message : String(e),
			};
		}
	});

	ipcMain.handle('versions:listInstalled', async (): Promise<{ ok: true; ids: string[] } | Fail> => {
		try {
			const s = loadSettings(getUserData());
			if (!s.gameDirectory) return fail('Game directory missing', 'Set a game directory in Settings.');
			return { ok: true as const, ids: listInstalledVersionIds(s.gameDirectory) };
		} catch (e) {
			return fail('Could not list installed versions', e instanceof Error ? e.message : String(e));
		}
	});

	ipcMain.handle('versions:install', async (event, versionId: string): Promise<Ok | Fail> => {
		const ud = getUserData();
		const settings = loadSettings(ud);
		const pre = checkDownloadPrerequisites(settings);
		if (!pre.ok) return pre;
		const id = String(versionId ?? '').trim();
		if (!id) return fail('Invalid version', 'Pick a version id from the manifest.');

		const emitConsole = (line: string) => event.sender.send('launch:console', line);
		const emitStatus = (s: { phase: string; percent?: number; detail?: string }) =>
			event.sender.send('launch:status', { ...s, at: Date.now() });
		try {
			emitStatus({ phase: 'Installing…', percent: 0, detail: id });
			await LauncherService.ensureMinecraftFiles(settings, emitConsole, emitStatus, { versionId: id });
			emitStatus({ phase: 'Installing…', percent: 1, detail: 'done' });
			return { ok: true };
		} catch (e) {
			emitConsole(`ERROR: ${e instanceof Error ? e.message : String(e)}`);
			return fail('Install failed', e instanceof Error ? e.message : String(e));
		}
	});

	ipcMain.handle('versions:delete', async (_e, versionId: string): Promise<Ok | Fail> => {
		const ud = getUserData();
		const settings = loadSettings(ud);
		const id = String(versionId ?? '').trim();
		if (!id) return fail('Invalid version', 'Pick a version to remove.');
		try {
			deleteInstalledVersion(settings.gameDirectory, id);
			const patch: Partial<LauncherSettings> = {};
			if (settings.selectedVersionId === id) {
				patch.selectedVersionId = DEFAULT_SETTINGS.selectedVersionId;
			}
			if (settings.lastPlayedVersionId === id) {
				patch.lastPlayedVersionId = null;
				patch.lastPlayedAtEpochSec = null;
			}
			if (Object.keys(patch).length) patchSettings(ud, patch);
			return { ok: true };
		} catch (e) {
			return fail('Delete failed', e instanceof Error ? e.message : String(e));
		}
	});

	ipcMain.handle('java:detect', async () => {
		return { ok: true as const, candidates: detectJavaCandidates() };
	});

	ipcMain.handle('java:validate', async (_e, javaPath: string) => {
		return validateJavaPath(javaPath);
	});

	ipcMain.handle('updates:check', async () => {
		return {
			ok: true as const,
			available: false as const,
			message: 'Update channel is not configured yet. This will compare against a Vex release manifest.',
		};
	});

	ipcMain.handle('launch:checkAccount', async (): Promise<Ok | Fail> => {
		const auth = loadAuthState(getUserData());
		if (!auth) {
			return fail('Not signed in', 'Sign in with Microsoft before playing.');
		}
		return { ok: true };
	});

	ipcMain.handle('launch:checkJava', async (): Promise<Ok | Fail> => {
		const settings = loadSettings(getUserData());
		return validateJava(settings.javaPath);
	});

	ipcMain.handle('launch:checkMinecraftFiles', async (event): Promise<Ok | Fail> => {
		const ud = getUserData();
		const settings = loadSettings(ud);
		const pre = checkDownloadPrerequisites(settings);
		if (!pre.ok) return pre;

		const emitConsole = (line: string) => event.sender.send('launch:console', line);
		const emitStatus = (s: { phase: string; percent?: number; detail?: string }) =>
			event.sender.send('launch:status', { ...s, at: Date.now() });
		try {
			emitStatus({ phase: 'Checking files…', percent: 0, detail: settings.selectedVersionId ?? '' });
			await LauncherService.ensureMinecraftFiles(settings, emitConsole, emitStatus);
			return { ok: true };
		} catch (e) {
			emitConsole(`ERROR: ${e instanceof Error ? e.message : String(e)}`);
			return fail('Minecraft files download failed', e instanceof Error ? e.message : String(e));
		}
	});

	ipcMain.handle('launch:prepare', async (): Promise<{ ok: true; summary: string } | Fail> => {
		const settings = loadSettings(getUserData());
		const pre = checkLaunchPrerequisites(settings, loadAuthState(getUserData()));
		if (!pre.ok) return pre;
		const java = validateJava(settings.javaPath);
		if (!java.ok) return java;

		if (!settings.selectedVersionId) {
			return { ok: false, title: 'No version selected', detail: 'Pick a Minecraft version from the list.' };
		}
		const versionJsonPath = VersionService.versionJsonPath(settings.gameDirectory, settings.selectedVersionId);
		if (!existsSync(versionJsonPath)) {
			return {
				ok: false,
				title: 'Minecraft version metadata missing',
				detail: `Expected version JSON at:\n${versionJsonPath}\n\nRun the file download step first.`,
			};
		}
		return { ok: true, summary: describePendingLaunch(settings) };
	});

	ipcMain.handle('launch:launchMinecraft', async (event): Promise<
		| { ok: true; mode: 'started'; message: string }
		| { ok: false; title: string; detail: string }
	> => {
		const emitConsole = (line: string) => event.sender.send('launch:console', line);
		const emitStatus = (s: { phase: string; percent?: number; detail?: string }) =>
			event.sender.send('launch:status', { ...s, at: Date.now() });
		const ud = getUserData();
		const settings = loadSettings(ud);
		const auth = loadAuthState(ud);
		if (!auth) {
			return fail('Not signed in', 'Sign in with Microsoft before playing.');
		}
		const pre = checkLaunchPrerequisites(settings, auth);
		if (!pre.ok) return pre;
		const java = validateJava(settings.javaPath);
		if (!java.ok) return java;

		emitStatus({ phase: 'Launching…', percent: 0, detail: 'building command' });
		const result = await launchMinecraft(settings, auth, emitConsole, emitStatus, { userDataRoot: ud });
		if (!result.ok) {
			return result;
		}

		if (settings.selectedVersionId) {
			patchSettings(ud, {
				lastPlayedVersionId: settings.selectedVersionId,
				lastPlayedAtEpochSec: Math.floor(Date.now() / 1000),
			});
		}

		if (settings.closeLauncherAfterGameStart) {
			/* Allow the IPC response to reach the renderer before tearing down */
			setTimeout(() => {
				BrowserWindow.fromWebContents(event.sender)?.destroy();
				app.quit();
			}, 250);
		}

		return result;
	});

	ipcMain.handle('launch:devTestLaunch', async (event): Promise<{ ok: true; message: string } | Fail> => {
		const ud = getUserData();
		const settings = loadSettings(ud);
		const java = validateJava(settings.javaPath);
		if (!java.ok) return java;

		const emitConsole = (line: string) => event.sender.send('launch:console', line);
		const emitStatus = (s: { phase: string; percent?: number; detail?: string }) =>
			event.sender.send('launch:status', { ...s, at: Date.now() });
		try {
			emitStatus({ phase: 'Launching…', percent: 0, detail: 'Dev Test Launch (offline demo)' });
			await LauncherService.devTestLaunch(settings, emitConsole, { userDataRoot: getUserData() });
			return { ok: true, message: 'Dev Test Launch started (demo + fake session). See console.' };
		} catch (e) {
			emitConsole(`ERROR: ${e instanceof Error ? e.message : String(e)}`);
			return fail('Dev Test Launch failed', e instanceof Error ? e.message : String(e));
		}
	});

	/* Legacy helpers — kept for debugging / UI that still calls them */
	ipcMain.handle('launch:validate', async (): Promise<{ ok: true } | Fail> => {
		const ud = getUserData();
		const settings = loadSettings(ud);
		const auth = loadAuthState(ud);
		const pre = checkLaunchPrerequisites(settings, auth);
		if (!pre.ok) return pre;
		const java = validateJava(settings.javaPath);
		if (!java.ok) return java;
		if (!settings.selectedVersionId) {
			return fail('No version selected', 'Pick a Minecraft version from the list.');
		}
		const versionJsonPath = VersionService.versionJsonPath(settings.gameDirectory, settings.selectedVersionId);
		if (!existsSync(versionJsonPath)) {
			return fail(
				'Minecraft version metadata missing',
				`Expected version JSON at:\n${versionJsonPath}\n\nRun the file check step first.`,
			);
		}
		return { ok: true };
	});

	ipcMain.handle('launch:describe', async () => {
		const settings = loadSettings(getUserData());
		return { ok: true as const, text: describePendingLaunch(settings) };
	});
}
