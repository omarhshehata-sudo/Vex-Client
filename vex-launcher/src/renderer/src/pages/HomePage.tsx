import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { MinecraftSkinAvatar } from '../components/account/MinecraftSkinAvatar';
import { HomeHeroSpaceBackdrop } from '../components/home/HomeHeroSpaceBackdrop';
import { LauncherMainNavBar } from '../components/layout/LauncherMainNavBar';
import { LatestUpdatePreview } from '../components/news/LatestUpdatePreview';
import { VersionProfileChoiceDialog } from '../components/profiles/VersionProfileChoiceDialog';
import { Button } from '../components/ui/Button';
import { useStatus } from '../hooks/useStatus';
import { ConsoleService } from '../services/ConsoleService';
import { friendlyErrorMessage } from '../services/friendlyError';
import { JavaService } from '../services/JavaService';
import { LauncherService } from '../services/LauncherService';
import { ProfilesService } from '../services/ProfilesService';
import { StatusService, type StatusState } from '../services/StatusService';
import { NEWS_FEED } from '../services/newsService';
import { EXTERNAL } from '../services/linkConstants';
import { ToastService } from '../services/ToastService';
import type { ReactNode } from 'react';
import type { LaunchStatusEvent } from '../vite-env';
import { useLauncherStore } from '../state/launcherStore';

const CAROUSEL_VERSIONS = ['1.20.4', '1.21.1', '1.20.1', '1.19.4', '1.18.2'] as const;

function formatNewsDateShort(iso?: string): string {
	const d = String(iso ?? '').trim();
	if (!d) return '';
	const t = Date.parse(`${d}T12:00:00`);
	if (!Number.isFinite(t)) return d;
	return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(t);
}

function newsAccent(tag: string): string {
	switch (tag) {
		case 'update':
			return 'from-violet-500/30 to-fuchsia-500/10';
		case 'patch':
			return 'from-sky-500/25 to-blue-500/10';
		default:
			return 'from-violet-500/25 to-indigo-500/10';
	}
}

