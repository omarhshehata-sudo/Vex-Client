import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

import type { LauncherAuthState, LauncherSettings } from '../types';
import { buildGameArgs, buildJvmArgs, buildLaunchVariableMap, defaultLaunchFeatures, stableClientId } from '../minecraft/argumentResolver';
import { AssetService } from '../minecraft/services/assetService';
import { LibraryService } from '../minecraft/services/libraryService';
import { VersionService } from '../minecraft/services/versionService';
import { spawnJavaProcess } from '../minecraft/services/processService';
import { parseExtraJvmArgs } from './jvmExtraArgs';
import { applyModsForLaunch } from '../mods/modsLaunch';

export type LauncherExtras = { userDataRoot?: string };

function withFullscreenFlag(gameArgs: string[], fullscreen: boolean): string[] {
	if (!fullscreen) return gameArgs;
	const has = gameArgs.some((a) => a.toLowerCase() === '--fullscreen');
	if (has) return gameArgs;
	return [...gameArgs, '--fullscreen'];
}

export type LauncherLogFn = (message: string) => void;
export type LauncherStatusFn = (s: { phase: string; percent?: number; detail?: string }) => void;

export type EnsureMinecraftFilesOptions = { versionId?: string };

export class LauncherService {
	static async ensureMinecraftFiles(
		settings: LauncherSettings,
		log: LauncherLogFn,
		status?: LauncherStatusFn,
		opts?: EnsureMinecraftFilesOptions,
	): Promise<void> {
		const versionId = String(opts?.versionId ?? settings.selectedVersionId ?? '').trim();
		if (!versionId) throw new Error('No selected Minecraft version.');
		if (!settings.gameDirectory) throw new Error('Game directory is not configured.');

		status?.({ phase: 'Checking files…', percent: 0, detail: `version ${versionId}` });
		log(`[INFO] Checking version ${versionId}`);
		const versionJson = await VersionService.ensureVersionJson(settings.gameDirectory, versionId, (m) => log(`[INFO] ${m}`), status);

		const libsRoot = join(settings.gameDirectory, 'libraries');
		if (!existsSync(libsRoot)) {
			log('[INFO] Libraries folder missing — will download');
		}

		// Client jar + libraries (including natives jars).
		status?.({ phase: 'Checking files…', percent: 0, detail: 'client jar' });
		await LibraryService.ensureClientJar(settings.gameDirectory, versionId, versionJson, (m) => log(`[INFO] ${m}`), status);

		const features = defaultLaunchFeatures({ hasCustomResolution: true });
		await LibraryService.ensureLibraries(settings.gameDirectory, versionJson, (m) => log(`[INFO] ${m}`), features, status);

		// Natives: extract into versions/<id>/natives
		const nativesDir = LibraryService.nativesDir(settings.gameDirectory, versionId);
		const nativesLooksEmpty = !existsSync(nativesDir) || readdirSync(nativesDir).length === 0;
		if (nativesLooksEmpty) {
			await LibraryService.ensureAndExtractNatives(settings.gameDirectory, versionId, versionJson, (m) => log(`[INFO] ${m}`), features, status);
		} else {
			log('[INFO] Natives already extracted — skipping');
		}

		// Assets (index + objects).
		log(`[INFO] Ensuring assets for ${versionId}`);
		const assetIndex = await AssetService.ensureAssetIndex(settings.gameDirectory, versionJson, (m) => log(`[INFO] ${m}`), status);
		await AssetService.ensureAssets(settings.gameDirectory, assetIndex, (m) => log(`[INFO] ${m}`), status);
		status?.({ phase: 'Checking files…', percent: 1, detail: 'done' });
		log('[INFO] Minecraft files ready');
	}

	static async launchMinecraft(
		settings: LauncherSettings,
		auth: LauncherAuthState,
		log: LauncherLogFn,
		status?: LauncherStatusFn,
		extras?: LauncherExtras,
	): Promise<void> {
		const versionId = settings.selectedVersionId;
		if (!versionId) throw new Error('No selected Minecraft version.');

		// Be safe if the user bypassed the check step.
		await this.ensureMinecraftFiles(settings, log);

		const versionJson = VersionService.readVersionJson(settings.gameDirectory, versionId);

		const assetsDir = join(settings.gameDirectory, 'assets');
		const assetsIndexName = versionJson.assetIndex.id;

		const features = defaultLaunchFeatures({ hasCustomResolution: true });
		const clientId = stableClientId();
		const userType = 'msa';
		const versionType = versionJson.type ?? 'release';

		const classpath = LibraryService.buildClasspath(settings.gameDirectory, versionJson, versionId, features);
		const nativesDir = LibraryService.nativesDir(settings.gameDirectory, versionId);

		const vars = buildLaunchVariableMap({
			versionId,
			gameDir: settings.gameDirectory,
			assetsDir,
			assetsIndexName,
			classpath,
			nativesDir,
			username: auth.username,
			uuid: auth.uuid,
			accessToken: auth.mcAccessToken,
			userType,
			versionType,
			authXuid: auth.xuid,
			clientId,
			resolutionWidth: settings.resolutionWidth,
			resolutionHeight: settings.resolutionHeight,
		});

		const jvmArgs = buildJvmArgs(versionJson, vars, features);
		const gameArgs = withFullscreenFlag(buildGameArgs(versionJson, vars, features), settings.fullscreen);

		// Mojang’s version JSON doesn’t always contain launcher memory flags for every modern version,
		// so we inject JVM heap sizing based on the user’s RAM allocation settings.
		const initialHeapMb = Math.min(512, settings.ramMb);
		const memoryArgs = [`-Xmx${settings.ramMb}m`, `-Xms${initialHeapMb}m`];
		const profileJvm = parseExtraJvmArgs(settings.profileExtraJvmArgs ?? '');
		const globalJvm = parseExtraJvmArgs(settings.extraJvmArgs);
		const userJvm = [...profileJvm, ...globalJvm];
		const modsJvm = extras?.userDataRoot ? applyModsForLaunch(extras.userDataRoot, settings) : [];

		const args = [...memoryArgs, ...userJvm, ...modsJvm, ...jvmArgs, versionJson.mainClass, ...gameArgs];

		log(`[INFO] Preparing launch`);
		log(`[INFO] Launching Minecraft: java ${args.length} args`);
		log(`[INFO] Main class: ${versionJson.mainClass}`);
		status?.({ phase: 'Launching…', percent: 0.2, detail: 'starting Java process' });

		await spawnJavaProcess({
			javaPath: settings.javaPath,
			args,
			cwd: settings.gameDirectory,
			detached: true,
			onStdoutLine: (line) => log(line),
			onStderrLine: (line) => log(line),
			onExit: (code, signal) => {
				if (code !== null) {
					if (code === 0) log(`Minecraft process exited successfully (code 0).`);
					else log(`ERROR: Minecraft process exited with code ${code}.`);
				} else {
					log(`ERROR: Minecraft process exited (signal ${signal}).`);
				}
			},
		});
		status?.({ phase: 'Launching…', percent: 1, detail: 'process started' });
	}

