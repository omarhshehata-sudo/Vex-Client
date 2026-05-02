import type { AuthProfile } from './types';
import { formatAuthError } from './errors';

function api() {
	return window.vexLauncher;
}

export class AccountService {
	static async getProfile(): Promise<AuthProfile> {
		const a = api();
		if (!a) return { signedIn: false };
		const r = await a.authGetProfile();
		if (!r.signedIn) {
			return { signedIn: false, stale: 'stale' in r && r.stale ? true : undefined };
		}
		return {
			signedIn: true,
			username: r.username,
			uuid: r.uuid,
			expiresAtEpochSec: r.expiresAtEpochSec,
		};
	}

	static async signInWithMicrosoft(): Promise<{ ok: true } | { ok: false; message: string }> {
		const a = api();
		if (!a) return { ok: false, message: 'Launcher API unavailable (run inside Electron).' };
		const r = await a.authSignIn();
		if (r.ok) return { ok: true };
		return { ok: false, message: formatAuthError(r.code, r.message) };
	}

	static async signOut(): Promise<void> {
		await api()?.authSignOut();
	}

	/** Placeholder until skin avatars are loaded from Mojang/CDN. */
	static initialsFor(username: string): string {
		const t = username.trim();
		if (t.length === 0) return '?';
		if (t.length === 1) return t.toUpperCase();
		return (t[0] + t[1]).toUpperCase();
	}
}
