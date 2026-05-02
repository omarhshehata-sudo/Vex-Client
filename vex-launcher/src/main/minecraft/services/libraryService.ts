import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { unzipSync } from 'fflate';

import { rulesAllow } from '../ruleUtils';
import type { DownloadArtifact, MinecraftFeatureFlags, MinecraftLibrary, MinecraftVersionJson } from '../versionJsonTypes';
import { DownloadService } from './downloadService';

export type LibraryLogFn = (message: string) => void;
export type LibraryStatusFn = (s: { phase: string; percent?: number; detail?: string }) => void;

function classifierNativeArtifact(lib: MinecraftLibrary): DownloadArtifact | null {
	const natives = lib.natives;
	if (!natives) return null;
	const os = process.platform === 'darwin' ? 'osx' : process.platform === 'win32' ? 'windows' : 'linux';
	const classifierName = natives[os];
	if (!classifierName) return null;
	return lib.downloads?.classifiers?.[classifierName] ?? null;
}

function isNativeArtifactPath(p: string): boolean {
	return p.includes('-natives-');
}

export class LibraryService {
	static libraryJarPath(gameDir: string, artifact: DownloadArtifact): string {
		return join(gameDir, 'libraries', artifact.path.replace(/\\/g, '/'));
	}

	static clientJarPath(gameDir: string, versionId: string): string {
		return join(gameDir, 'versions', versionId, `${versionId}.jar`);
	}

	static nativesDir(gameDir: string, versionId: string): string {
		return join(gameDir, 'versions', versionId, 'natives');
	}

	static async ensureClientJar(
		gameDir: string,
		versionId: string,
		versionJson: MinecraftVersionJson,
		log: LibraryLogFn,
		status?: LibraryStatusFn,
	): Promise<void> {
		const dest = this.clientJarPath(gameDir, versionId);
		if (existsSync(dest)) {
			const sha = DownloadService.sha1OfFile(dest);
			if (sha.toLowerCase() === versionJson.downloads.client.sha1.toLowerCase()) {
				return;
			}
			log('Client jar hash mismatch — re-downloading…');
		}
		log('Downloading Minecraft client jar…');
		await DownloadService.downloadToFile(versionJson.downloads.client.url, dest, {
			expectedSha1: versionJson.downloads.client.sha1,
			onProgress: (p) => {
				if (p.total) status?.({ phase: 'Downloading…', percent: p.bytes / p.total, detail: `client.jar (${versionId})` });
			},
		});
	}

	static async ensureLibraries(
		gameDir: string,
		versionJson: MinecraftVersionJson,
		log: LibraryLogFn,
		features: MinecraftFeatureFlags = {},
		status?: LibraryStatusFn,
	): Promise<void> {
		const libsRoot = join(gameDir, 'libraries');
		mkdirSync(libsRoot, { recursive: true });
		let n = 0;
		const total = versionJson.libraries.length;
		for (const lib of versionJson.libraries) {
			n += 1;
			if (!rulesAllow(lib.rules, features)) continue;
			const art = lib.downloads?.artifact;
			if (!art) continue;
			const dest = this.libraryJarPath(gameDir, art);
			if (existsSync(dest)) {
				const sha = DownloadService.sha1OfFile(dest);
				if (sha.toLowerCase() === art.sha1.toLowerCase()) {
					continue;
				}
			}
			if (n % 12 === 1) {
				log(`Libraries ${n}/${total}…`);
			}
			status?.({ phase: 'Downloading…', percent: Math.min(1, n / Math.max(1, total)), detail: `libraries ${n}/${total}` });
			await DownloadService.downloadToFile(art.url, dest, {
				expectedSha1: art.sha1,
				onProgress: (p) => {
					if (!p.total) return;
					// Blend per-file progress into the overall libraries progress.
					const base = (n - 1) / Math.max(1, total);
					const next = n / Math.max(1, total);
					const blended = base + (next - base) * (p.bytes / p.total);
					status?.({ phase: 'Downloading…', percent: Math.min(1, blended), detail: `libraries ${n}/${total}` });
				},
			});
		}

		/* Legacy classifier-only natives (pre–inline native artifacts) */
		for (const lib of versionJson.libraries) {
			if (!rulesAllow(lib.rules, features)) continue;
			const c = classifierNativeArtifact(lib);
			if (!c) continue;
			const dest = this.libraryJarPath(gameDir, c);
			if (existsSync(dest)) {
				const sha = DownloadService.sha1OfFile(dest);
				if (sha.toLowerCase() === c.sha1.toLowerCase()) continue;
			}
			log(`Downloading native (classifier) ${c.path}…`);
			await DownloadService.downloadToFile(c.url, dest, {
				expectedSha1: c.sha1,
				onProgress: (p) => {
					if (p.total) status?.({ phase: 'Downloading…', percent: p.bytes / p.total, detail: `native ${c.path}` });
				},
			});
		}
	}

	static buildClasspath(
		gameDir: string,
		versionJson: MinecraftVersionJson,
		versionId: string,
		features: MinecraftFeatureFlags = {},
	): string {
		const sep = process.platform === 'win32' ? ';' : ':';
		const parts: string[] = [];
		for (const lib of versionJson.libraries) {
			if (!rulesAllow(lib.rules, features)) continue;
			const art = lib.downloads?.artifact;
			if (!art) continue;
			if (isNativeArtifactPath(art.path)) continue;
			parts.push(this.libraryJarPath(gameDir, art));
		}
		parts.push(this.clientJarPath(gameDir, versionId));
		return parts.join(sep);
	}

	static async ensureAndExtractNatives(
		gameDir: string,
		versionId: string,
		versionJson: MinecraftVersionJson,
		log: LibraryLogFn,
		features: MinecraftFeatureFlags = {},
		status?: LibraryStatusFn,
	): Promise<string> {
		const outDir = this.nativesDir(gameDir, versionId);
		mkdirSync(outDir, { recursive: true });

		const extractJar = (art: DownloadArtifact, lib: MinecraftLibrary) => {
			const nativeJar = this.libraryJarPath(gameDir, art);
			const buf = readFileSync(nativeJar);
			const entries = unzipSync(new Uint8Array(buf));
			const exclude = new Set((lib as MinecraftLibrary & { extract?: { exclude?: string[] } }).extract?.exclude ?? []);
			for (const name of Object.keys(entries)) {
				if (name.endsWith('/')) continue;
				if (name.startsWith('META-INF/')) continue;
				let skip = false;
				for (const ex of exclude) {
					if (name.startsWith(ex) || name.includes(ex)) {
						skip = true;
						break;
					}
				}
				if (skip) continue;
				const base = basename(name);
				if (!/\.(dll|so|dylib)$/.test(base)) continue;
				const dest = join(outDir, base);
				writeFileSync(dest, Buffer.from(entries[name]!));
			}
		};

		for (const lib of versionJson.libraries) {
			if (!rulesAllow(lib.rules, features)) continue;
			const art = lib.downloads?.artifact;
			if (art && isNativeArtifactPath(art.path)) {
				log(`Extracting natives from ${basename(art.path)}…`);
				status?.({ phase: 'Preparing launch…', detail: `extract natives (${basename(art.path)})` });
				extractJar(art, lib);
			}
		}

		for (const lib of versionJson.libraries) {
			if (!rulesAllow(lib.rules, features)) continue;
			const c = classifierNativeArtifact(lib);
			if (!c) continue;
			log(`Extracting natives from ${basename(c.path)}…`);
			status?.({ phase: 'Preparing launch…', detail: `extract natives (${basename(c.path)})` });
			extractJar(c, lib);
		}

		return outDir;
	}
}
