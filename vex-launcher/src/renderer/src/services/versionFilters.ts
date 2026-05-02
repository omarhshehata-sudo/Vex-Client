import type { VersionEntry } from './types';

export type VersionFilter = {
	/** Match a tag returned from the catalog (e.g. "latest", "stable", "pvp"). */
	tag?: string;
	/** Case-insensitive substring match on id/label/type. */
	query?: string;
	/** Match Mojang manifest type (e.g. "release", "snapshot"). */
	type?: string;
};

/**
 * Pure filter helper so the UI can scale to 20–30 versions without changing service logic.
 * (Renderer chooses what to show; main process chooses what is available/supported.)
 */
export function filterVersions(list: VersionEntry[], filter: VersionFilter): VersionEntry[] {
	let out = list;

	if (filter.tag) {
		out = out.filter((v) => v.tags?.includes(filter.tag) ?? false);
	}

	if (filter.type) {
		out = out.filter((v) => v.type === filter.type);
	}

	const q = filter.query?.trim().toLowerCase();
	if (q) {
		out = out.filter((v) => {
			const hay = `${v.id} ${v.type} ${v.label ?? ''}`.toLowerCase();
			return hay.includes(q);
		});
	}

	return out;
}

