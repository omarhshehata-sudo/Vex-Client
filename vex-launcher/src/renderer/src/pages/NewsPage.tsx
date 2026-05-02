import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { HomeHeroSpaceBackdrop } from '../components/home/HomeHeroSpaceBackdrop';
import { LauncherMainNavBar } from '../components/layout/LauncherMainNavBar';
import {
	NEWS_FEED,
	newsById,
	newsMatchesBucket,
	type NewsBucket,
	type NewsCover,
	type NewsItem,
} from '../services/newsService';
import { EXTERNAL } from '../services/linkConstants';

type FilterKey = 'all' | NewsBucket;

const LAUNCHER_VERSION = 'v0.1.0-alpha';

function formatNewsDate(iso?: string): string {
	const d = String(iso ?? '').trim();
	if (!d) return '';
	const t = Date.parse(`${d}T12:00:00`);
	if (!Number.isFinite(t)) return d;
	return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(t);
}

function coverClass(cover: NewsCover): string {
	switch (cover) {
		case 'space':
			return 'bg-[radial-gradient(ellipse_75%_60%_at_32%_38%,rgba(167,139,250,0.42),transparent_58%),linear-gradient(155deg,#1a0b32_0%,#0d0618_48%,#030208_100%)]';
		case 'forest':
			return 'bg-[linear-gradient(165deg,#3d1d0a_0%,#1a3d2e_38%,#0a1520_100%)]';
		case 'squad':
			return 'bg-[linear-gradient(140deg,#2e1065_0%,#1e1b4b_45%,#0f172a_100%)]';
		case 'cube':
			return 'bg-[radial-gradient(circle_at_55%_35%,rgba(192,132,252,0.35),transparent_52%),linear-gradient(165deg,#3b0764_0%,#1e0a3a_50%,#020617_100%)]';
		case 'tools':
			return 'bg-[linear-gradient(145deg,#27272a_0%,#18181b_55%,#09090b_100%)]';
		case 'mobile':
			return 'bg-[radial-gradient(ellipse_60%_50%_at_50%_42%,rgba(99,102,241,0.25),transparent_60%),linear-gradient(175deg,#1e1b4b_0%,#0f172a_100%)]';
		default:
			return 'bg-gradient-to-br from-violet-950 to-black';
	}
}

function pillClasses(pill: string): string {
	const u = pill.toUpperCase();
	if (u === 'UPDATE')
		return 'border border-violet-400/40 bg-violet-600/45 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-50 shadow-[0_0_18px_rgba(139,92,246,0.35)]';
	if (u === 'EVENT')
		return 'border border-amber-400/35 bg-amber-600/30 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-50 shadow-[0_0_14px_rgba(245,158,11,0.22)]';
	if (u === 'NEWS')
		return 'border border-cyan-400/35 bg-cyan-700/25 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-cyan-50 shadow-[0_0_14px_rgba(34,211,238,0.2)]';
	if (u === 'MAINTENANCE')
		return 'border border-zinc-500/40 bg-zinc-800/55 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]';
	if (u === 'ANNOUNCEMENT')
		return 'border border-fuchsia-400/35 bg-fuchsia-700/30 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-fuchsia-50 shadow-[0_0_16px_rgba(217,70,239,0.22)]';
	if (u === 'PATCH')
		return 'border border-sky-400/35 bg-sky-900/40 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-100 shadow-[0_0_14px_rgba(56,189,248,0.2)]';
	return 'border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white/90';
}

function IconArrowOut({ className }: { className?: string }) {
	return (
		<svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
			<path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7h-7M17 7v7" />
		</svg>
	);
}

function FilterIcon({ kind }: { kind: 'all' | 'updates' | 'events' | 'announcements' | 'maintenance' }) {
	const cls = 'h-5 w-5 shrink-0 text-current';
	switch (kind) {
		case 'all':
			return (
				<svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
					<path strokeLinecap="round" d="M4 6h16M4 12h10M4 18h16" />
				</svg>
			);
		case 'updates':
			return (
				<svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
					<circle cx="12" cy="12" r="9" />
					<path strokeLinecap="round" d="M12 8v5l3 2" />
				</svg>
			);
		case 'events':
			return (
				<svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
					<rect x="4" y="5" width="16" height="15" rx="2" />
					<path strokeLinecap="round" d="M8 3v4M16 3v4M4 11h16" />
				</svg>
			);
		case 'announcements':
			return (
				<svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
					<path strokeLinejoin="round" d="M4 11v5a2 2 0 002 2h2M4 11h4l8-4v10l-8-4H6a2 2 0 01-2-2v-1" />
					<path strokeLinecap="round" d="M20 8v8" />
				</svg>
			);
		case 'maintenance':
			return (
				<svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
					<circle cx="12" cy="12" r="9" />
					<path strokeLinecap="round" d="M9 9l6 6M15 9l-6 6" />
				</svg>
			);
	}
}

