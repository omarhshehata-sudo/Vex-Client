import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { AssetIndexJson, MinecraftVersionJson } from '../versionJsonTypes';
import { DownloadService } from './downloadService';

const RESOURCE_HOST = 'https://resources.download.minecraft.net';

export type AssetLogFn = (message: string) => void;
export type AssetStatusFn = (s: { phase: string; percent?: number; detail?: string }) => void;

export class AssetService {
	static assetIndexPath(gameDir: string, id: string): string {
		return join(gameDir, 'assets', 'indexes', `${id}.json`);
	}

	static objectPath(gameDir: string, hash: string): string {
		return join(gameDir, 'assets', 'objects', hash.slice(0, 2), hash);
	}

	static objectUrl(hash: string): string {
		return `${RESOURCE_HOST}/${hash.slice(0, 2)}/${hash}`;
	}

	static async ensureAssetIndex(
		gameDir: string,
		versionJson: MinecraftVersionJson,
		log: AssetLogFn,
		status?: AssetStatusFn,
	): Promise<AssetIndexJson> {
		const id = versionJson.assetIndex.id;
		const dest = this.assetIndexPath(gameDir, id);
		mkdirSync(join(gameDir, 'assets', 'indexes'), { recursive: true });
		if (existsSync(dest)) {
			const sha = DownloadService.sha1OfFile(dest);
			if (sha.toLowerCase() === versionJson.assetIndex.sha1.toLowerCase()) {
				return JSON.parse(readFileSync(dest, 'utf8')) as AssetIndexJson;
			}
			log('Asset index hash mismatch — re-downloading…');
		} else {
			log(`Downloading asset index ${id}…`);
		}
		await DownloadService.downloadToFile(versionJson.assetIndex.url, dest, {
			expectedSha1: versionJson.assetIndex.sha1,
			onProgress: (p) => {
				if (p.total) status?.({ phase: 'Downloading…', percent: p.bytes / p.total, detail: `asset index (${id})` });
			},
		});
		return JSON.parse(readFileSync(dest, 'utf8')) as AssetIndexJson;
	}

	static async ensureAssets(
		gameDir: string,
		index: AssetIndexJson,
		log: AssetLogFn,
		status?: AssetStatusFn,
	): Promise<void> {
		const objects = index.objects;
		const keys = Object.keys(objects);
		const total = keys.length;
		let done = 0;
		const step = Math.max(1, Math.floor(total / 40));
		for (const key of keys) {
			const { hash, size } = objects[key]!;
			const dest = this.objectPath(gameDir, hash);
			if (existsSync(dest)) {
				const st = readFileSync(dest);
				if (st.length === size) {
					done += 1;
					continue;
				}
			}
			mkdirSync(join(gameDir, 'assets', 'objects', hash.slice(0, 2)), { recursive: true });
			const url = this.objectUrl(hash);
			await DownloadService.downloadToFile(url, dest, {
				expectedSha1: hash,
				onProgress: (p) => {
					if (!p.total) return;
					const filePct = p.bytes / p.total;
					const overall = (done + filePct) / Math.max(1, total);
					status?.({ phase: 'Downloading…', percent: Math.min(1, overall), detail: `assets ${done + 1}/${total}` });
				},
			});
			done += 1;
			if (done % step === 0) {
				log(`Assets ${done}/${total}…`);
			}
		}
	}
}
