import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { LauncherAuthState } from '../types';

export function authStatePath(userData: string): string {
	return join(userData, 'vex-launcher-auth.json');
}

export function loadAuthState(userData: string): LauncherAuthState | null {
	const p = authStatePath(userData);
	if (!existsSync(p)) return null;
	try {
		return JSON.parse(readFileSync(p, 'utf8')) as LauncherAuthState;
	} catch {
		return null;
	}
}

export function saveAuthState(userData: string, state: LauncherAuthState): void {
	const p = authStatePath(userData);
	mkdirSync(dirname(p), { recursive: true });
	writeFileSync(p, JSON.stringify(state, null, 2), 'utf8');
}

export function clearAuthState(userData: string): void {
	const p = authStatePath(userData);
	if (existsSync(p)) {
		try {
			unlinkSync(p);
		} catch {
			/* ignore */
		}
	}
}