const SIDEBAR: Array<{ key: FilterKey; label: string; icon: 'all' | 'updates' | 'events' | 'announcements' | 'maintenance' }> = [
	{ key: 'all', label: 'All News', icon: 'all' },
	{ key: 'updates', label: 'Updates', icon: 'updates' },
	{ key: 'events', label: 'Events', icon: 'events' },
	{ key: 'announcements', label: 'Announcements', icon: 'announcements' },
	{ key: 'maintenance', label: 'Maintenance', icon: 'maintenance' },
];

function WrenchCrossArt({ className }: { className?: string }) {
	return (
		<div className={['pointer-events-none flex items-center justify-center text-white/25', className].filter(Boolean).join(' ')} aria-hidden>
			<svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
				<path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
				<path d="M10.5 13.5L8 16M16 8l-2.5 2.5" strokeLinecap="round" />
			</svg>
		</div>
	);
}

function PhoneArt({ className }: { className?: string }) {
	return (
		<div className={['pointer-events-none flex items-center justify-center', className].filter(Boolean).join(' ')} aria-hidden>
			<div className="relative h-28 w-[4.5rem] rounded-[1.1rem] border border-violet-400/30 bg-black/50 shadow-[0_0_32px_rgba(139,92,246,0.25)]">
				<div className="absolute inset-2 rounded-lg bg-gradient-to-b from-violet-900/80 to-black" />
				<div className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-md bg-violet-500/40 ring-1 ring-violet-300/40" />
			</div>
		</div>
	);
}

function NewsFeaturedCard({ item, onOpen }: { item: NewsItem; onOpen: (id: string) => void }) {
	return (
		<button
			type="button"
			id={`news-${item.id}`}
			onClick={() => onOpen(item.id)}
			className="vex-no-drag group relative flex min-h-[300px] w-full flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-black/35 text-left shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-md transition duration-300 hover:border-violet-400/25 hover:shadow-[0_0_40px_rgba(124,58,237,0.2),0_28px_90px_rgba(0,0,0,0.6)] md:min-h-[340px]"
		>
			<div className={`pointer-events-none absolute inset-0 ${coverClass(item.cover)}`} />
			{item.cover === 'tools' ? <WrenchCrossArt className="absolute inset-0" /> : null}
			<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/75 via-45% to-transparent to-78%" />
			<div className="relative flex flex-1 flex-col justify-end p-6 md:p-8">
				<span className={['mb-3 inline-flex w-fit rounded-full', pillClasses(item.pill)].join(' ')}>{item.pill}</span>
				<h2 className="text-[clamp(1.35rem,3.2vw,1.85rem)] font-extrabold leading-tight tracking-tight text-white">{item.title}</h2>
				<p className="mt-2 max-w-[40rem] text-[14px] leading-relaxed text-white/72 md:text-[15px]">{item.description}</p>
				<div className="mt-4 flex items-center justify-between gap-3">
					<span className="text-[12px] font-medium text-white/45">{formatNewsDate(item.date)}</span>
					<span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white/80 shadow-[0_0_20px_rgba(0,0,0,0.4)] transition group-hover:border-violet-400/40 group-hover:text-white group-hover:shadow-[0_0_24px_rgba(139,92,246,0.35)]">
						<IconArrowOut />
					</span>
				</div>
			</div>
		</button>
	);
}

function NewsCompactCard({ item, onOpen }: { item: NewsItem; onOpen: (id: string) => void }) {
	return (
		<button
			type="button"
			id={`news-${item.id}`}
			onClick={() => onOpen(item.id)}
			className="vex-no-drag group relative flex min-h-[158px] flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-black/35 text-left shadow-[0_18px_55px_rgba(0,0,0,0.5)] backdrop-blur-md transition duration-300 hover:border-violet-400/22 hover:shadow-[0_0_32px_rgba(124,58,237,0.16)] md:min-h-[168px]"
		>
			<div className={`pointer-events-none absolute inset-0 ${coverClass(item.cover)}`} />
			{item.cover === 'mobile' ? <PhoneArt className="absolute right-4 top-1/2 -translate-y-1/2 opacity-90" /> : null}
			<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/55 to-transparent to-65%" />
			<div className="relative flex flex-1 flex-col justify-end p-4 md:p-5">
				<span className={['mb-2 inline-flex w-fit rounded-full px-2.5 py-0.5 text-[9px] font-bold', pillClasses(item.pill)].join(' ')}>{item.pill}</span>
				<h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-white md:text-[16px]">{item.title}</h3>
				<div className="mt-2 flex items-center justify-between gap-2">
					<span className="text-[11px] text-white/40">{formatNewsDate(item.date)}</span>
					<span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-black/35 text-white/75 transition group-hover:border-violet-400/35">
						<IconArrowOut className="scale-90" />
					</span>
				</div>
			</div>
		</button>
	);
}

