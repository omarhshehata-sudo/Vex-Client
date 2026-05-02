import { createHash } from 'node:crypto';
import { createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';

export type DownloadProgress = { url: string; bytes: number; total?: number; bps?: number };

export class DownloadService {
	static sha1OfBuffer(buf: Buffer): string {
		return createHash('sha1').update(buf).digest('hex');
	}

	static sha1OfFile(path: string): string {
		return this.sha1OfBuffer(readFileSync(path));
	}

	static async downloadToFile(
		url: string,
		destPath: string,
		opts?: { expectedSha1?: string; onProgress?: (p: DownloadProgress) => void },
	): Promise<void> {
		mkdirSync(dirname(destPath), { recursive: true });
		const tmp = `${destPath}.part`;
		if (existsSync(tmp)) {
			try {
				unlinkSync(tmp);
			} catch {
				/* ignore */
			}
		}

		const res = await fetch(url);
		if (!res.ok) {
			throw new Error(`Download failed ${res.status} ${url}`);
		}
		const total = Number(res.headers.get('content-length')) || undefined;

		const hash = createHash('sha1');
		let downloaded = 0;
		let lastAt = Date.now();
		let lastBytes = 0;

		const ws = createWriteStream(tmp);
		try {
			const body = res.body;
			// Node fetch returns a web ReadableStream; fall back to buffering if missing.
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const reader = (body as any)?.getReader?.() as { read: () => Promise<{ done: boolean; value?: Uint8Array }> } | undefined;
			if (reader) {
				while (true) {
					// eslint-disable-next-line no-await-in-loop
					const { done, value } = await reader.read();
					if (done) break;
					if (!value) continue;
					downloaded += value.byteLength;
					hash.update(value);
					ws.write(Buffer.from(value));

					const now = Date.now();
					if (now - lastAt >= 250) {
						const deltaB = downloaded - lastBytes;
						const deltaT = (now - lastAt) / 1000;
						const bps = deltaT > 0 ? deltaB / deltaT : undefined;
						opts?.onProgress?.({ url, bytes: downloaded, total, bps });
						lastAt = now;
						lastBytes = downloaded;
					}
				}
			} else {
				const ab = await res.arrayBuffer();
				const buf = Buffer.from(ab);
				downloaded = buf.length;
				hash.update(buf);
				ws.write(buf);
				opts?.onProgress?.({ url, bytes: downloaded, total: total ?? downloaded });
			}
		} finally {
			await new Promise<void>((resolve) => ws.end(() => resolve()));
		}

		// Final progress tick
		opts?.onProgress?.({ url, bytes: downloaded, total: total ?? downloaded, bps: undefined });

		if (opts?.expectedSha1) {
			const got = hash.digest('hex');
			if (got.toLowerCase() !== opts.expectedSha1.toLowerCase()) {
				try {
					unlinkSync(tmp);
				} catch {
					/* ignore */
				}
				throw new Error(`SHA1 mismatch for ${url}: expected ${opts.expectedSha1}, got ${got}`);
			}
		}

		renameSync(tmp, destPath);
	}

	static ensureDir(dir: string): void {
		mkdirSync(dir, { recursive: true });
	}

	static pathUnderGame(gameDir: string, ...segments: string[]): string {
		return join(gameDir, ...segments);
	}
}
