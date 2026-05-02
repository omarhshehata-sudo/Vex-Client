/** Modrinth Labrinth API v2 — https://api.modrinth.com */

const BASE = 'https://api.modrinth.com/v2';
const USER_AGENT = 'VexLauncher/0.1.0-alpha (Electron; +https://github.com/vex-client)';

export type ModrinthSearchSort = 'relevance' | 'downloads' | 'follows' | 'updated' | 'newest';

export type ModrinthSearchHit = {
	project_id: string;
	project_type?: string;
	slug?: string;
	title?: string;
	description?: string;
	icon_url?: string | null;
	author?: string;
	display_categories?: string[];
	latest_version?: string;
	versions?: string[];
	downloads?: number;
	follows?: number;
	date_modified?: string;
	color?: number;
};

export type ModrinthSearchResponse = {
	hits: ModrinthSearchHit[];
	offset: number;
	limit: number;
	total_hits: number;
};

export type ModrinthFile = {
	hashes?: { sha512?: string; sha1?: string };
	url: string;
	filename: string;
	primary?: boolean;
	size?: number;
};

export type ModrinthVersionDep = {
	version_id: string | null;
	project_id: string;
	file_name?: string | null;
	dependency_type: 'required' | 'optional' | 'incompatible' | 'embedded' | string;
};

export type ModrinthVersion = {
	id: string;
	project_id: string;
	name: string;
	version_number: string;
	changelog?: string;
	date_published: string;
	downloads: number;
	version_type: string;
	status: string;
	files: ModrinthFile[];
	dependencies: ModrinthVersionDep[];
	game_versions: string[];
	loaders: string[];
};

export type ModrinthProject = {
	id: string;
	title: string;
	description: string;
	icon_url?: string | null;
	team?: string;
	project_type?: string;
};

export async function searchMods(opts: {
	query: string;
	limit: number;
	offset: number;
	gameVersion?: string;
	loader?: string;
	sort: ModrinthSearchSort;
}): Promise<ModrinthSearchResponse> {
	const facets: string[][] = [['project_type:mod']];
	const gv = opts.gameVersion?.trim();
	const ld = opts.loader?.trim();
	if (gv) facets.push([`versions:${gv}`]);
	if (ld) facets.push([`categories:${ld}`]);

	const indexMap: Record<ModrinthSearchSort, string> = {
		relevance: 'relevance',
		downloads: 'downloads',
		follows: 'follows',
		updated: 'updated',
		newest: 'newest',
	};

	const params = new URLSearchParams();
	params.set('query', opts.query ?? '');
	params.set('limit', String(opts.limit));
	params.set('offset', String(opts.offset));
	params.set('facets', JSON.stringify(facets));
	params.set('index', indexMap[opts.sort] ?? 'relevance');

	const res = await fetch(`${BASE}/search?${params.toString()}`, { headers: { 'User-Agent': USER_AGENT } });
	if (!res.ok) {
		throw new Error(`Modrinth search failed: HTTP ${res.status}`);
	}
	return (await res.json()) as ModrinthSearchResponse;
}

export async function getProject(projectIdOrSlug: string): Promise<ModrinthProject> {
	const res = await fetch(`${BASE}/project/${encodeURIComponent(projectIdOrSlug)}`, { headers: { 'User-Agent': USER_AGENT } });
	if (!res.ok) throw new Error(`Modrinth project failed: HTTP ${res.status}`);
	return (await res.json()) as ModrinthProject;
}

export async function listProjectVersions(
	projectId: string,
	opts?: { gameVersions?: string[]; loaders?: string[] },
): Promise<ModrinthVersion[]> {
	const u = new URL(`${BASE}/project/${encodeURIComponent(projectId)}/version`);
	if (opts?.gameVersions?.length) u.searchParams.set('game_versions', JSON.stringify(opts.gameVersions));
	if (opts?.loaders?.length) u.searchParams.set('loaders', JSON.stringify(opts.loaders));
	const res = await fetch(u, { headers: { 'User-Agent': USER_AGENT } });
	if (!res.ok) throw new Error(`Modrinth versions failed: HTTP ${res.status}`);
	return (await res.json()) as ModrinthVersion[];
}

export async function getVersion(versionId: string): Promise<ModrinthVersion> {
	const res = await fetch(`${BASE}/version/${encodeURIComponent(versionId)}`, { headers: { 'User-Agent': USER_AGENT } });
	if (!res.ok) throw new Error(`Modrinth version failed: HTTP ${res.status}`);
	return (await res.json()) as ModrinthVersion;
}

export function pickPrimaryFile(version: ModrinthVersion): ModrinthFile | null {
	const files = version.files ?? [];
	const primary = files.find((f) => f.primary);
	if (primary) return primary;
	return files[0] ?? null;
}

export async function downloadToFile(url: string, destPath: string): Promise<void> {
	const { writeFileSync } = await import('node:fs');
	const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
	if (!res.ok) {
		throw new Error(`Download failed: HTTP ${res.status}`);
	}
	const buf = Buffer.from(await res.arrayBuffer());
	writeFileSync(destPath, buf);
}