function NewsRowCard({ item, onOpen }: { item: NewsItem; onOpen: (id: string) => void }) {
	return (
		<button
			type="button"
			id={`news-${item.id}`}
			onClick={() => onOpen(item.id)}
			className="vex-no-drag group relative flex min-h-[200px] flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-black/35 text-left shadow-[0_18px_55px_rgba(0,0,0,0.48)] backdrop-blur-md transition duration-300 hover:border-violet-400/22 hover:shadow-[0_0_28px_rgba(124,58,237,0.14)]"
		>
			<div className={`pointer-events-none absolute inset-0 ${coverClass(item.cover)}`} />
			{item.cover === 'tools' ? <WrenchCrossArt className="absolute inset-0 scale-75 opacity-60" /> : null}
			{item.cover === 'mobile' ? <PhoneArt className="absolute right-3 top-4 scale-90 opacity-95" /> : null}
			<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/5 to-transparent to-55%" />
			<div className="relative flex flex-1 flex-col p-5">
				<span className={['mb-2 inline-flex w-fit rounded-full px-2.5 py-0.5 text-[9px] font-bold', pillClasses(item.pill)].join(' ')}>{item.pill}</span>
				<h3 className="line-clamp-2 text-[16px] font-bold leading-snug text-white">{item.title}</h3>
				<p className="mt-2 line-clamp-2 flex-1 text-[13px] leading-relaxed text-white/62">{item.description}</p>
				<div className="mt-3 flex items-center justify-between">
					<span className="text-[11px] text-white/42">{formatNewsDate(item.date)}</span>
					<span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-black/40 text-white/75 transition group-hover:border-violet-400/35">
						<IconArrowOut className="scale-90" />
					</span>
				</div>
			</div>
		</button>
	);
}

