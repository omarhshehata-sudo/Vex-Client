import { mkdirSync, realpathSync } from 'node:fs';
import { isAbsolute, join, normalize, relative, resolve, sep } from 'node:path';

import type { LauncherProfile } from '../profiles/profileTypes';

/** Per-profile mods live under userData/profiles/<profileId>/mods */
export function profilesRoot(userData: string): string {
	return resolve(join(userData, 'profiles'));
}

export function sanitizeProfileId(profileId: string): string {
	const t = String(profileId ?? '').trim();
	if (!/^[\w.-]+$/.test(t)) throw new Error('Invalid profile id.');
	return t;
}

export function profileDir(userData: string, profileId: string): string {
	const id = sanitizeProfileId(profileId);
	return resolve(join(profilesRoot(userData), id));
}

export function profileModsDir(userData: string, profileId: string): string {
	return resolve(join(profileDir(userData, profileId), 'mods'));
}

export function ensureProfileModsDir(userData: string, profileId: string): string {
	const dir = profileModsDir(userData, profileId);
	mkdirSync(dir, { recursive: true });
	return dir;
}

export function isUnderParent(parentAbs: string, childAbs: string): boolean {
	const p = resolve(normalize(parentAbs));
	let c = resolve(normalize(childAbs));
	try {
		c = realpathSync(c);
	} catch {
		/* not yet on disk */
	}
	const rel = relative(p, c);
	return rel === '' || (!rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

/** Default profile mods dir, or custom `profile.modsDirectory` if set and allowed. */
export function resolveProfileModsDirectory(userData: string, profile: LauncherProfile): string {
	const custom = profile.modsDirectory?.trim();
	if (!custom) return ensureProfileModsDir(userData, profile.id);
	const abs = isAbsolute(custom) ? resolve(custom) : resolve(profile.gameDirectory, custom);
	const gameRoot = resolve(profile.gameDirectory);
	const profMods = profileModsDir(userData, profile.id);
	if (!isUnderParent(gameRoot, abs) && !isUnderParent(profMods, abs) && !isUnderParent(profileDir(userData, profile.id), abs)) {
		throw new Error('Mods directory must be under the game directory or the profile folder.');
	}
	mkdirSync(abs, { recursive: true });
	return abs;
}

export function allowedModPathRoots(userData: string, profile: LauncherProfile): string[] {
	const roots = [profileModsDir(userData, profile.id), resolve(join(resolve(profile.gameDirectory), 'mods'))];
	const c = profile.modsDirectory?.trim();
	if (c) {
		const abs = isAbsolute(c) ? resolve(c) : resolve(profile.gameDirectory, c);
		roots.push(abs);
	}
	return roots.map((r) => resolve(r));
}

export function assertUnderAllowedModRoots(roots: string[], candidate: string): string {
	const abs = resolve(normalize(candidate));
	for (const r of roots) {
		if (isUnderParent(r, abs)) return abs;
	}
	throw new Error('Path escapes allowed mod directories.');
}

/**
 * Ensure resolved path is under profilesRoot (legacy) or under allowed mod roots for the profile.
 */
export function assertModFilePathAllowed(userData: string, profile: LauncherProfile | null, candidate: string): string {
	const abs = resolve(normalize(candidate));
	const root = profilesRoot(userData);
	if (isUnderParent(root, abs)) return abs;
	if (profile) {
		return assertUnderAllowedModRoots(allowedModPathRoots(userData, profile), candidate);
	}
	throw new Error('Path escapes Vex profiles directory.');
}

export function assertUnderGameMods(gameDirectory: string, candidate: string): string {
	const root = resolve(join(resolve(normalize(gameDirectory)), 'mods'));
	let abs = resolve(normalize(candidate));
	try {
		abs = realpathSync(abs);
	} catch {
		/* may not exist yet */
	}
	const rel = relative(root, abs);
	if (rel.startsWith('..') || rel === '') {
		throw new Error('Path escapes game mods directory.');
	}
	return abs;
}

export function isAllowedModFilename(name: string): boolean {
	const n = String(name ?? '').toLowerCase();
	return n.endsWith('.jar') || n.endsWith('.jar.disabled');
}
