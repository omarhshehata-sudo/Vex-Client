import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { validateJavaPath } from '../java/javaDetect';
import type { LauncherAuthState, LauncherSettings } from '../types';

export type LaunchCheckResult =
	| { ok: true }
	| { ok: false; title: string; detail: string };

export function checkDownloadPrerequisites(settings: LauncherSettings): LaunchCheckResult {
	if (!settings.selectedVersionId) {
		return { ok: false, title: 'No version selected', detail: 'Pick a Minecraft version from the list.' };
	}
	if (!settings.gameDirectory || settings.gameDirectory.trim().length === 0) {
		return { ok: false, title: 'Game directory missing', detail: 'Choose a game directory in Settings.' };
	}
	if (!existsSync(settings.gameDirectory)) {
		return { ok: false, title: 'Game directory not found', detail: `Folder does not exist:\n${settings.gameDirectory}` };
	}
	return { ok: true };
}

export function checkLaunchPrerequisites(settings: LauncherSettings, auth: LauncherAuthState | null): LaunchCheckResult {
	if (!auth) {
		return { ok: false, title: 'Not signed in', detail: 'Sign in with Microsoft before playing.' };
	}
	if (!auth.xuid || auth.xuid.trim().length === 0) {
		return { ok: false, title: 'Minecraft auth incomplete', detail: 'Please sign out and sign in again (or wait for token refresh).' };
	}
	if (!settings.selectedVersionId) {
		return { ok: false, title: 'No version selected', detail: 'Pick a Minecraft version from the list.' };
	}
	if (!settings.javaPath || settings.javaPath.trim().length === 0) {
		return { ok: false, title: 'Java not configured', detail: 'Set a Java path in Settings (try `java` or a full path to java.exe).' };
	}
	if (settings.ramMb < 512 || settings.ramMb > 64 * 1024) {
		return { ok: false, title: 'Invalid RAM', detail: 'Allocate between 512 MB and 65536 MB.' };
	}
	if (!settings.gameDirectory || settings.gameDirectory.trim().length === 0) {
		return { ok: false, title: 'Game directory missing', detail: 'Choose a game directory in Settings.' };
	}
	if (!existsSync(settings.gameDirectory)) {
		return { ok: false, title: 'Game directory not found', detail: `Folder does not exist:\n${settings.gameDirectory}` };
	}
	return { ok: true };
}

export function validateJava(javaPath: string): LaunchCheckResult {
	const r = validateJavaPath(String(javaPath ?? '').trim());
	if (!r.ok) {
		return { ok: false, title: 'Java not runnable', detail: r.message };
	}
	const major = r.candidate.major;
	if (major !== undefined && major < 21) {
		return {
			ok: false,
			title: 'Java 21 or newer required',
			detail: `Detected Java ${major}. Minecraft needs Java 21+. Set a newer JDK path in Settings.`,
		};
	}
	return { ok: true };
}

/**
 * Verifies the vanilla-style version metadata exists under the game directory:
 * `<gameDir>/versions/<id>/<id>.json`
 *
 * Future: if missing, the launcher will download the version manifest + libraries.
 */
export function checkVersionInstalled(settings: LauncherSettings): LaunchCheckResult {
	const id = settings.selectedVersionId;
	if (!id) {
		return { ok: false, title: 'No version selected', detail: 'Pick a Minecraft version before launching.' };
	}
	const jsonPath = join(settings.gameDirectory, 'versions', id, `${id}.json`);
	if (!existsSync(jsonPath)) {
		return {
			ok: false,
			title: 'Minecraft version not installed',
			detail: [
				`Expected version metadata at:`,
				jsonPath,
				'',
				'Install or download this version into the game directory first. The next launcher milestone will automate that step.',
			].join('\n'),
		};
	}
	return { ok: true };
}

export function describePendingLaunch(settings: LauncherSettings): string {
	const extra = [String(settings.profileExtraJvmArgs ?? '').trim(), String(settings.extraJvmArgs ?? '').trim()]
		.filter(Boolean)
		.join(' ');
	const lines = [
		`Launch: ${settings.profileName} — Minecraft ${settings.selectedVersionId ?? '(none)'} (${settings.selectedModLoader})`,
		`- Java: ${settings.javaPath}`,
		`- Heap cap: ${settings.ramMb} MB`,
		`- Game directory: ${settings.gameDirectory}`,
		`- Window: ${settings.resolutionWidth}x${settings.resolutionHeight}${settings.fullscreen ? ' (fullscreen)' : ''}`,
		`- Close launcher after start: ${settings.closeLauncherAfterGameStart ? 'yes' : 'no'}`,
	];
	if (extra) {
		const one = extra.split(/\r?\n/).join(' ');
		lines.push(`- Extra JVM: ${one.length > 200 ? `${one.slice(0, 200)}…` : one}`);
	}
	lines.push('', 'Files are synced on the previous step; the game will start as a separate process.');
	return lines.join('\n');
}
