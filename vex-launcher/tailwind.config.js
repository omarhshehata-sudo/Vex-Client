import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
	// Anchor to this package so `content` resolves even when PostCSS’s cwd is not `vex-launcher/`.
	content: [join(pkgRoot, 'src/renderer/index.html'), join(pkgRoot, 'src/renderer/src/**/*.{ts,tsx}')],
	theme: {
		extend: {
			colors: {
				vex: {
					// Sourced from `src/renderer/src/styles/theme.css` design tokens.
					bg: '#0b0b0f',
					surface: '#14141a',
					surface2: '#1b1b23',
					raised: '#22222c',
					border: 'rgba(255, 255, 255, 0.08)',
					accent: '#7c5cff',
					accentHover: '#8b73ff',
					accentPressed: '#6848e8',
					glow: 'rgba(124, 92, 255, 0.35)',
					text: '#ffffff',
					dim: '#a6a6b3',
					muted: '#6f6f7c',
					error: '#ff4d5e',
					warning: '#ffcc66',
					success: '#4dff9a',
				},
			},
			boxShadow: {
				vex: '0 0 42px -12px rgba(124, 92, 255, 0.42)',
				panel: '0 10px 30px rgba(0, 0, 0, 0.35)',
			},
			backgroundImage: {
				'vex-radial':
					'radial-gradient(ellipse 120% 80% at 50% -20%, rgba(124, 92, 255, 0.20), transparent 55%), radial-gradient(ellipse 80% 50% at 100% 100%, rgba(106, 76, 255, 0.10), transparent 45%)',
			},
			borderRadius: {
				vex: 'var(--vex-radius)',
				'vex-lg': 'var(--vex-radius-lg)',
			},
		},
	},
	plugins: [],
};
