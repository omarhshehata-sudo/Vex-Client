export const VEX_THEME = {
	colors: {
		bg: '#0B0B0F',
		surface1: '#14141A',
		surface2: '#1B1B23',
		surfaceElevated: '#22222C',
		accent: '#7C5CFF',
		accentHover: '#8B73FF',
		accentActive: '#6848E8',
		glow: 'rgba(124, 92, 255, 0.35)',
		text: '#FFFFFF',
		textSecondary: '#A6A6B3',
		textMuted: '#6F6F7C',
		border: 'rgba(255,255,255,0.08)',
		success: '#4DFF9A',
		error: '#FF4D5E',
		warning: '#FFCC66',
	},
	typography: {
		fontStack: 'Inter, Satoshi, SF Pro, system-ui, sans-serif',
		weights: { title: 700, section: 650, label: 600, body: 400 },
		sizes: { pageTitlePx: 30, sectionPx: 20, labelPx: 15, smallPx: 12 },
	},
	radius: { mdPx: 16, lgPx: 18 },
	motion: {
		ease: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
		durationsMs: { fast: 160, base: 220, page: 240, snap: 360 },
	},
} as const;

