import { DEFAULT_MINECRAFT_VERSION_ID, VERSION_MANIFEST_V2_URL } from './constants';
import { VEX_VERSION_CATALOG } from './versionCatalog';
import type { VersionManifestV2 } from './versionJsonTypes';

export type VersionEntry = { id: string; type: string; label?: string; tags?: string[] };

let cache: { at: number; manifest: VersionManifestV2 } | null = null;
const TTL_MS = 15 * 60 * 1000;

export async function fetchVersionManifestV2(): Promise<VersionManifestV2> {
	const now = Date.now();
	if (cache && now - cache.at < TTL_MS) {
		return cache.manifest;
	}
	const res = await fetch(VERSION_MANIFEST_V2_URL);
	if (!res.ok) {
		throw new Error(`Version manifest HTTP ${res.status}`);
	}
	const manifest = (await res.json()) as VersionManifestV2;
	cache = { at: now, manifest };
	return manifest;
}

export function findManifestVersion(manifest: VersionManifestV2, id: string) {
	return manifest.versions.find((v) => v.id === id);
}

/** Supported ids intersected with manifest (ensures official URLs). */
export async function listSupportedMinecraftVersions(): Promise<VersionEntry[]> {
	const manifest = await fetchVersionManifestV2();
	const out: VersionEntry[] = [];
	for (const item of VEX_VERSION_CATALOG) {
		const v = findManifestVersion(manifest, item.id);
		if (v) {
			out.push({ id: v.id, type: v.type, label: item.label, tags: item.tags });
		}
	}
	return out;
}

/** Keep any non-empty id from settings (UI may pick any Mojang manifest version). */
export function normalizeSelectedVersionId(current: string | null | undefined): string {
	const t = String(current ?? '').trim();
	if (!t) return DEFAULT_MINECRAFT_VERSION_ID;
	return t;
}

/** @deprecated wide list — prefer listSupportedMinecraftVersions for UI */
export async function listMinecraftVersions(): Promise<VersionEntry[]> {
	return listSupportedMinecraftVersions();
}
