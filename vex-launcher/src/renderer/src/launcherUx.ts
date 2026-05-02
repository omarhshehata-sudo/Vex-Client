import type { LauncherSettings } from './services/types';

export type AccentId = 'purple' | 'blue' | 'cyan' | 'green' | 'orange' | 'red';

const ACCENT_IDS: AccentId[] = ['purple', 'blue', 'cyan', 'green', 'orange', 'red'];

export const ACCENT_CSS: Record<AccentId, { main: string; hover: string; pressed: string }> = {
	purple: { main: '#8b5cf6', hover: '#a78bfa', pressed: '#7c3aed' },
	blue: { main: '#3b82f6', hover: '#60a5fa', pressed: '#2563eb' },
	cyan: { main: '#06b6d4', hover: '#22d3ee', pressed: '#0891b2' },
	green: { main: '#22c55e', hover: '#4ade80', pressed: '#16a34a' },
	orange: { main: '#f97316', hover: '#fb923c', pressed: '#ea580c' },
	red: { main: '#ef4444', hover: '#f87171', pressed: '#dc2626' },
};

export function applyAccentCss(accent: AccentId) {
	const c = ACCENT_CSS[accent] ?? ACCENT_CSS.purple;
	const r = document.documentElement;
	r.style.setProperty('--vex-accent', c.main);
	r.style.setProperty('--vex-accent-hover', c.hover);
	r.style.setProperty('--vex-accent-pressed', c.pressed);
}

export function coerceAccentId(v: string): AccentId {
	return ACCENT_IDS.includes(v as AccentId) ? (v as AccentId) : 'purple';
}

function normalizeAccent(v: string): AccentId {
	return coerceAccentId(v);
}

/** Apply accent, motion, theme marker, and accent intensity to the document root (call after hydrate / save). */
export function applyLauncherUx(settings: LauncherSettings | null) {
	const root = document.documentElement;
	if (!settings) {
		root.classList.remove('vex-motion-off');
		root.removeAttribute('data-vex-theme');
		root.style.removeProperty('--vex-accent-glow-mul');
		return;
	}

	if (!settings.animationsEnabled || settings.reduceMotion) root.classList.add('vex-motion-off');
	else root.classList.remove('vex-motion-off');

	applyAccentCss(normalizeAccent(settings.accent));

	const mul = settings.accentIntensity === 'subtle' ? '0.42' : settings.accentIntensity === 'strong' ? '1.05' : '0.72';
	root.style.setProperty('--vex-accent-glow-mul', mul);

	const slug = String(settings.theme ?? 'dark-purple')
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '');
	root.setAttribute('data-vex-theme', slug || 'dark-purple');
}
