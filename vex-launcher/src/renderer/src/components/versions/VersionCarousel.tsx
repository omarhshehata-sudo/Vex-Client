import type React from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { VersionService } from '../../services/VersionService';
import type { VersionEntry } from '../../services/types';
import { VersionCarouselCard } from './VersionCarouselCard';

function clamp(n: number, a: number, b: number) {
	return Math.max(a, Math.min(b, n));
}

/** If settings hold a version not in the curated catalog, still show it in the carousel. */
function mergeCatalogWithSelection(catalog: VersionEntry[], selectedId: string | null): VersionEntry[] {
	if (!selectedId?.trim()) return catalog;
	const id = selectedId.trim();
	if (catalog.some((x) => x.id === id)) return catalog;
	return [{ id, type: 'release', label: 'Selected' }, ...catalog];
}

export function VersionCarousel({
	value,
	onChange,
}: {
	value: string | null;
	onChange: (id: string) => void;
}) {
	const [catalog, setCatalog] = useState<VersionEntry[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [activeIndex, setActiveIndex] = useState(0);
	const viewportRef = useRef<HTMLDivElement | null>(null);
	const [viewportW, setViewportW] = useState(0);
	const activeIndexRef = useRef(0);
	const displayListRef = useRef<VersionEntry[]>([]);

	const displayList = useMemo(() => mergeCatalogWithSelection(catalog, value), [catalog, value]);

	displayListRef.current = displayList;
	activeIndexRef.current = activeIndex;

	useEffect(() => {
		void (async () => {
			try {
				const v = await VersionService.listVersions();
				setCatalog(v);
				setError(null);
			} catch (e) {
				setError(e instanceof Error ? e.message : String(e));
			}
		})();
	}, []);

	useEffect(() => {
		if (!displayList.length) return;
		const idx = value ? displayList.findIndex((x) => x.id === value) : -1;
		setActiveIndex(idx >= 0 ? idx : 0);
	}, [value, displayList]);

	const setIndexAndSave = useCallback(
		(idx: number) => {
			const list = displayListRef.current;
			if (!list.length) return;
			const clamped = clamp(idx, 0, list.length - 1);
			setActiveIndex(clamped);
			const id = list[clamped]?.id;
			if (id) onChange(id);
		},
		[onChange],
	);

	const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
		if (e.key === 'ArrowLeft') {
			e.preventDefault();
			setIndexAndSave(activeIndexRef.current - 1);
		}
		if (e.key === 'ArrowRight') {
			e.preventDefault();
			setIndexAndSave(activeIndexRef.current + 1);
		}
	};

	// Observe viewport whenever the track mounts or width may change (catalog was empty on first paint).
	useLayoutEffect(() => {
		const el = viewportRef.current;
		if (!el || !displayList.length) return;
		const update = () => {
			const w = el.getBoundingClientRect().width;
			setViewportW(w);
		};
		update();
		const ro = new ResizeObserver(() => update());
		ro.observe(el);
		return () => ro.disconnect();
	}, [displayList.length]);

	const wheelAccum = useRef(0);
	const wheelTimer = useRef<number | null>(null);
	const onWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
		const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
		if (delta === 0) return;
		e.preventDefault();

		wheelAccum.current += delta;
		if (wheelTimer.current) window.clearTimeout(wheelTimer.current);
		wheelTimer.current = window.setTimeout(() => {
			wheelTimer.current = null;
			const d = wheelAccum.current;
			wheelAccum.current = 0;
			const cur = activeIndexRef.current;
			if (d > 40) setIndexAndSave(cur + 1);
			else if (d < -40) setIndexAndSave(cur - 1);
		}, 40);
	};

	useEffect(() => {
		return () => {
			if (wheelTimer.current) window.clearTimeout(wheelTimer.current);
		};
	}, []);

	if (error) {
		return <div className="mt-2 text-[11px] text-vex-error/90">Could not load versions. {error}</div>;
	}

	if (!displayList.length) {
		return <div className="mt-3 text-[11px] text-vex-dim">Loading versions…</div>;
	}

	const gap = 16;
	const cardW = 140;
	const stride = cardW + gap;
	const width = viewportW > 0 ? viewportW : 560;
	const translateX = Math.round(width / 2 - cardW / 2 - activeIndex * stride);
	const activeId = displayList[activeIndex]?.id ?? '';

	return (
		<div className="w-full vex-play-vcarousel-enter">
			<div
				ref={viewportRef}
				tabIndex={0}
				role="listbox"
				aria-label="Minecraft version"
				aria-activedescendant={activeId ? `vex-vcarousel-opt-${activeId}` : undefined}
				onKeyDown={onKeyDown}
				onWheel={onWheel}
				className={[
					'vex-no-drag relative h-[120px] w-full overflow-hidden rounded-vex-lg',
					'outline-none focus:ring-2 focus:ring-vex-accent/20',
				].join(' ')}
				style={{ overscrollBehavior: 'contain' }}
			>
				{/* Fixed center “slot” so the focused version reads even at a glance */}
				<div
					aria-hidden
					className="pointer-events-none absolute left-1/2 top-1/2 z-[1] h-[94px] w-[156px] -translate-x-1/2 -translate-y-1/2 rounded-[16px] border-2 border-violet-400/35 bg-gradient-to-b from-violet-500/[0.08] to-transparent shadow-[0_0_36px_rgba(124,92,255,0.28)]"
				/>
				<div
					className="relative z-[2] flex h-full shrink-0 items-center gap-[16px] will-change-transform"
					style={{
						transform: `translateX(${translateX}px)`,
						transition: 'transform 300ms var(--vex-ease)',
						width: 'max-content',
					}}
				>
					{displayList.map((v, i) => {
						const dist = Math.abs(i - activeIndex);
						const scale = dist === 0 ? 1.15 : 0.9;
						const opacity = dist === 0 ? 1 : dist === 1 ? 0.68 : 0.52;
						const blurPx = 0;
						return (
							<VersionCarouselCard
								key={v.id}
								id={v.id}
								optionId={`vex-vcarousel-opt-${v.id}`}
								subtitle={v.label}
								badge={v.tags?.includes('latest') ? 'Latest' : undefined}
								tone={i === activeIndex ? 'center' : 'side'}
								scale={scale}
								opacity={opacity}
								blurPx={blurPx}
								onClick={() => setIndexAndSave(i)}
							/>
						);
					})}
				</div>
			</div>

			<div className="mt-2 text-center">
				<div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300/75">Version in focus</div>
				<div className="mt-0.5 font-mono text-[14px] font-bold text-white">{activeId}</div>
			</div>
			{!value?.trim() ? <div className="mt-1 text-[11px] text-vex-dim">Choose a version above, then use Play when ready.</div> : null}
		</div>
	);
}
