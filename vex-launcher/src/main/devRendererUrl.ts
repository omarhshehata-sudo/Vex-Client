import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

function probeHttpOk(url: string): Promise<boolean> {
	return new Promise((resolve) => {
		const u = new URL(url);
		const lib = u.protocol === 'https:' ? https : http;
		const req = lib.get(url, { timeout: 600 }, (res) => {
			res.resume();
			resolve((res.statusCode ?? 0) < 500);
		});
		req.on('error', () => resolve(false));
		req.on('timeout', () => {
			req.destroy();
			resolve(false);
		});
	});
}

/**
 * electron-vite sets `ELECTRON_RENDERER_URL` from `config.server.port` after `listen()`.
 * When Vite bumps the port (EADDRINUSE), that value can still be the *requested* port, not the
 * bound one — Electron then loads nothing useful → blank window. Scan a small port range.
 */
export async function resolveDevRendererUrl(declared: string): Promise<string> {
	let u: URL;
	try {
		u = new URL(declared);
	} catch {
		return declared;
	}
	if (u.protocol !== 'http:' && u.protocol !== 'https:') {
		return declared;
	}

	const start = u.port ? parseInt(u.port, 10) : u.protocol === 'https:' ? 443 : 80;
	for (let p = start; p < start + 32; p++) {
		u.port = String(p);
		const candidate = u.href;
		if (await probeHttpOk(candidate)) {
			if (candidate !== declared) {
				console.info(`[vex-launcher] dev renderer URL adjusted: ${declared} → ${candidate}`);
			}
			return candidate;
		}
	}
	return declared;
}
