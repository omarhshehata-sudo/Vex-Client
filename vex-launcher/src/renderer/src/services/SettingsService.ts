import type { LauncherSettings } from './types';

function api() {
	const a = window.vexLauncher;
	if (!a) throw new Error('Launcher API unavailable (run inside Electron).');
	return a;
}

export class SettingsService {
	static async load(): Promise<LauncherSettings> {
		const r = await api().settingsGet();
		return r as LauncherSettings;
	}

	static async save(patch: Partial<LauncherSettings>): Promise<LauncherSettings> {
		const r = await api().settingsSet(patch);
		return r as LauncherSettings;
	}

	static async resetToDefaults(): Promise<LauncherSettings> {
		const r = await api().settingsResetDefaults();
		return r as LauncherSettings;
	}

	static async clearHttpCache(): Promise<{ ok: true } | { ok: false; message: string }> {
		return api().launcherClearCache();
	}
}
