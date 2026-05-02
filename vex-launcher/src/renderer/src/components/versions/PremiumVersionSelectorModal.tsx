import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { MojangManifestService, type MojangManifestVersion } from '../../services/MojangManifestService';
import { VersionFavoritesService } from '../../services/VersionFavoritesService';
import { VersionService } from '../../services/VersionService';
import { Button } from '../ui/Button';

type VersionMeta = {
	id: string;
	name: string;
	type: 'release' | 'snapshot';
	label: string;
	installed: boolean;
	latest?: 'release' | 'snapshot';
	background:
		| 'gradient-purple'
		| 'gradient-indigo'
		| 'gradient-blue'
		| 'gradient-teal'
		| 'gradient-violet'
		| 'gradient-slate'
		| 'gradient-ember';
};

function clamp(n: number, a: number, b: number) {
	return Math.max(a, Math.min(b, n));
}

function bgFor(key: VersionMeta['background']): string {
	// Safe, abstract, grayscale-ish cinematic panels (no copyrighted art).
	// Intentionally uses dark-to-purple gradients + subtle diagonal light.
	const byKey: Record<VersionMeta['background'], string> = {
		'gradient-purple':
			'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 40%), radial-gradient(800px 320px at 20% 30%, rgba(124,92,255,0.22), transparent 60%), radial-gradient(720px 420px at 80% 60%, rgba(255,255,255,0.06), transparent 62%), linear-gradient(180deg, rgba(9,9,14,1), rgba(16,12,24,1))',
		'gradient-indigo':
			'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 46%), radial-gradient(760px 360px at 18% 70%, rgba(124,92,255,0.18), transparent 62%), radial-gradient(720px 420px at 84% 30%, rgba(255,255,255,0.06), transparent 62%), linear-gradient(180deg, rgba(9,9,14,1), rgba(13,10,20,1))',
		'gradient-blue':
			'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 42%), radial-gradient(820px 320px at 30% 35%, rgba(124,92,255,0.16), transparent 60%), radial-gradient(720px 420px at 78% 70%, rgba(255,255,255,0.05), transparent 62%), linear-gradient(180deg, rgba(9,9,14,1), rgba(11,9,18,1))',
		'gradient-teal':
			'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 44%), radial-gradient(740px 340px at 26% 70%, rgba(124,92,255,0.14), transparent 60%), radial-gradient(720px 420px at 82% 32%, rgba(255,255,255,0.05), transparent 62%), linear-gradient(180deg, rgba(9,9,14,1), rgba(10,8,16,1))',
		'gradient-violet':
			'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 45%), radial-gradient(740px 340px at 18% 35%, rgba(124,92,255,0.14), transparent 60%), radial-gradient(720px 420px at 82% 70%, rgba(255,255,255,0.05), transparent 62%), linear-gradient(180deg, rgba(9,9,14,1), rgba(10,8,16,1))',
		'gradient-slate':
			'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 46%), radial-gradient(780px 360px at 24% 40%, rgba(124,92,255,0.12), transparent 62%), radial-gradient(720px 420px at 84% 64%, rgba(255,255,255,0.04), transparent 62%), linear-gradient(180deg, rgba(9,9,14,1), rgba(10,10,16,1))',
		'gradient-ember':
			'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 46%), radial-gradient(780px 360px at 18% 54%, rgba(255,140,80,0.08), transparent 62%), radial-gradient(720px 420px at 82% 40%, rgba(124,92,255,0.10), transparent 62%), linear-gradient(180deg, rgba(9,9,14,1), rgba(12,9,14,1))',
	};
	return byKey[key] ?? byKey['gradient-purple'];
}

function hashTheme(id: string): VersionMeta['background'] {
	const themes: VersionMeta['background'][] = [
		'gradient-purple',
		'gradient-indigo',
		'gradient-blue',
		'gradient-teal',
		'gradient-violet',
		'gradient-slate',
		'gradient-ember',
	];
	let h = 0;
	for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) | 0;
	const idx = Math.abs(h) % themes.length;
	return themes[idx] ?? 'gradient-purple';
}

