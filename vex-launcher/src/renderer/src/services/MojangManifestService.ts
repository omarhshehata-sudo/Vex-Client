export type MojangManifestVersion = {
	id: string;
	type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha';
	url: string;
	time: string;
	releaseTime: string;
};

export type MojangManifest = {
	latest: { release: string; snapshot: string };
	versions: MojangManifestVersion[];
};

export type MojangCatalog = {
	latestReleaseId: string;
	latestSnapshotId: string;
	versions: MojangManifestVersion[];
};

const MANIFEST_URL = 'https://launchermeta.mojang.com/mc/game/version_manifest.json';
const CACHE_KEY = 'vex.mojangManifest.v1';
const CACHE_KEY_RELEASES_ONLY = 'vex.mojangManifest.v1.releasesOnly';
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6h

function now() {
	return Date.now();
}

function safeJsonParse<T>(text: string): T | null {
	try {
		return JSON.parse(text) as T;
	} catch {
		return null;
	}
}

function readCache(key: string): { at: number; data: MojangCatalog } | null {
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return null;
		const parsed = safeJsonParse<{ at: number; data: MojangCatalog }>(raw);
		if (!parsed?.at || !parsed.data) return null;
		return parsed;
	} catch {
		return null;
	}
}

function writeCache(key: string, data: MojangCatalog) {
	try {
		localStorage.setItem(key, JSON.stringify({ at: now(), data }));
	} catch {
		// ignore
	}
}

function normalize(manifest: MojangManifest, limit = 40, releasesOnly = false): MojangCatalog {
	const filtered = (manifest.versions ?? [])
		.filter((v) => v && (releasesOnly ? v.type === 'release' : v.type === 'release' || v.type === 'snapshot'))
		.sort((a, b) => String(b.releaseTime).localeCompare(String(a.releaseTime)));

	return {
		latestReleaseId: manifest.latest?.release ?? filtered.find((v) => v.type === 'release')?.id ?? filtered[0]?.id ?? '',
		latestSnapshotId: manifest.latest?.snapshot ?? filtered.find((v) => v.type === 'snapshot')?.id ?? '',
		versions: filtered.slice(0, Math.max(0, limit)),
	};
}

export class MojangManifestService {
	/**
	 * @param releasesOnly When true, only `release` rows (newest first). Uses a separate cache entry from the mixed catalog.
	 */
	static async getCatalog({
		limit = 40,
		force = false,
		releasesOnly = false,
	}: { limit?: number; force?: boolean; releasesOnly?: boolean } = {}): Promise<MojangCatalog> {
		const cacheKey = releasesOnly ? CACHE_KEY_RELEASES_ONLY : CACHE_KEY;
		if (!force) {
			const cached = readCache(cacheKey);
			if (cached && now() - cached.at < CACHE_TTL_MS) return cached.data;
		}

		const r = await fetch(MANIFEST_URL, { cache: 'no-store' });
		if (!r.ok) throw new Error(`Manifest fetch failed (${r.status})`);
		const json = (await r.json()) as MojangManifest;
		const cat = normalize(json, limit, releasesOnly);
		writeCache(cacheKey, cat);
		return cat;
	}

	static prefetch(): void {
		void this.getCatalog().catch(() => {
			// ignore
		});
	}
}

