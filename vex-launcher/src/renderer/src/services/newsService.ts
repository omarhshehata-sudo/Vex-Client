export type NewsTag = 'announcement' | 'patch' | 'update';

/** Sidebar / dropdown grouping (not `all`). */
export type NewsBucket = 'updates' | 'events' | 'announcements' | 'maintenance';

/** Card hero art preset (CSS-only, no bundled artwork required). */
export type NewsCover = 'space' | 'forest' | 'squad' | 'cube' | 'tools' | 'mobile';

export type NewsItem = {
	id: string;
	title: string;
	tag: NewsTag;
	/** Uppercase pill on cards (UPDATE, PATCH, …). */
	pill: string;
	bucket: NewsBucket;
	cover: NewsCover;
	/** Short summary shown in lists/cards */
	description: string;
	/** Optional ISO date (YYYY-MM-DD) */
	date?: string;
};

function newsTimeMs(n: Pick<NewsItem, 'date'>): number {
	const d = String(n.date ?? '').trim();
	if (!d) return 0;
	const t = Date.parse(`${d}T00:00:00.000Z`);
	return Number.isFinite(t) ? t : 0;
}

/** Canonical feed (unordered). Consumers should use `sortedNews()` for stable newest-first UX. */
export const NEWS_ITEMS: NewsItem[] = [
	{
		id: 'vex-home-loading-profiles',
		title: 'Vex Launcher — new home, cosmic boot & profiles',
		tag: 'update',
		pill: 'UPDATE',
		bucket: 'updates',
		cover: 'space',
		description: 'A brand-new home experience, cinematic loading screen, launcher profiles, and per-profile Modrinth installs.',
		date: '2026-05-01',
	},
	{
		id: 'modrinth-browse-install',
		title: 'Mod browser with Modrinth + one-click install',
		tag: 'update',
		pill: 'UPDATE',
		bucket: 'updates',
		cover: 'forest',
		description: 'Search Modrinth from the launcher, queue installs into your active profile, and keep mods isolated per profile.',
		date: '2026-04-29',
	},
	{
		id: 'microsoft-signin-skins',
		title: 'Microsoft sign-in & skin avatars',
		tag: 'patch',
		pill: 'PATCH',
		bucket: 'announcements',
		cover: 'squad',
		description: 'OAuth flow and profile hydration tuned so your Minecraft skin shows consistently after login.',
		date: '2026-04-27',
	},
	{
		id: 'java21-launch-polish',
		title: 'Java 21 validation & launch polish',
		tag: 'patch',
		pill: 'UPDATE',
		bucket: 'updates',
		cover: 'cube',
		description: 'Validate Game Java before launch, clearer status messaging, and smoother progress during first-time downloads.',
		date: '2026-04-26',
	},
	{
		id: 'maintenance-windows',
		title: 'Scheduled maintenance windows',
		tag: 'announcement',
		pill: 'MAINTENANCE',
		bucket: 'maintenance',
		cover: 'tools',
		description: 'Occasionally auth or API endpoints restart during releases — if sign-in fails, wait a minute and try again.',
		date: '2026-04-25',
	},
	{
		id: 'roadmap-companion',
		title: 'What’s next for Vex Client',
		tag: 'announcement',
		pill: 'ANNOUNCEMENT',
		bucket: 'events',
		cover: 'mobile',
		description: 'We’re exploring cloud sync for profiles and a companion view for patch notes — feedback welcome on Discord.',
		date: '2026-04-24',
	},
];

export function sortedNews(items: readonly NewsItem[] = NEWS_ITEMS): NewsItem[] {
	return [...items].sort((a, b) => {
		const dt = newsTimeMs(b) - newsTimeMs(a);
		if (dt !== 0) return dt;
		return String(a.title).localeCompare(String(b.title));
	});
}

export function newsById(id: string): NewsItem | undefined {
	const key = String(id ?? '').trim();
	if (!key) return undefined;
	return NEWS_ITEMS.find((n) => n.id === key);
}

export function newsMatchesBucket(item: NewsItem, filter: 'all' | NewsBucket): boolean {
	if (filter === 'all') return true;
	return item.bucket === filter;
}

/** Used for Home “Latest update” preview + dropdown previews. */
export const NEWS_FEED = sortedNews();

export const FEATURED_NEWS: NewsItem | undefined = NEWS_FEED[0];

/** Latest items for compact surfaces (dropdown, quick previews). */
export const LATEST_NEWS = NEWS_FEED.slice(0, Math.min(5, NEWS_FEED.length));