	/**
	 * Dev-only launch mode while real Microsoft auth is pending.
	 *
	 * This uses a clearly fake session and enables Mojang’s `is_demo_user` feature flag, which
	 * injects `--demo` on modern versions. It is intended only to validate download + process spawn
	 * and must not be treated as real login.
	 */
	static async devTestLaunch(settings: LauncherSettings, log: LauncherLogFn, extras?: LauncherExtras): Promise<void> {
		log('[INFO] DEV TEST LAUNCH: using fake session (not real login).');
		const fakeAuth: LauncherAuthState = {
			username: 'VexDevTest',
			uuid: randomUUID(),
			xuid: '0',
			mcAccessToken: 'DEV_TEST_TOKEN',
			mcExpiresAtEpochSec: Math.floor(Date.now() / 1000) + 3600,
			msRefreshToken: 'DEV_TEST_REFRESH',
		};

		const versionId = settings.selectedVersionId;
		if (!versionId) throw new Error('No selected Minecraft version.');

		await this.ensureMinecraftFiles(settings, log);
		const versionJson = VersionService.readVersionJson(settings.gameDirectory, versionId);

		const assetsDir = join(settings.gameDirectory, 'assets');
		const assetsIndexName = versionJson.assetIndex.id;
		const clientId = stableClientId();

		const features = defaultLaunchFeatures({ hasCustomResolution: true, isDemoUser: true });

		const classpath = LibraryService.buildClasspath(settings.gameDirectory, versionJson, versionId, features);
		const nativesDir = LibraryService.nativesDir(settings.gameDirectory, versionId);

		const vars = buildLaunchVariableMap({
			versionId,
			gameDir: settings.gameDirectory,
			assetsDir,
			assetsIndexName,
			classpath,
			nativesDir,
			username: fakeAuth.username,
			uuid: fakeAuth.uuid,
			accessToken: fakeAuth.mcAccessToken,
			userType: 'legacy',
			versionType: versionJson.type ?? 'release',
			authXuid: fakeAuth.xuid,
			clientId,
			resolutionWidth: settings.resolutionWidth,
			resolutionHeight: settings.resolutionHeight,
		});

		const jvmArgs = buildJvmArgs(versionJson, vars, features);
		const gameArgs = withFullscreenFlag(buildGameArgs(versionJson, vars, features), settings.fullscreen);
		const initialHeapMb = Math.min(512, settings.ramMb);
		const memoryArgs = [`-Xmx${settings.ramMb}m`, `-Xms${initialHeapMb}m`];
		const profileJvm = parseExtraJvmArgs(settings.profileExtraJvmArgs ?? '');
		const globalJvm = parseExtraJvmArgs(settings.extraJvmArgs);
		const userJvm = [...profileJvm, ...globalJvm];
		const modsJvm = extras?.userDataRoot ? applyModsForLaunch(extras.userDataRoot, settings) : [];
		const args = [...memoryArgs, ...userJvm, ...modsJvm, ...jvmArgs, versionJson.mainClass, ...gameArgs];

		log('[INFO] DEV TEST LAUNCH: starting Java process (demo mode).');
		await spawnJavaProcess({
			javaPath: settings.javaPath,
			args,
			cwd: settings.gameDirectory,
			detached: true,
			onStdoutLine: (line) => log(line),
			onStderrLine: (line) => log(line),
			onExit: (code, signal) => {
				if (code !== null) {
					if (code === 0) log(`DEV TEST: Minecraft exited successfully (code 0).`);
					else log(`ERROR: DEV TEST: Minecraft exited with code ${code}.`);
				} else {
					log(`ERROR: DEV TEST: Minecraft exited (signal ${signal}).`);
				}
			},
		});
	}
}

