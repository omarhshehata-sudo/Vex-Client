import type { InstalledModRecord, ModLoader, ModsPersistedState, LauncherSettings } from './types';

function api() {
	const a = window.vexLauncher;
	if (!a) throw new Error('Launcher API unavailable.');
	return a;
}

export type ModrinthSearchSort = 'relevance' | 'downloads' | 'follows' | 'updated' | 'newest';

export class ModsService {
	static async getState(): Promise<{
		state: ModsPersistedState;
		settings: LauncherSettings;
		profileId: string | null;
		modCount: number;
	}> {
		return (await api().modsGetState()) as {
			state: ModsPersistedState;
			settings: LauncherSettings;
			profileId: string | null;
			modCount: number;
		};
	}

	static async search(opts: {
		query: string;
		limit?: number;
		offset?: number;
		gameVersion?: string;
		loader?: string;
		sort?: ModrinthSearchSort;
	}) {
		const r = await api().modsSearch(opts);
		if (!r.ok) throw new Error(r.detail);
		return r.result;
	}

	static async getProject(id: string) {
		const r = await api().modsGetProject(id);
		if (!r.ok) throw new Error(r.detail);
		return r.project;
	}

	static async listProjectVersions(projectId: string, gameVersion?: string, loader?: string) {
		const r = await api().modsListProjectVersions(projectId, gameVersion, loader);
		if (!r.ok) throw new Error(r.detail);
		return r.versions;
	}

	static async getVersion(versionId: string) {
		const r = await api().modsGetVersion(versionId);
		if (!r.ok) throw new Error(r.detail);
		return r.version;
	}

	static async installVersion(opts: {
		versionId: string;
		minecraftVersion: string;
		loader: ModLoader;
		installDeps: boolean;
	}): Promise<{ mod: InstalledModRecord; installedDeps: string[] }> {
		const r = await api().modsInstallVersion(opts);
		if (!r.ok) throw new Error(`${r.title}: ${r.detail}`);
		return { mod: r.mod as InstalledModRecord, installedDeps: r.installedDeps };
	}

	static async resolveLatest(projectId: string, minecraftVersion: string, loader: ModLoader) {
		const r = await api().modsResolveLatest({ projectId, minecraftVersion, loader });
		if (!r.ok) throw new Error(`${r.title}: ${r.detail}`);
		return r.version;
	}

	static async setEnabled(modId: string, enabled: boolean) {
		const r = await api().modsSetEnabled(modId, enabled);
		if (!r.ok) throw new Error(`${r.title}: ${r.detail}`);
	}

	static async deleteMod(modId: string) {
		const r = await api().modsDelete(modId);
		if (!r.ok) throw new Error(`${r.title}: ${r.detail}`);
	}

	static async openModsFolder(profileId: string) {
		const r = await api().modsOpenModsFolder(profileId);
		if (!r.ok) throw new Error(`${r.title}: ${r.detail}`);
	}

	static async pickImportJars(): Promise<string[]> {
		const r = (await api().modsPickImportJars()) as { ok?: boolean; paths?: string[] };
		return r.paths ?? [];
	}

	static async importPaths(paths: string[], minecraftVersion: string, loader: ModLoader): Promise<InstalledModRecord[]> {
		const r = await api().modsImportPaths({ paths, minecraftVersion, loader });
		if (!r.ok) throw new Error(`${r.title}: ${r.detail}`);
		return (r as { mods: InstalledModRecord[] }).mods;
	}

	static async setProfileSelection(patch: { selectedModLoader?: ModLoader; selectedProfileId?: string | null }) {
		await api().modsSetProfileSelection(patch);
	}
}
