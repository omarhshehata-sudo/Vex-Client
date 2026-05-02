export type ModLoader = 'vanilla' | 'fabric' | 'forge' | 'quilt' | 'neoforge';

export type ModSource = 'modrinth' | 'local';

export type InstalledModRecord = {
	id: string;
	source: ModSource;
	projectId?: string;
	versionId?: string;
	name: string;
	filename: string;
	/** Absolute path on disk (under profiles root or game mods for forge — see modsPaths). */
	filePath: string;
	minecraftVersion: string;
	loader: ModLoader;
	/** Launcher profile UUID; legacy rows omit this until migration. */
	launcherProfileId?: string;
	enabled: boolean;
	installedAt: string;
	iconUrl?: string;
	author?: string;
	fileSizeBytes?: number;
};

export type ModProfileRecord = {
	id: string;
	minecraftVersion: string;
	loader: ModLoader;
};

export type ModsPersistedState = {
	version: 2;
	installedMods: InstalledModRecord[];
};

export const EMPTY_MODS_STATE: ModsPersistedState = {
	version: 2,
	installedMods: [],
};

export function profileIdFrom(mc: string, loader: ModLoader): string {
	return `${String(mc ?? '').trim()}-${loader}`;
}