function toMeta(
	v: MojangManifestVersion,
	installedSet: Set<string>,
	latestReleaseId: string,
	latestSnapshotId: string
): VersionMeta {
	const latest = v.id === latestReleaseId ? 'release' : v.id === latestSnapshotId ? 'snapshot' : undefined;
	return {
		id: v.id,
		name: v.id,
		type: v.type === 'snapshot' ? 'snapshot' : 'release',
		label: v.type === 'snapshot' ? 'Snapshot' : 'Stable',
		installed: installedSet.has(v.id),
		latest,
		background: hashTheme(v.id),
	};
}

const CATALOG_LIMIT = 420;

export function PremiumVersionSelectorModal({
	open,
	value,
	onCancel,
	onSelect,
	defaultShowSnapshots = true,
}: {
	open: boolean;
	value: string | null;
	onCancel: () => void;
	onSelect: (id: string) => void;
	/** When true, the catalog includes snapshots (newest-first with releases). Toggle still available in the UI. */
	defaultShowSnapshots?: boolean;
}) {
	const [manifest, setManifest] = useState<{ versions: MojangManifestVersion[]; latestReleaseId: string; latestSnapshotId: string } | null>(
		null
	);
	const [error, setError] = useState<string | null>(null);
	const [currentIndex, setCurrentIndex] = useState(0);
	const currentIndexRef = useRef(0);
	const [query, setQuery] = useState('');
	const [showSnapshots, setShowSnapshots] = useState(defaultShowSnapshots);
	const [installed, setInstalled] = useState<Set<string>>(new Set());
	const [pinned, setPinned] = useState<Set<string>>(() => VersionFavoritesService.get());
	const [rendered, setRendered] = useState(open);
	const [animOpen, setAnimOpen] = useState(false);
	const carouselRef = useRef<HTMLDivElement>(null);
	const prevQueryRef = useRef<string | null>(null);

	useEffect(() => {
		currentIndexRef.current = currentIndex;
	}, [currentIndex]);

	useEffect(() => {
		if (!open) return;
		setShowSnapshots(defaultShowSnapshots);
	}, [open, defaultShowSnapshots]);

	useEffect(() => {
		if (!open) return;
		void (async () => {
			try {
				const cat = await MojangManifestService.getCatalog({
					limit: CATALOG_LIMIT,
					releasesOnly: !showSnapshots,
				});
				setManifest({ versions: cat.versions, latestReleaseId: cat.latestReleaseId, latestSnapshotId: cat.latestSnapshotId });
				setError(null);
			} catch (e) {
				setManifest(null);
				setError(e instanceof Error ? e.message : String(e));
			}
		})();
		void (async () => {
			// Installed versions (best-effort from main process API).
			try {
				const v = await VersionService.listVersions();
				setInstalled(new Set(v.map((x) => x.id)));
			} catch {
				setInstalled(new Set());
			}
		})();
	}, [open, showSnapshots]);

	useLayoutEffect(() => {
		if (open) setRendered(true);
	}, [open]);

	useEffect(() => {
		if (!open) {
			setAnimOpen(false);
			return;
		}
		let inner = 0;
		const outer = requestAnimationFrame(() => {
			inner = requestAnimationFrame(() => setAnimOpen(true));
		});
		return () => {
			cancelAnimationFrame(outer);
			cancelAnimationFrame(inner);
		};
	}, [open]);

	useEffect(() => {
		if (open || !rendered) return;
		const t = window.setTimeout(() => setRendered(false), 280);
		return () => clearTimeout(t);
	}, [open, rendered]);

	useEffect(() => {
		if (!rendered) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = prev;
		};
	}, [rendered]);

	useEffect(() => {
		if (!rendered) prevQueryRef.current = null;
	}, [rendered]);

	useEffect(() => {
		VersionFavoritesService.set(pinned);
	}, [pinned]);

	const all = useMemo(() => {
		const m = manifest;
		if (!m) return [] as VersionMeta[];
		return m.versions.map((v) => toMeta(v, installed, m.latestReleaseId, m.latestSnapshotId));
	}, [manifest, installed]);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		const list = q ? all.filter((v) => `${v.id} ${v.label}`.toLowerCase().includes(q)) : all;

		// Pinned first, then installed, then rest.
		const pinnedList: VersionMeta[] = [];
		const installedList: VersionMeta[] = [];
		const rest: VersionMeta[] = [];
		for (const v of list) {
			if (pinned.has(v.id)) pinnedList.push(v);
			else if (v.installed) installedList.push(v);
			else rest.push(v);
		}
		return [...pinnedList, ...installedList, ...rest];
	}, [all, query, pinned]);

	// Keep currentIndex stable and set initial selection when modal opens.
	useEffect(() => {
		if (!open) return;
		const list = filtered;
		if (!list.length) return;
		const idx = value ? list.findIndex((v) => v.id === value) : -1;
		setCurrentIndex(idx >= 0 ? idx : 0);
	}, [open, value, filtered]);

	// If search changes, reset to start for predictable behavior.
	useEffect(() => {
		if (!rendered) return;
		if (prevQueryRef.current === null) {
			prevQueryRef.current = query;
			return;
		}
		if (prevQueryRef.current === query) return;
		prevQueryRef.current = query;
		setCurrentIndex(0);
	}, [query, rendered]);

	useEffect(() => {
		if (!rendered) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				onCancel();
				return;
			}
			const ae = document.activeElement;
			const typing =
				ae instanceof HTMLInputElement || ae instanceof HTMLTextAreaElement || (ae instanceof HTMLElement && ae.isContentEditable);
			if (typing && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;

			const list = filtered;
			const len = list.length;
			if (e.key === 'ArrowLeft') {
				e.preventDefault();
				setCurrentIndex((cur) => cur - 1);
			}
			if (e.key === 'ArrowRight') {
				e.preventDefault();
				setCurrentIndex((cur) => cur + 1);
			}
			if (e.key === 'Home' && len) {
				e.preventDefault();
				setCurrentIndex(0);
			}
			if (e.key === 'End' && len) {
				e.preventDefault();
				setCurrentIndex(len - 1);
			}
			if (e.key === 'Enter' && len) {
				e.preventDefault();
				const idx = ((currentIndexRef.current % len) + len) % len;
				const id = list[idx]?.id;
				if (id) onSelect(id);
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [rendered, filtered, onCancel, onSelect]);

	const filteredLen = filtered.length;

	useEffect(() => {
		const el = carouselRef.current;
		if (!el || !rendered || !animOpen) return;
		const onWheel = (e: WheelEvent) => {
			if (filteredLen === 0) return;
			e.preventDefault();
			const dy = e.deltaY + e.deltaX * 0.35;
			if (dy > 10) setCurrentIndex((cur) => cur + 1);
			else if (dy < -10) setCurrentIndex((cur) => cur - 1);
		};
		el.addEventListener('wheel', onWheel, { passive: false });
		return () => el.removeEventListener('wheel', onWheel);
	}, [rendered, animOpen, filteredLen]);

	const activeId = useMemo(() => {
		if (!filtered.length) return null;
		const idx = ((currentIndex % filtered.length) + filtered.length) % filtered.length;
		return filtered[idx]?.id ?? null;
	}, [filtered, currentIndex]);

	if (!rendered) return null;

	const list = filtered;
	const len = list.length;
	const normIndex = len ? ((currentIndex % len) + len) % len : 0;

	const modal = (
		<div
			className={['vex-vsel-root pointer-events-auto fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-5', animOpen ? 'vex-vsel-open' : '']
				.filter(Boolean)
				.join(' ')}
		>
			<button
				type="button"
				aria-label="Close"
				className="vex-vsel-overlay absolute inset-0 z-0 cursor-default bg-black/50"
				onClick={onCancel}
			/>

			<div
				className={[
					'vex-vsel-panel pointer-events-auto relative z-10 flex w-full max-w-[min(860px,92vw)] min-h-[min(520px,calc(100dvh-2.5rem))] max-h-[min(92dvh,900px)] flex-col overflow-hidden rounded-[20px]',
					'border border-white/10 bg-[#0F0F14]/85 shadow-[0_22px_80px_rgba(0,0,0,0.65)] backdrop-blur-2xl',
				].join(' ')}
			>
				<div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.05] via-transparent to-transparent" />

				<div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
					<div className="shrink-0 px-6 pt-5">
						<div className="text-[18px] font-bold tracking-tight text-vex-text">Select Version</div>
						<div className="mt-2 flex flex-wrap items-center gap-2">
							<span className="text-[11px] font-semibold uppercase tracking-wide text-white/45">Catalog</span>
							<div className="inline-flex rounded-[12px] border border-white/10 bg-white/[0.03] p-0.5">
								<button
									type="button"
									onClick={() => setShowSnapshots(false)}
									className={[
										'rounded-[10px] px-3 py-1.5 text-[12px] font-semibold transition duration-200 vex-ease',
										!showSnapshots ? 'bg-white/[0.12] text-white shadow-sm' : 'text-white/55 hover:text-white/75',
									].join(' ')}
								>
									Stable releases
								</button>
								<button
									type="button"
									onClick={() => setShowSnapshots(true)}
									className={[
										'rounded-[10px] px-3 py-1.5 text-[12px] font-semibold transition duration-200 vex-ease',
										showSnapshots ? 'bg-white/[0.12] text-white shadow-sm' : 'text-white/55 hover:text-white/75',
									].join(' ')}
								>
									Releases + snapshots
								</button>
							</div>
						</div>
						<div className="mt-1.5 text-[12px] text-white/55">
							Newest-first from Mojang (up to {CATALOG_LIMIT} rows). Pin favorites so they stay at the front.
						</div>

						<div className="mt-4 flex items-center justify-between gap-3">
							<input
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="Search versions (e.g. 1.21.4, 24w14a)…"
								className={[
									'vex-no-drag h-[38px] w-full rounded-[12px] border border-white/10 bg-white/[0.03] px-4 text-[13px] text-vex-text outline-none',
									'placeholder:text-white/40 focus:border-vex-accent/35 focus:ring-2 focus:ring-vex-accent/20',
								].join(' ')}
								spellCheck={false}
							/>
						</div>

						{error && <div className="mt-3 text-[12px] text-vex-error/90">Could not load Mojang manifest. {error}</div>}
					</div>

					{/* Carousel: flex-1 + vertical center so cards sit in the middle of the dialog, not clipped at the bottom */}
					<div className="relative flex min-h-0 flex-1 flex-col justify-center px-6 py-2">
						<div className="relative mx-auto w-full max-w-[min(760px,90vw)]">
							<button
								type="button"
								aria-label="Previous version"
								onClick={() => setCurrentIndex((cur) => cur - 1)}
								className="vex-press absolute left-0 top-1/2 z-20 -translate-y-1/2 rounded-[14px] border border-white/10 bg-white/[0.06] p-3 text-white/85 shadow-[0_8px_28px_rgba(0,0,0,0.45)] backdrop-blur-md transition duration-200 vex-ease hover:bg-white/[0.1] disabled:opacity-40"
								disabled={!len}
							>
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
									<path d="M15 18l-6-6 6-6" />
								</svg>
							</button>
							<button
								type="button"
								aria-label="Next version"
								onClick={() => setCurrentIndex((cur) => cur + 1)}
								className="vex-press absolute right-0 top-1/2 z-20 -translate-y-1/2 rounded-[14px] border border-white/10 bg-white/[0.06] p-3 text-white/85 shadow-[0_8px_28px_rgba(0,0,0,0.45)] backdrop-blur-md transition duration-200 vex-ease hover:bg-white/[0.1] disabled:opacity-40"
								disabled={!len}
							>
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
									<path d="M9 18l6-6-6-6" />
								</svg>
							</button>

							<div
								ref={carouselRef}
								className="mx-auto h-[min(248px,40dvh)] min-h-[200px] w-full overflow-hidden sm:h-[252px]"
								style={{ perspective: '1200px' }}
							>
								<div className="vex-vsel-carousel-track relative flex h-full w-full items-center justify-center [transform-style:preserve-3d]">
									{len === 0 ? (
										<div className="text-[12px] text-white/60">
											{manifest ? 'No versions match your search.' : 'Loading versions…'}
										</div>
									) : (
										[-3, -2, -1, 0, 1, 2, 3].map((offset) => {
											const i = (normIndex + offset + len) % len;
											const v = list[i];
											const ad = Math.abs(offset);
											const isCenter = offset === 0;
											const scale = isCenter ? 1 : ad === 1 ? 0.84 : ad === 2 ? 0.72 : 0.62;
											const opacity = isCenter ? 1 : ad === 1 ? 0.62 : ad === 2 ? 0.26 : 0.12;
											const rotate = offset === 0 ? 0 : offset < 0 ? 14 : -14;
											const blur = ad >= 2 ? 1.5 : 0;
											const x = offset * 208;
											const isPinned = pinned.has(v.id);

											return (
												<button
													key={`vsel-slot-${offset}`}
													type="button"
													onClick={() => {
														if (isCenter) onSelect(v.id);
														else setCurrentIndex((cur) => cur + offset);
													}}
													className={[
														'group vex-no-drag absolute left-1/2 top-1/2 h-[196px] w-[min(300px,82vw)] max-w-[300px] overflow-hidden rounded-[16px] text-left sm:h-[200px] sm:w-[300px]',
														'border bg-[#14141A]',
														isCenter
															? 'z-10 border-vex-accent/35 shadow-[0_0_0_1px_rgba(124,92,255,0.32),0_0_34px_rgba(124,92,255,0.28)] hover:border-vex-accent/55 hover:shadow-[0_0_0_1px_rgba(124,92,255,0.42),0_0_44px_rgba(124,92,255,0.34)]'
															: 'z-0 border-white/10 shadow-[0_18px_50px_rgba(0,0,0,0.55)] hover:border-white/18 hover:shadow-[0_0_28px_rgba(124,92,255,0.14)]',
														'transition-[transform,opacity,filter,box-shadow,border-color] duration-[480ms] vex-ease',
													].join(' ')}
													style={{
														transform: `translate(calc(-50% + ${x}px), -50%) scale(${scale}) rotateY(${rotate}deg)`,
														opacity,
														filter: `${blur ? `blur(${blur}px)` : ''} saturate(0.85)`,
													}}
												>
													<div aria-hidden className="absolute inset-0" style={{ backgroundImage: bgFor(v.background) }} />
													<div aria-hidden className="absolute inset-0 bg-black/55 transition-opacity duration-300 group-hover:bg-black/48" />
													<div
														aria-hidden
														className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.10),transparent_42%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.06),transparent_46%)] opacity-50 mix-blend-overlay transition-opacity duration-300 group-hover:opacity-70"
													/>

													<div className="relative flex h-full flex-col justify-between p-4 sm:p-5">
														<div className="flex items-center justify-between gap-3">
															<div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[12px] font-semibold tracking-wide text-white/85">
																{v.name}
															</div>
															<div className="flex items-center gap-2">
																<button
																	type="button"
																	aria-label={isPinned ? 'Unpin version' : 'Pin version'}
																	onClick={(e) => {
																		e.stopPropagation();
																		setPinned((prev) => {
																			const next = new Set(prev);
																			if (next.has(v.id)) next.delete(v.id);
																			else next.add(v.id);
																			return next;
																		});
																	}}
																	className={[
																		'vex-no-drag rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-semibold transition duration-200 vex-ease',
																		isPinned ? 'text-[#7C5CFF]' : 'text-white/55 hover:text-white/70',
																	].join(' ')}
																>
																	{isPinned ? 'Pinned' : 'Pin'}
																</button>
																<div className="text-[12px] font-semibold text-white/55">{v.label}</div>
															</div>
														</div>

														<div>
															<div className="text-[18px] font-bold tracking-tight text-white sm:text-[20px]">
																{v.latest === 'release'
																	? 'Latest release'
																	: v.latest === 'snapshot'
																		? 'Latest snapshot'
																		: v.type === 'snapshot'
																			? 'Snapshot'
																			: 'Stable release'}
															</div>
															<div className="mt-1 text-[12px] text-white/70">{v.installed ? 'Installed on disk' : 'Not installed yet'}</div>
														</div>
													</div>
												</button>
											);
										})
									)}
								</div>
							</div>

							<div className="mt-3 flex w-full max-w-[min(420px,88vw)] flex-col items-stretch gap-2 self-center text-[11px] text-white/55">
								<div className="flex items-center justify-between gap-3 tabular-nums">
									<span>
										{len ? normIndex + 1 : 0} / {len}
									</span>
									<span className="truncate font-mono text-[11px] text-white/70" title={list[normIndex]?.id}>
										{list[normIndex]?.id ?? '—'}
									</span>
								</div>
								<button
									type="button"
									aria-label="Scroll catalog position"
									className="group relative h-2 w-full cursor-pointer rounded-full bg-white/10 outline-none ring-vex-accent/0 transition hover:bg-white/[0.14] focus-visible:ring-2"
									disabled={len <= 1}
									onClick={(e) => {
										if (len <= 1) return;
										const r = e.currentTarget.getBoundingClientRect();
										const pad = 12;
										const inner = Math.max(1, r.width - pad * 2);
										const x = clamp(e.clientX - r.left - pad, 0, inner);
										const t = x / inner;
										setCurrentIndex(Math.round(t * (len - 1)));
									}}
								>
									<span
										className={[
											'pointer-events-none absolute top-1/2 h-3 w-3 rounded-full bg-[#7C5CFF] shadow-[0_0_12px_rgba(124,92,255,0.55)] ring-2 ring-white/10 transition group-hover:scale-110',
											len <= 1 ? 'left-1/2 -translate-x-1/2 -translate-y-1/2' : '-translate-y-1/2',
										].join(' ')}
										style={
											len <= 1
												? undefined
												: {
														left: `calc(12px + (100% - 24px) * ${normIndex / Math.max(len - 1, 1)})`,
														transform: 'translate(-50%, -50%)',
													}
										}
									/>
								</button>
							</div>
						</div>
					</div>

					<div className="shrink-0 border-t border-white/10 px-6 pb-5 pt-4">
						<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
							<div className="text-[12px] text-white/55">
								<span className="font-semibold text-white/70">←</span> / <span className="font-semibold text-white/70">→</span> or scroll to browse.{' '}
								<span className="font-semibold text-white/70">Home</span> / <span className="font-semibold text-white/70">End</span> for ends. Click the center card or{' '}
								<span className="font-semibold text-white/70">Enter</span> to select. Click the track above to jump.
							</div>
							<div className="flex items-center gap-2">
								<Button variant="secondary" className="h-[38px] rounded-[12px] px-4 text-[13px]" onClick={onCancel}>
									Cancel
								</Button>
								<Button
									variant="primary"
									className={[
										'h-[38px] rounded-[12px] px-5 text-[13px] transition-shadow duration-300 vex-ease',
										activeId ? 'vex-vsel-select-ready ring-1 ring-vex-accent/40' : '',
									].join(' ')}
									disabled={!activeId}
									onClick={() => activeId && onSelect(activeId)}
								>
									Select Version
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);

	return createPortal(modal, document.body);
}