function formatLastPlayed(epochSec: number | null | undefined): string {
	if (epochSec == null || !Number.isFinite(epochSec)) return '';
	const d = new Date(epochSec * 1000);
	return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

function IconChevronUp({ className }: { className?: string }) {
	return (
		<svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
			<path d="M18 15l-6-6-6 6" />
		</svg>
	);
}

function IconArrow({ dir }: { dir: 'left' | 'right' }) {
	return (
		<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-white/70" aria-hidden>
			{dir === 'left' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
		</svg>
	);
}

function SocialIcon({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="vex-no-drag flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-black/50 text-white/75 backdrop-blur-md transition hover:border-[#8A2BE2]/55 hover:bg-white/[0.07] hover:text-white hover:shadow-[0_0_20px_rgba(138,43,226,0.25)]"
			aria-label={label}
		>
			{children}
		</button>
	);
}

export function HomePage() {
	const nav = useNavigate();
	const status = useStatus();
	const settings = useLauncherStore((s) => s.settings);
	const installedVersionIds = useLauncherStore((s) => s.installedVersionIds);
	const modCount = useLauncherStore((s) => s.modCount);
	const account = useLauncherStore((s) => s.account);
	const [javaLine, setJavaLine] = useState<string>('Java: detecting…');
	const [versionChoiceId, setVersionChoiceId] = useState<string | null>(null);
	const [playBusy, setPlayBusy] = useState(false);
	const carouselRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		void useLauncherStore.getState().hydrate();
	}, []);

	const refresh = useCallback(async () => {
		await useLauncherStore.getState().hydrate();
	}, []);

	useEffect(() => {
		void (async () => {
			try {
				const javaPath = settings?.javaPath ?? 'java';
				const r = await JavaService.validateJava(javaPath);
				if (!r.ok) {
					setJavaLine('Java: need 21+');
					return;
				}
				const major = r.candidate.major;
				if (major === undefined) {
					setJavaLine('Java: ok');
					return;
				}
				if (major < 21) {
					setJavaLine(`Java ${major} (need 21+)`);
					return;
				}
				setJavaLine('Java: ready');
			} catch {
				setJavaLine('Java: missing');
			}
		})();
	}, [settings?.javaPath]);

	const selectedVersion = settings?.selectedVersionId?.trim() ? settings.selectedVersionId : null;
	/** Scroll carousel into view for pending pick or saved version. */
	const carouselScrollToId = versionChoiceId ?? selectedVersion;
	const hasSelectedVersion = Boolean(selectedVersion);
	const javaOk = String(javaLine).includes('ready') || String(javaLine).includes('ok');
	const isReady = !playBusy && hasSelectedVersion && javaOk && (status.state === 'idle' || status.state === 'checking');

	const displayVersions = useMemo(() => {
		const set = new Set<string>([...CAROUSEL_VERSIONS, ...installedVersionIds]);
		if (selectedVersion) set.add(selectedVersion);
		return Array.from(set);
	}, [installedVersionIds, selectedVersion]);

	useEffect(() => {
		const id = carouselScrollToId;
		if (!id || !carouselRef.current) return;
		const safe = id.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
		const el = carouselRef.current.querySelector(`[data-version="${safe}"]`);
		el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
	}, [carouselScrollToId, displayVersions]);

	const appendConsole = useCallback((line: string) => {
		const s = String(line ?? '');
		if (s.trim().length === 0) return;
		if (s.toLowerCase().startsWith('error:') || s.toLowerCase().startsWith('[error]')) {
			ConsoleService.log(s.replace(/^\[error\]\s*/i, '').replace(/^error:\s*/i, ''), 'error');
			return;
		}
		if (s.toLowerCase().startsWith('[warn]')) {
			ConsoleService.log(s.replace(/^\[warn\]\s*/i, ''), 'warn');
			return;
		}
		if (s.toLowerCase().startsWith('[success]')) {
			ConsoleService.log(s.replace(/^\[success\]\s*/i, ''), 'success');
			return;
		}
		ConsoleService.log(s.replace(/^\[info\]\s*/i, ''), 'info');
	}, []);

	const setGlobal = useCallback((state: StatusState, text: string, pct?: number) => {
		StatusService.setState(state, text);
		if (pct !== undefined) StatusService.setProgressTarget(pct);
	}, []);

	const saveSelectedVersion = useCallback((id: string) => {
		setVersionChoiceId(id);
	}, []);

	const scrollCarousel = useCallback((dir: -1 | 1) => {
		// Measure after layout so scrollWidth/clientWidth reflect the constrained grid track.
		requestAnimationFrame(() => {
			const track = carouselRef.current;
			if (!track) return;
			const buttons = [...track.querySelectorAll<HTMLButtonElement>('[data-version]')];
			if (buttons.length === 0) return;
			const gap = 16; // gap-4 between tiles
			const tileW = buttons[0].getBoundingClientRect().width;
			const stride = (Number.isFinite(tileW) && tileW > 0 ? tileW : 148) + gap;
			const max = track.scrollWidth - track.clientWidth;
			if (max <= 0) return;
			const next = Math.min(max, Math.max(0, track.scrollLeft + dir * stride));
			track.scrollTo({ left: next, behavior: 'smooth' });
		});
	}, []);

	const onHomePlay = useCallback(async () => {
		setGlobal('checking', 'Checking Java…', 5);
		setPlayBusy(true);
		ConsoleService.clear();
		try {
			window.vexLauncher?.launchConsoleOff();
			window.vexLauncher?.launchConsoleOn((line) => appendConsole(line));
			window.vexLauncher?.launchStatusOff();
			window.vexLauncher?.launchStatusOn((ev: LaunchStatusEvent) => {
				const phaseText = ev.phase || 'Working…';
				let st: StatusState = 'checking';
				if (phaseText.toLowerCase().includes('download')) st = 'downloading';
				if (phaseText.toLowerCase().includes('launch')) st = 'launching';
				StatusService.setState(st, phaseText);
				if (typeof ev.percent === 'number' && Number.isFinite(ev.percent)) {
					StatusService.setProgressTarget(Math.round(Math.max(0, Math.min(1, ev.percent)) * 100));
				}
				if (ev.detail) appendConsole(`[INFO] ${ev.detail}`);
			});
			const result = await LauncherService.runPlaySequence((s) => appendConsole(`[INFO] ${s}`));
			if (!result.ok) {
				ToastService.push({
					type: 'error',
					title: result.title,
					message: friendlyErrorMessage(result.detail) ?? result.detail,
				});
				return;
			}
			ToastService.push({ type: 'success', title: 'Launch started', message: result.launch.message });
			await useLauncherStore.getState().hydrate();
		} catch (e) {
			ToastService.push({ type: 'error', title: 'Launch failed', message: e instanceof Error ? e.message : String(e) });
		} finally {
			setPlayBusy(false);
			StatusService.reset();
		}
	}, [appendConsole, setGlobal]);

	const openExternal = async (url: string) => {
		try {
			await window.vexLauncher?.openExternal(url);
		} catch {
			window.open(url, '_blank', 'noopener,noreferrer');
		}
	};

	const lastPlayedLabel = settings?.lastPlayedVersionId?.trim() ? settings.lastPlayedVersionId : null;
	const lastPlayedWhen = formatLastPlayed(settings?.lastPlayedAtEpochSec ?? null);

	return (
		<div className="vex-no-drag relative flex min-h-screen flex-col bg-[#050505] text-white">
			<LauncherMainNavBar />

			<div className="relative flex min-h-0 flex-1">
				{/* Left social rail */}
				<aside className="pointer-events-auto absolute left-4 top-28 z-30 hidden flex-col items-center gap-4 lg:flex">
					<div className="rounded-2xl border border-white/[0.08] bg-black/50 px-3 py-3 text-center shadow-[0_16px_48px_rgba(0,0,0,0.55)] backdrop-blur-xl">
						{account?.signedIn ? (
							<>
								<div className="mx-auto flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-600/40 to-fuchsia-600/20 ring-1 ring-white/10">
									<MinecraftSkinAvatar
										uuid={account.uuid}
										size={64}
										className="h-10 w-10 rounded-full object-cover"
										fallback={<span className="text-[11px] font-bold text-white/70">{(account.username ?? '?').slice(0, 1).toUpperCase()}</span>}
									/>
								</div>
								<div className="mt-2 max-w-[112px] truncate text-[11px] font-bold text-white/90" title={account.username}>
									{account.username ?? 'Player'}
								</div>
								<div className="mt-0.5 flex items-center justify-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-white/45">
									<span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.75)]" />
									Signed in
								</div>
							</>
						) : (
							<>
								<div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-white/70">
									<span className="h-2 w-2 rounded-full bg-zinc-500" />
									Offline
								</div>
								<div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/45">Account</div>
							</>
						)}
					</div>
					<div className="flex flex-col gap-2">
						<SocialIcon label="Discord" onClick={() => void openExternal('https://discord.com')}>
							<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
								<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.876 19.876 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
							</svg>
						</SocialIcon>
						<SocialIcon label="X" onClick={() => void openExternal('https://x.com')}>
							<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
								<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
							</svg>
						</SocialIcon>
						<SocialIcon label="YouTube" onClick={() => void openExternal('https://youtube.com')}>
							<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
								<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
							</svg>
						</SocialIcon>
						<SocialIcon label="Website" onClick={() => void openExternal(EXTERNAL.website)}>
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
								<circle cx="12" cy="12" r="10" />
								<path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
							</svg>
						</SocialIcon>
					</div>
				</aside>

				<main className="relative flex min-w-0 flex-1 flex-col">
					{/* Hero */}
					<section className="relative flex min-h-[min(72vh,640px)] min-w-0 flex-1 flex-col items-center justify-center overflow-hidden px-4 pt-6 pb-10 md:px-10">
						<HomeHeroSpaceBackdrop />

						<div className="relative z-10 flex min-w-0 w-full max-w-[1100px] flex-col items-center text-center">
							<div
								className="pointer-events-none select-none text-[clamp(1.75rem,6vw,2.75rem)] font-black leading-tight tracking-tight text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.55)]"
								aria-hidden
							>
								{account?.signedIn && account.username?.trim()
									? `Hi, ${account.username.trim()}`
									: 'Welcome to VEX'}
							</div>
							<div className="mt-3 text-[11px] font-bold uppercase tracking-[0.42em] text-white/45">
								{isReady ? 'READY TO LAUNCH' : playBusy ? 'LAUNCHING…' : 'PREPARING…'}
							</div>

							<button
								type="button"
								disabled={!hasSelectedVersion || playBusy}
								onClick={() => void onHomePlay()}
								className="vex-no-drag mt-9 inline-flex min-w-[240px] items-center justify-center gap-3 rounded-[14px] bg-gradient-to-r from-[#6B21A8] via-[#7C3AED] to-[#8B5CF6] px-12 py-[18px] text-[20px] font-bold text-white shadow-[0_0_56px_rgba(124,58,237,0.5),0_12px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.18)] ring-1 ring-[#A78BFA]/35 transition hover:brightness-[1.08] hover:shadow-[0_0_64px_rgba(138,43,226,0.55)] active:scale-[0.992] disabled:cursor-not-allowed disabled:opacity-45"
							>
								<span className="font-mono tracking-tight">{selectedVersion ?? 'Pick version'}</span>
								<IconChevronUp className="opacity-95" />
							</button>
							<div className="mt-3 flex items-center justify-center gap-2 text-[12px] font-semibold text-white/50">
								<span className="text-[#A78BFA]">✦</span>
								Latest release
							</div>

							{/* Version carousel: arrows + track share one vertical centerline; snap scroll; violet = pending pick, emerald + violet glow = saved active version. */}
							<div className="pointer-events-auto relative z-20 mx-auto mt-12 flex w-full max-w-[min(100%,40rem)] items-center justify-center gap-3 md:gap-4">
								<button
									type="button"
									className="vex-no-drag vex-press flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-full border border-white/10 bg-black/40 backdrop-blur-md transition duration-150 vex-ease hover:border-violet-400/40 hover:bg-white/[0.06]"
									aria-label="Previous version"
									onClick={() => scrollCarousel(-1)}
								>
									<IconArrow dir="left" />
								</button>
								<div
									ref={carouselRef}
									className="vex-app-scroll vex-no-drag flex h-[112px] min-w-0 flex-1 items-center gap-4 overflow-x-auto overscroll-x-contain scroll-px-3 snap-x snap-mandatory px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
								>
									{displayVersions.map((id) => {
										const inUse = Boolean(selectedVersion && id === selectedVersion);
										const choosing = Boolean(versionChoiceId && id === versionChoiceId);
										const muted = hasSelectedVersion && !inUse && !choosing;
										const tileClass = (() => {
											if (choosing) {
												return [
													'z-[2] border-[#C4B5FD] bg-gradient-to-b from-[#6D28D9]/55 via-violet-950/60 to-black/75 text-white',
													'shadow-[0_0_0_2px_rgba(167,139,250,0.55),0_0_52px_rgba(139,92,246,0.55),inset_0_1px_0_rgba(255,255,255,0.14)]',
													inUse ? 'ring-2 ring-emerald-400/70 ring-offset-2 ring-offset-[#050505]' : '',
												].join(' ');
											}
											if (inUse) {
												return [
													'z-[2] border-emerald-400/70 bg-gradient-to-b from-emerald-900/45 via-[#0c4c3e]/55 to-black/80 text-emerald-50',
													'shadow-[0_0_0_2px_rgba(52,211,153,0.55),0_0_40px_rgba(52,211,153,0.35),0_0_56px_rgba(124,92,255,0.22),inset_0_1px_0_rgba(255,255,255,0.1)]',
													'scale-[1.06]',
												].join(' ');
											}
											return [
												'z-0 border-white/[0.08] bg-black/45 text-white/70 backdrop-blur-sm',
												'hover:z-[1] hover:border-white/[0.2] hover:bg-white/[0.08] hover:text-white',
												muted ? 'opacity-[0.72] scale-[0.97]' : '',
											].join(' ');
										})();
										return (
											<button
												key={id}
												type="button"
												data-version={id}
												data-active={inUse ? 'true' : 'false'}
												aria-current={inUse ? 'true' : undefined}
												aria-pressed={choosing ? 'true' : undefined}
												onClick={() => saveSelectedVersion(id)}
												className={[
													'vex-no-drag snap-center snap-always',
													'flex h-[104px] w-[148px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-[16px] border px-4 text-center',
													'font-mono text-[17px] font-bold leading-tight tracking-tight transition-[transform,box-shadow,opacity,border-color] duration-200 vex-ease',
													tileClass,
												].join(' ')}
											>
												<span className="max-w-full truncate">{id}</span>
												{choosing ? (
													<span className="text-[9px] font-bold uppercase tracking-[0.2em] text-violet-100/95">Choosing</span>
												) : inUse ? (
													<span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-200/95">
														<span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" aria-hidden />
														Active
													</span>
												) : null}
											</button>
										);
									})}
								</div>
								<button
									type="button"
									className="vex-no-drag vex-press flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-full border border-white/10 bg-black/40 backdrop-blur-md transition duration-150 vex-ease hover:border-violet-400/40 hover:bg-white/[0.06]"
									aria-label="Next version"
									onClick={() => scrollCarousel(1)}
								>
									<IconArrow dir="right" />
								</button>
							</div>

							<div className="mt-6 max-w-lg text-[12px] leading-relaxed text-white/45">
								<span className="font-semibold text-white/70">{settings?.profileName ?? 'Profile'}</span>
								{' · '}
								{settings?.selectedModLoader ?? '—'} · {modCount} mods
								{lastPlayedLabel ? (
									<>
										{' · '}
										Last: {lastPlayedLabel}
										{lastPlayedWhen ? ` (${lastPlayedWhen})` : ''}
									</>
								) : null}
							</div>
						</div>
					</section>

					{/* Bottom grid */}
					<section className="relative z-10 border-t border-white/[0.06] bg-[#0B0B0F]/98 px-4 py-10 backdrop-blur-2xl md:px-10 lg:pl-24">
						<div className="mx-auto grid max-w-[1400px] gap-8 lg:grid-cols-[1.15fr_0.85fr_0.85fr]">
							{/* News */}
							<div>
								<div className="mb-4 flex items-end justify-between gap-3">
									<div className="text-[11px] font-bold uppercase tracking-[0.32em] text-white/38">Latest news</div>
									<button type="button" onClick={() => nav('/news')} className="vex-no-drag text-[11px] font-bold uppercase tracking-[0.2em] text-[#A78BFA] hover:text-violet-200">
										View All
									</button>
								</div>
								<div className="flex flex-col gap-3">
									{NEWS_FEED.slice(0, 3).map((n) => (
										<button
											key={n.id}
											type="button"
											onClick={() => nav(`/news?id=${encodeURIComponent(n.id)}`)}
											className="vex-no-drag flex gap-4 rounded-[16px] border border-white/[0.06] bg-[#12121A]/90 p-3.5 text-left shadow-[0_12px_40px_rgba(0,0,0,0.35)] transition hover:border-[#8A2BE2]/35 hover:bg-white/[0.04]"
										>
											<div className={`h-[72px] w-[100px] shrink-0 rounded-xl bg-gradient-to-br ${newsAccent(n.tag)} ring-1 ring-white/10`} />
											<div className="min-w-0">
												<div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#C4B5FD]">{n.pill}</div>
												<div className="truncate text-[14px] font-bold text-white">{n.title}</div>
												<div className="mt-1 line-clamp-2 text-[11px] text-white/50">{n.description}</div>
												<div className="mt-2 text-[10px] font-semibold text-white/35">{formatNewsDateShort(n.date)}</div>
											</div>
										</button>
									))}
								</div>
							</div>

							{/* Friends */}
							<div>
								<div className="mb-4 flex items-end justify-between gap-3">
									<div className="text-[11px] font-bold uppercase tracking-[0.32em] text-white/38">Friends</div>
									<button
										type="button"
										onClick={() => ToastService.push({ type: 'info', title: 'Friends', message: 'Coming soon.' })}
										className="vex-no-drag text-[11px] font-bold uppercase tracking-[0.2em] text-[#A78BFA] hover:text-violet-200"
									>
										View All
									</button>
								</div>
								<div className="rounded-[16px] border border-white/[0.06] bg-[#12121A]/90 p-2 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
									{account?.signedIn ? (
										<div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
											<div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-violet-600/40 to-fuchsia-600/20 ring-1 ring-white/10">
												<MinecraftSkinAvatar
													uuid={account.uuid}
													size={64}
													className="h-10 w-10 object-cover"
													fallback={<span className="flex h-full w-full items-center justify-center text-[12px] font-bold text-white/70">{(account.username ?? '?').slice(0, 1).toUpperCase()}</span>}
												/>
												<span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0c0c0f]" />
											</div>
											<div className="min-w-0 flex-1">
												<div className="truncate text-[13px] font-bold text-white">{account.username ?? 'Player'}</div>
												<div className="truncate text-[11px] text-white/45">Your Minecraft profile</div>
											</div>
										</div>
									) : (
										<div className="px-3 py-4 text-center text-[12px] leading-relaxed text-white/50">
											Sign in with Microsoft to link your profile here. Friends list support will follow in a later build.
										</div>
									)}
								</div>
							</div>

							{/* Quick actions */}
							<div>
								<div className="mb-4 text-[11px] font-bold uppercase tracking-[0.32em] text-white/38">Library</div>
								<div className="flex flex-col gap-2.5">
									{[
										{
											label: 'LAUNCH OPTIONS',
											sub: 'Profiles & Java',
											to: '/profiles',
											node: (
												<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className="text-violet-200" aria-hidden>
													<path d="M12 3l7 12H5L12 3z" />
													<path d="M12 10v6M9 14h6" />
												</svg>
											),
										},
										{
											label: 'MODS',
											sub: 'Browse & install',
											to: '/mods',
											node: (
												<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-200" aria-hidden>
													<path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
												</svg>
											),
										},
										{
											label: 'RESOURCE PACKS',
											sub: 'Coming soon',
											to: '#',
											soon: true,
											node: (
												<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-200/80" aria-hidden>
													<path d="M12 3l9 4.5v9L12 21l-9-4.5v-9L12 3z" />
													<path d="M12 12l9-4.5M12 12v9M12 12L3 7.5" />
												</svg>
											),
										},
										{
											label: 'SHADER PACKS',
											sub: 'Coming soon',
											to: '#',
											soon: true,
											node: (
												<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-200/80" aria-hidden>
													<circle cx="12" cy="12" r="4" />
													<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
												</svg>
											),
										},
									].map((a) => (
										<button
											key={a.label}
											type="button"
											onClick={() => {
												if (a.soon) ToastService.push({ type: 'info', title: a.label, message: 'Coming soon.' });
												else nav(a.to);
											}}
											className="vex-no-drag flex items-center gap-4 rounded-[14px] border border-white/[0.06] bg-[#12121A]/90 px-4 py-3.5 text-left shadow-[0_8px_28px_rgba(0,0,0,0.28)] transition hover:border-[#8A2BE2]/40 hover:bg-white/[0.04]"
										>
											<span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#8A2BE2]/12 ring-1 ring-[#8A2BE2]/25">{a.node}</span>
											<div>
												<div className="text-[11px] font-bold tracking-[0.18em] text-white">{a.label}</div>
												<div className="mt-1 text-[11px] text-white/38">{a.sub}</div>
											</div>
										</button>
									))}
								</div>
								{settings?.newsHighlights !== false ? (
									<div className="mt-6 hidden sm:block">
										<LatestUpdatePreview />
									</div>
								) : null}
							</div>
						</div>
					</section>

					{/* Session / version strip (replaces decorative “now playing”) */}
					<div className="pointer-events-none absolute bottom-6 left-4 z-20 md:left-8 lg:left-24">
						<div className="pointer-events-auto flex max-w-[320px] items-center gap-3 rounded-[14px] border border-white/[0.08] bg-black/65 px-4 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
							<div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#1B1B23] ring-1 ring-white/10">
								{account?.signedIn ? (
									<MinecraftSkinAvatar
										uuid={account.uuid}
										size={72}
										className="absolute inset-[-10%] h-[120%] w-[120%] max-w-none object-cover object-top [image-rendering:pixelated]"
										fallback={
											<span className="text-[10px] font-bold leading-tight text-violet-200">
												{(account.username ?? '?').slice(0, 1).toUpperCase()}
											</span>
										}
									/>
								) : (
									<span className="max-w-[2.5rem] truncate px-0.5 text-center font-mono text-[10px] font-bold leading-tight text-violet-100">
										{selectedVersion ?? '—'}
									</span>
								)}
							</div>
							<div className="min-w-0 flex-1">
								<div className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">Launcher</div>
								<div className="truncate text-[12px] font-bold text-white">
									{playBusy ? 'Launching…' : selectedVersion ? `Ready · ${settings?.profileName ?? 'Profile'}` : 'Pick a version'}
								</div>
								<div className="mt-1 truncate text-[10px] text-white/45">
									{account?.signedIn ? (account.username ?? 'Signed in') : 'Not signed in'} · {modCount} mods
								</div>
							</div>
						</div>
					</div>
				</main>
			</div>

			<VersionProfileChoiceDialog
				open={Boolean(versionChoiceId)}
				versionId={versionChoiceId}
				onClose={() => setVersionChoiceId(null)}
				onUpdateProfile={async () => {
					const id = versionChoiceId;
					if (!id) return;
					try {
						await useLauncherStore.getState().saveSettings({ selectedVersionId: id });
						await useLauncherStore.getState().refreshInstalled();
						setVersionChoiceId(null);
						ToastService.push({ type: 'success', title: 'Profile updated', message: `Minecraft ${id}` });
					} catch (e) {
						ToastService.push({ type: 'error', title: 'Update failed', message: e instanceof Error ? e.message : String(e) });
					}
				}}
				onCreateProfile={async () => {
					const id = versionChoiceId;
					if (!id) return;
					try {
						await ProfilesService.create({ name: `Minecraft ${id}`, minecraftVersion: id, loader: 'fabric' });
						await useLauncherStore.getState().hydrate();
						setVersionChoiceId(null);
						ToastService.push({ type: 'success', title: 'Profile created', message: `Switched to Minecraft ${id}` });
					} catch (e) {
						ToastService.push({ type: 'error', title: 'Create failed', message: e instanceof Error ? e.message : String(e) });
					}
				}}
			/>
		</div>
	);
}
