const KEY = 'vex.versionFavorites.v1';

const DEFAULT_PINNED = ['1.8.9', '1.12.2', '1.20.1'] as const;

function safeJsonParse<T>(text: string): T | null {
	try {
		return JSON.parse(text) as T;
	} catch {
		return null;
	}
}

export class VersionFavoritesService {
	static get(): Set<string> {
		try {
			const raw = localStorage.getItem(KEY);
			if (!raw) return new Set(DEFAULT_PINNED);
			const parsed = safeJsonParse<string[]>(raw);
			if (!Array.isArray(parsed)) return new Set(DEFAULT_PINNED);
			return new Set(parsed.filter((x) => typeof x === 'string' && x.trim().length > 0));
		} catch {
			return new Set(DEFAULT_PINNED);
		}
	}

	static set(next: Set<string>) {
		try {
			localStorage.setItem(KEY, JSON.stringify(Array.from(next)));
		} catch {
			// ignore
		}
	}
}

