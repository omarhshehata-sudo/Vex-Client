import type { VersionEntry } from './types';

function api() {
	const a = window.vexLauncher;
	if (!a) throw new Error('Launcher API unavailable.');
	return a;
}

export class VersionService {
	static async listVersions(): Promise<VersionEntry[]> {
		const r = await api().versionsList();
		if (!r.ok) {
			throw new Error(r.message);
		}
		// Main already filters to supported stable versions; keep the original order.
		return r.versions;
	}

	static async listInstalled(): Promise<string[]> {
		const r = await api().versionsListInstalled();
		if (!r.ok) return [];
		return r.ids;
	}

	static async install(versionId: string): Promise<{ ok: true } | { ok: false; title: string; detail: string }> {
		const r = await api().versionsInstall(versionId);
		if (r.ok) return { ok: true };
		return { ok: false, title: r.title, detail: r.detail };
	}

	static async delete(versionId: string): Promise<{ ok: true } | { ok: false; title: string; detail: string }> {
		const r = await api().versionsDelete(versionId);
		if (r.ok) return { ok: true };
		return { ok: false, title: r.title, detail: r.detail };
	}
}
