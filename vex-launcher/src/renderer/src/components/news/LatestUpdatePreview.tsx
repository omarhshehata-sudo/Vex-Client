import { useNavigate } from 'react-router-dom';

import { FEATURED_NEWS, type NewsTag } from '../../services/newsService';

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

export function LatestUpdatePreview() {
	const navigate = useNavigate();
	const item = FEATURED_NEWS;
	if (!item) return null;

	return (
		<div className="vex-hero-step w-full max-w-[620px]" style={{ ['--vex-delay' as never]: '320ms' }}>
			<button
				type="button"
				onClick={() => void navigate('/news')}
				className={[
					'vex-no-drag w-full text-left',
					'rounded-[16px] border border-white/[0.07] bg-[#121218]/70 p-5',
					'shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl',
					'transition duration-[240ms] vex-ease will-change-transform',
					'hover:-translate-y-[2px] hover:border-white/[0.11] hover:shadow-[0_0_34px_rgba(124,92,255,0.14),0_22px_70px_rgba(0,0,0,0.58)]',
				].join(' ')}
			>
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">Latest update</div>
						<div className="mt-2 truncate text-[15px] font-bold tracking-tight text-vex-text">{item.title}</div>
					</div>
					<span className={['shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide', badgeClasses(item.tag)].join(' ')}>
						{item.pill}
					</span>
				</div>

				<p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-white/68">{item.description}</p>

				<div className="mt-4 flex items-center justify-between gap-3">
					{item.date ? <div className="text-[11px] text-white/40">{item.date}</div> : <div />}
					<div className="text-[12px] font-semibold text-[#C9B9FF]">View all →</div>
				</div>
			</button>
		</div>
	);
}
