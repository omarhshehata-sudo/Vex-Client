import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { DownloadService } from './downloadService';
import { fetchVersionManifestV2, findManifestVersion } from '../versionManifest';
import type { MinecraftVersionJson } from '../versionJsonTypes';

export type VersionLogFn = (message: string) => void;
export type VersionStatusFn = (s: { phase: string; percent?: number; detail?: string }) => void;

export class VersionService {
	static versionJsonPath(gameDir: string, versionId: string): string {
		return join(gameDir, 'versions', versionId, `${versionId}.json`);
	}

	static readVersionJson(gameDir: string, versionId: string): MinecraftVersionJson {
		const p = this.versionJsonPath(gameDir, versionId);
		return JSON.parse(readFileSync(p, 'utf8')) as MinecraftVersionJson;
	}

	/**
	 * Ensures `versions/<id>/<id>.json` exists by downloading from the official manifest entry URL.
	 */
	static async ensureVersionJson(
		gameDir: string,
		versionId: string,
		log: VersionLogFn,
		status?: VersionStatusFn,
	): Promise<MinecraftVersionJson> {
		const dest = this.versionJsonPath(gameDir, versionId);
		mkdirSync(dirname(dest), { recursive: true });

		const manifest = await fetchVersionManifestV2();
		const entry = findManifestVersion(manifest, versionId);
		if (!entry) {
			throw new Error(`Version ${versionId} not found in Mojang version_manifest_v2.json`);
		}

		const needDownload = !existsSync(dest);
		if (needDownload) {
			log(`Downloading ${versionId} version metadata…`);
			status?.({ phase: 'Downloading…', percent: 0, detail: `${versionId} metadata` });
			await DownloadService.downloadToFile(entry.url, dest, {
				expectedSha1: entry.sha1,
				onProgress: (p) => {
					if (p.total) status?.({ phase: 'Downloading…', percent: p.bytes / p.total, detail: `${versionId} metadata` });
				},
			});
		} else {
			const diskSha = DownloadService.sha1OfFile(dest);
			if (diskSha.toLowerCase() !== entry.sha1.toLowerCase()) {
				log(`Version JSON hash mismatch — re-downloading ${versionId}…`);
				status?.({ phase: 'Downloading…', percent: 0, detail: `${versionId} metadata` });
				await DownloadService.downloadToFile(entry.url, dest, {
					expectedSha1: entry.sha1,
					onProgress: (p) => {
						if (p.total) status?.({ phase: 'Downloading…', percent: p.bytes / p.total, detail: `${versionId} metadata` });
					},
				});
			}
		}

		const json = JSON.parse(readFileSync(dest, 'utf8')) as MinecraftVersionJson;
		if (json.id !== versionId) {
			throw new Error(`Version JSON id mismatch: expected ${versionId}, got ${json.id}`);
		}
		writeFileSync(dest, JSON.stringify(json, null, 2), 'utf8');
		return json;
	}
}
