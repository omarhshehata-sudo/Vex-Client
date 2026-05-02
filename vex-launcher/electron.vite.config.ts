import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

/**
 * Vite adds `crossorigin` on entry script/link tags for HTTP caching/preload.
 * Under `file://`, Chromium often refuses to load those assets, leaving a blank window.
 */
function stripCrossoriginForFileProtocol(): Plugin {
	return {
		name: 'strip-crossorigin-for-file-protocol',
		apply: 'build',
		enforce: 'post',
		transformIndexHtml(html) {
			return html.replace(/\s+crossorigin(?:=["'][^"']*["'])?/gi, '');
		},
	};
}

/**
 * Directory that contains `electron.vite.config.ts` (the launcher package).
 * electron-vite’s preset uses CLI `root` / `process.cwd()` for discovery; that breaks when
 * the binary is run from a parent folder. Pinning paths here keeps builds consistent.
 */
const pkgRoot = dirname(fileURLToPath(import.meta.url));
const rendererRoot = resolve(pkgRoot, 'src/renderer');

export default defineConfig({
	main: {
		root: pkgRoot,
		plugins: [externalizeDepsPlugin()],
		build: {
			outDir: resolve(pkgRoot, 'out/main'),
			rollupOptions: {
				input: resolve(pkgRoot, 'src/main/index.ts'),
			},
		},
	},
	preload: {
		root: pkgRoot,
		plugins: [externalizeDepsPlugin()],
		build: {
			outDir: resolve(pkgRoot, 'out/preload'),
			rollupOptions: {
				input: resolve(pkgRoot, 'src/preload/index.ts'),
				output: {
					format: 'cjs',
					entryFileNames: 'index.js',
				},
			},
		},
	},
	renderer: {
		// Vite project root = folder with index.html so production emits flat
		// `out/renderer/index.html` + `out/renderer/assets/*` (reliable under file://).
		root: rendererRoot,
		resolve: {
			alias: {
				'@renderer': resolve(rendererRoot, 'src'),
			},
		},
		server: {
			port: 51820,
			// If 51820 is taken, Vite bumps the port; main process `resolveDevRendererUrl` finds it.
			strictPort: false,
		},
		plugins: [react(), stripCrossoriginForFileProtocol()],
		build: {
			outDir: resolve(pkgRoot, 'out/renderer'),
			rollupOptions: {
				// Absolute path: relative `index.html` fails under electron-vite’s merge order during build.
				input: resolve(rendererRoot, 'index.html'),
			},
		},
	},
});
