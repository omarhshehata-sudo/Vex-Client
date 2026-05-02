export type VersionTag = 'latest' | 'stable' | 'popular' | 'pvp';

export type VersionCatalogItem = {
	id: string;
	/** Short label shown under the version (e.g. "Latest", "PvP"). */
	label?: string;
	tags?: VersionTag[];
};

/**
 * Curated catalog shown in the launcher UI.
 *
 * This is intentionally a small "front page" set, while the underlying source of truth is Mojang's manifest.
 * To scale to 20–30 versions later, append items here (or generate this list from config) — UI/logic stays stable.
 */
export const VEX_VERSION_CATALOG: VersionCatalogItem[] = [
	{ id: '1.21.4', label: 'Latest', tags: ['latest'] },
	{ id: '1.21.1', label: 'Stable', tags: ['stable'] },
	{ id: '1.20.1', label: 'Popular', tags: ['popular'] },
	{ id: '1.19.4' },
	{ id: '1.16.5' },
	{ id: '1.8.9', label: 'PvP', tags: ['pvp'] },
];

export function catalogIds(): string[] {
	return VEX_VERSION_CATALOG.map((x) => x.id);
}