export function NewsPage() {
	const nav = useNavigate();
	const [params] = useSearchParams();
	const highlightId = String(params.get('id') ?? '').trim();
	const [filter, setFilter] = useState<FilterKey>('all');
	const [search, setSearch] = useState('');

	const openExternal = useCallback(async (url: string) => {
		try {
			await window.vexLauncher?.openExternal(url);
		} catch {
			window.open(url, '_blank', 'noopener,noreferrer');
		}
	}, []);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		return NEWS_FEED.filter((n) => newsMatchesBucket(n, filter)).filter((n) => {
			if (!q) return true;
			return `${n.title} ${n.description}`.toLowerCase().includes(q);
		});
	}, [filter, search]);

	const featured = filtered[0];
	const secondary = filtered.slice(1, 3);
	const tertiary = filtered.slice(3, 6);

	const onOpen = useCallback(
		(id: string) => {
			void nav(`/news?id=${encodeURIComponent(id)}`);
		},
		[nav]
	);

	useEffect(() => {
		if (!highlightId) return;
		const exists = Boolean(newsById(highlightId));
		if (!exists) return;
		const el = document.getElementById(`news-${highlightId}`);
		if (!el) return;
		el.scrollIntoView({ block: 'center', behavior: 'smooth' });
	}, [highlightId, filtered]);

	const hinted = useMemo(() => (highlightId ? newsById(highlightId) : undefined), [highlightId]);

	return (
		<div className="vex-no-drag flex min-h-screen flex-col bg-[#050505] text-white">
			<LauncherMainNavBar notificationDot />

			<div className="relative flex min-h-0 flex-1 flex-col">
				<div className="pointer-events-none absolute inset-0 overflow-hidden">
					<HomeHeroSpaceBackdrop />
				</div>
				<div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#050505]/65 via-transparent to-[#050505]/90" />

				<div className="relative z-10 flex min-h-0 flex-1 flex-col gap-6 px-4 py-6 md:flex-row md:gap-8 md:px-8 md:py-8">
					{/* Filters sidebar */}
					<aside className="pointer-events-auto flex w-full shrink-0 flex-col rounded-2xl border border-white/[0.08] bg-black/45 p-3 shadow-[0_20px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl md:w-[240px] lg:w-[260px]">
						<nav aria-label="News categories" className="flex flex-col gap-1">
							{SIDEBAR.map((row) => {
								const active = filter === row.key;
								return (
									<button
										key={row.key}
										type="button"
										onClick={() => setFilter(row.key)}
										className={[
											'flex items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-semibold transition',
											active
												? 'border border-violet-500/30 bg-violet-600/20 text-white shadow-[inset_3px_0_0_#a855f7,0_0_24px_rgba(124,58,237,0.15)]'
												: 'border border-transparent text-white/55 hover:bg-white/[0.05] hover:text-white/85',
										].join(' ')}
									>
										<FilterIcon kind={row.icon} />
										{row.label}
									</button>
								);
							})}
						</nav>
						<div className="mt-6 flex flex-wrap justify-center gap-2 border-t border-white/[0.06] pt-5">
							<button
								type="button"
								onClick={() => void openExternal('https://discord.com')}
								className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-black/40 text-white/70 transition hover:border-violet-400/40 hover:text-white"
								aria-label="Discord"
							>
								<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
									<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.876 19.876 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
								</svg>
							</button>
							<button
								type="button"
								onClick={() => void openExternal('https://x.com')}
								className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-black/40 text-white/70 transition hover:border-violet-400/40 hover:text-white"
								aria-label="X"
							>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
									<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
								</svg>
							</button>
							<button
								type="button"
								onClick={() => void openExternal('https://youtube.com')}
								className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-black/40 text-white/70 transition hover:border-violet-400/40 hover:text-white"
								aria-label="YouTube"
							>
								<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
									<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
								</svg>
							</button>
							<button
								type="button"
								onClick={() => void openExternal(EXTERNAL.website)}
								className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-black/40 text-white/70 transition hover:border-violet-400/40 hover:text-white"
								aria-label="Website"
							>
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
									<circle cx="12" cy="12" r="10" />
									<path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
								</svg>
							</button>
						</div>
						<p className="mt-auto pt-6 text-center text-[10px] font-semibold uppercase tracking-wider text-white/35">VEX CLIENT {LAUNCHER_VERSION}</p>
					</aside>

					{/* Main feed */}
					<main className="vex-app-scroll pointer-events-auto flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto pb-10">
						<div className="flex flex-col gap-4 border-b border-white/[0.06] pb-6 md:flex-row md:items-end md:justify-between">
							<div>
								<h1 className="text-2xl font-black tracking-tight text-white md:text-[1.65rem]">LATEST NEWS</h1>
								<p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-white/52 md:text-[14px]">
									Stay up to date with everything happening in Vex Client.
								</p>
							</div>
							<div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center md:w-auto">
								<input
									type="search"
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder="Search news…"
									className="h-11 w-full rounded-xl border border-white/[0.1] bg-black/40 px-4 text-[13px] text-white placeholder:text-white/35 outline-none ring-violet-500/30 transition focus:border-violet-400/40 focus:ring-2 sm:min-w-[220px] md:w-56"
								/>
								<select
									value={filter}
									onChange={(e) => setFilter(e.target.value as FilterKey)}
									className="h-11 w-full cursor-pointer rounded-xl border border-white/[0.1] bg-black/40 px-4 text-[13px] text-white outline-none ring-violet-500/30 transition focus:border-violet-400/40 focus:ring-2 sm:w-48"
									aria-label="Category"
								>
									<option value="all">All categories</option>
									<option value="updates">Updates</option>
									<option value="events">Events</option>
									<option value="announcements">Announcements</option>
									<option value="maintenance">Maintenance</option>
								</select>
							</div>
						</div>

						{hinted ? (
							<div className="mt-4 rounded-xl border border-violet-500/25 bg-violet-950/25 px-4 py-3 text-[13px] text-white/80 shadow-[0_0_28px_rgba(124,58,237,0.12)]">
								<span className="font-semibold text-violet-200">Highlighted: </span>
								{hinted.title}
							</div>
						) : null}

						{!featured ? (
							<div className="mt-16 rounded-2xl border border-white/[0.08] bg-black/40 px-6 py-16 text-center text-[14px] text-white/55 backdrop-blur-md">
								No articles match your filters. Try <button type="button" className="text-violet-300 underline-offset-2 hover:underline" onClick={() => { setFilter('all'); setSearch(''); }}>clearing filters</button>.
							</div>
						) : (
							<div className="mt-6 flex flex-col gap-5">
								<div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.42fr)] lg:items-stretch">
									<NewsFeaturedCard item={featured} onOpen={onOpen} />
									<div className="flex flex-col gap-5">
										{secondary[0] ? <NewsCompactCard item={secondary[0]} onOpen={onOpen} /> : <div className="hidden lg:block" />}
										{secondary[1] ? <NewsCompactCard item={secondary[1]} onOpen={onOpen} /> : null}
									</div>
								</div>
								{tertiary.length > 0 ? (
									<div className="grid grid-cols-1 gap-5 md:grid-cols-3">{tertiary.map((n) => <NewsRowCard key={n.id} item={n} onOpen={onOpen} />)}</div>
								) : null}
							</div>
						)}

						<p className="mt-10 rounded-2xl border border-white/[0.07] bg-black/40 px-5 py-4 text-[12px] leading-relaxed text-white/50 backdrop-blur-md">
							<span className="font-semibold text-white/75">Note:</span> This feed ships with the launcher for now. Later it can load from a remote endpoint without changing this layout.
						</p>
					</main>
				</div>
			</div>
		</div>
	);
}
