import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { LATEST_NEWS, type NewsTag } from '../../services/newsService';
import { IconNews } from '../ui/icons';

function badgeClasses(tag: NewsTag) {
	switch (tag) {
		case 'patch':
			return 'bg-[#2A3F7A]/30 text-[#9CC2FF] ring-1 ring-[#6FA8FF]/35 shadow-[0_0_14px_rgba(111,168,255,0.22)]';
		case 'update':
			return 'bg-[#1F5C5A]/25 text-[#8FF7E8] ring-1 ring-[#62E7D8]/35 shadow-[0_0_14px_rgba(98,231,216,0.22)]';
		default:
			return 'bg-[#341F6F]/35 text-[#DBC8FF] ring-1 ring-[#B98CFF]/35 shadow-[0_0_14px_rgba(185,140,255,0.28)]';
	}
}

export function NewsDropdown() {
	const nav = useNavigate();
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const onDown = (e: MouseEvent) => {
			const el = rootRef.current;
			if (!el) return;
			if (e.target instanceof Node && el.contains(e.target)) return;
			setOpen(false);
		};
		window.addEventListener('mousedown', onDown);
		return () => window.removeEventListener('mousedown', onDown);
	}, []);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setOpen(false);
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, []);

	return (
		<div ref={rootRef} className="vex-no-drag relative pointer-events-auto">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className={[
					'vex-no-drag grid h-[44px] w-[44px] place-items-center rounded-[14px]',
					'border border-white/10 bg-white/[0.03] transition duration-200 vex-ease',
					'hover:border-vex-accent/35 hover:bg-white/[0.05]',
					open ? 'ring-2 ring-vex-accent/22 border-vex-accent/35' : '',
				].join(' ')}
				title="News"
				aria-label="News"
			>
				<IconNews size={20} className="text-white/85" />
			</button>

			{open && (
				<div
					className={[
						'absolute right-0 mt-3 w-[360px] overflow-hidden rounded-[16px]',
						'border border-white/10 bg-[#0F0F14]/85 backdrop-blur-xl shadow-[0_18px_70px_rgba(0,0,0,0.65)]',
						'vex-news-dropdown',
					].join(' ')}
				>
					<div className="flex items-center justify-between px-4 py-3">
						<div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/45">Latest news</div>
						<button type="button" className="text-[11px] font-semibold text-[#C9B9FF]" onClick={() => nav('/news')} title="Open news">
							View all →
						</button>
					</div>
					<div className="h-px bg-white/10" />
					<div className="p-3">
						<div className="flex flex-col gap-2">
							{LATEST_NEWS.map((n) => (
								<button
									key={`${n.id}-peek`}
									type="button"
									onClick={() => {
										setOpen(false);
										void nav(`/news?id=${encodeURIComponent(n.id)}`);
									}}
									className={[
										'vex-no-drag w-full rounded-[14px] border border-transparent bg-white/[0.03] px-3 py-2 text-left',
										'transition duration-[220ms] vex-ease hover:-translate-y-[1px]',
										'hover:border-white/10 hover:bg-white/[0.05] hover:shadow-[0_0_22px_rgba(124,92,255,0.12)]',
									].join(' ')}
								>
									<div className="flex items-center justify-between gap-2">
										<div className="min-w-0 truncate text-[13px] font-semibold text-vex-text">{n.title}</div>
										<span className={['shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', badgeClasses(n.tag)].join(' ')}>
											{n.pill}
										</span>
									</div>
									<div className="mt-1 line-clamp-2 text-[12px] text-white/62">{n.description}</div>
									{n.date && <div className="mt-1 text-[11px] text-white/40">{n.date}</div>}
								</button>
							))}
							{LATEST_NEWS.length === 0 ? <div className="px-2 py-6 text-center text-[12px] text-white/55">No news items yet.</div> : null}
						</div>

						<button
							type="button"
							onClick={() => {
								setOpen(false);
								void nav('/news');
							}}
							className="vex-no-drag mt-3 flex h-[38px] w-full items-center justify-center rounded-[12px] bg-vex-accent px-4 text-[13px] font-semibold text-white shadow-[0_0_24px_rgba(124,92,255,0.35)] ring-1 ring-white/10 transition duration-200 vex-ease hover:bg-vex-accentHover"
						>
							View all news
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
