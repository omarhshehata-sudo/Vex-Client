import type { LauncherAuthState, LauncherSettings } from '../types';
import { LauncherService, type LauncherExtras, type LauncherStatusFn } from './LauncherService';

export type LaunchMinecraftResult =
	| { ok: true; mode: 'started'; message: string }
	| { ok: false; title: string; detail: string };

export async function launchMinecraft(
	settings: LauncherSettings,
	auth: LauncherAuthState,
	log: (line: string) => void,
	status?: LauncherStatusFn,
	extras?: LauncherExtras,
): Promise<LaunchMinecraftResult> {
	try {
		log('Starting Minecraft launch…');
		await LauncherService.launchMinecraft(settings, auth, log, status, extras);
		return {
			ok: true,
			mode: 'started',
			message: 'Minecraft started as a separate process. You can close the launcher unless you disabled that in Settings.',
		};
	} catch (e) {
		log(`ERROR: Minecraft launch failed: ${e instanceof Error ? e.message : String(e)}`);
		return {
			ok: false,
			title: 'Minecraft launch failed',
			detail: e instanceof Error ? e.message : String(e),
		};
	}
}
