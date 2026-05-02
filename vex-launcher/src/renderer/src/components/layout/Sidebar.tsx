import { NavLink, useLocation } from 'react-router-dom';
import type React from 'react';

import { EXTERNAL } from '../../services/linkConstants';
import { ToastService } from '../../services/ToastService';
import { IconCog, IconDownload, IconHome, IconLayers, IconMod, IconNews, IconPalette, IconPlay, IconProfiles } from '../ui/icons';
import { VexMark } from '../ui/VexMark';

const navItemBase =
	'vex-no-drag group relative flex h-[44px] w-[44px] items-center justify-center rounded-[14px] transition duration-[160ms] vex-ease';
const navItemInactive = 'text-[#8A8A95] hover:bg-white/[0.06] hover:text-white';
const navItemActive = 'bg-[#1B1B23] text-vex-accent shadow-[0_0_16px_rgba(124,92,255,0.35)]';

function NavTip({ text }: { text: string }) {
	return (
		<span
			role="tooltip"
			className={[
				'pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap',
				'rounded-[8px] bg-[#1B1B23] px-[10px] py-[6px] text-[12px] font-semibold text-white',
				'shadow-panel ring-1 ring-white/5 backdrop-blur-md',
				'opacity-0 translate-x-[6px] transition-[opacity,transform] duration-[160ms] vex-ease',
				'group-hover:opacity-100 group-hover:translate-x-0',
			].join(' ')}
		>
			{text}
		</span>
	);
}

function NavIconWrap({ children }: { children: React.ReactNode }) {
	return (
		<div
			className={[
				'vex-no-drag flex h-[44px] w-[44px] items-center justify-center rounded-[14px]',
				'transition duration-[160ms] vex-ease',
				'text-current',
			].join(' ')}
		>
			{children}
		</div>
	);
}

export function Sidebar() {
	const location = useLocation();

	const openExternal = async (url: string, label: string) => {
		const target = String(url ?? '').trim();
		if (!target) return;
		try {
			if (window.vexLauncher?.openExternal) {
				const r = await window.vexLauncher.openExternal(target);
				if (r.ok) return;
			}
		} catch {
			// fall through to browser open
		}
		try {
			window.open(target, '_blank', 'noopener,noreferrer');
		} catch {
			ToastService.push({ type: 'error', title: `Could not open ${label}`, message: target });
		}
	};

	const mainItems = [
		{ to: '/', label: 'Home', icon: <IconHome size={24} strokeWidth={1.8} /> },
		{ to: '/play', label: 'Play', icon: <IconPlay size={24} strokeWidth={1.8} /> },
		{ to: '/versions', label: 'Versions', icon: <IconLayers size={24} strokeWidth={1.8} /> },
		{ to: '/profiles', label: 'Profiles', icon: <IconProfiles size={24} strokeWidth={1.8} /> },
		{ to: '/mods', label: 'Mods', icon: <IconMod size={24} strokeWidth={1.8} /> },
		{ to: '/news', label: 'News', icon: <IconNews size={24} strokeWidth={1.8} /> },
		{ to: '/settings', label: 'Settings', icon: <IconCog size={24} strokeWidth={1.8} /> },
	];
	const secondaryItems = [
		{ to: '#', label: 'Downloads', icon: <IconDownload size={24} strokeWidth={1.8} />, disabled: true },
		{ to: '#', label: 'Appearance', icon: <IconPalette size={24} strokeWidth={1.8} />, disabled: true },
	];

	const path = location.pathname || '/';
	const activeMainIndex = mainItems.findIndex((x) => (x.to === '/' ? path === '/' : path.startsWith(x.to)));
	const activeSecondaryIndex = secondaryItems.findIndex((x) => path.startsWith(x.to));
	const activeIndex = activeMainIndex >= 0 ? activeMainIndex : activeSecondaryIndex >= 0 ? mainItems.length + activeSecondaryIndex : 0;

	const ITEM = 44;
	const GAP = 14;
	const GROUP_GAP = 24;
	const indicatorYBase = 52 + 36;
	const itemStride = ITEM + GAP;
	const groupOffset = activeIndex >= mainItems.length ? GROUP_GAP : 0;
	const indicatorY = indicatorYBase + activeIndex * itemStride + 8 + groupOffset;

	return (
		<aside
			className="vex-no-drag relative flex w-[88px] shrink-0 flex-col items-center bg-[#0F0F14] pb-6"
			style={{ boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.04)' }}
		>
			<div className="vex-drag mt-6 mb-9 flex w-full items-center justify-center">
				<div
					className="flex h-[52px] w-[52px] items-center justify-center rounded-[16px]"
					style={{
						background: 'rgba(255,255,255,0.04)',
						boxShadow: '0 0 14px rgba(124, 92, 255, 0.35)',
					}}
				>
					<VexMark size={34} />
				</div>
			</div>

			<div className="relative w-full">
				<div
					aria-hidden
					className="pointer-events-none absolute left-1/2 w-[28px] -translate-x-1/2 rounded-full bg-[#7C5CFF]/35 blur-[10px]"
					style={{ top: indicatorY, height: 28 }}
				/>
				<nav className="flex w-full flex-col items-center gap-[14px]">
					{mainItems.map((item) => (
						<NavLink
							key={item.to}
							to={item.to}
							end={item.to === '/'}
							className={({ isActive }) => [navItemBase, isActive ? navItemActive : navItemInactive].join(' ')}
						>
							<>
								<NavIconWrap>{item.icon}</NavIconWrap>
								<NavTip text={item.label} />
							</>
						</NavLink>
					))}

					<div className="h-6" />

					{secondaryItems.map((item) => (
						<div key={item.label} className={[navItemBase, item.disabled ? 'pointer-events-none opacity-50' : ''].join(' ')}>
							<NavIconWrap>{item.icon}</NavIconWrap>
							<NavTip text={item.label} />
						</div>
					))}
				</nav>
			</div>

			<div className="mt-auto flex w-full flex-col items-center gap-[10px]">
				<button
					type="button"
					aria-label="Discord"
					title="Discord"
					className="vex-no-drag vex-press flex h-[44px] w-[44px] items-center justify-center rounded-[14px] text-[#A6A6B3] transition duration-[160ms] vex-ease hover:bg-white/[0.06] hover:text-white"
					onClick={() => void openExternal(EXTERNAL.discord, 'Discord')}
				>
					<svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
						<path d="M19.54 3.28A16.6 16.6 0 0 0 15.5 2c-.18.33-.39.77-.54 1.12a15.4 15.4 0 0 0-4.92 0c-.15-.35-.36-.79-.55-1.12a16.6 16.6 0 0 0-4.04 1.28C2.8 6.87 2.12 10.34 2.34 13.76c1.62 1.2 3.19 1.93 4.74 2.41.39-.53.74-1.1 1.03-1.7-.57-.21-1.11-.48-1.62-.8.14-.1.28-.21.41-.32 3.13 1.46 6.53 1.46 9.62 0 .14.11.27.22.41.32-.51.32-1.05.59-1.62.8.29.6.64 1.17 1.03 1.7 1.55-.48 3.12-1.21 4.74-2.41.27-4.16-.46-7.6-2.46-10.48ZM8.5 12.8c-.93 0-1.69-.86-1.69-1.91S7.56 8.98 8.5 8.98c.94 0 1.7.86 1.69 1.91 0 1.05-.76 1.91-1.69 1.91Zm7 0c-.93 0-1.69-.86-1.69-1.91s.76-1.91 1.69-1.91c.94 0 1.7.86 1.69 1.91 0 1.05-.75 1.91-1.69 1.91Z" />
					</svg>
				</button>
				<button
					type="button"
					aria-label="Website"
					title="Website"
					className="vex-no-drag vex-press flex h-[44px] w-[44px] items-center justify-center rounded-[14px] text-[#A6A6B3] transition duration-[160ms] vex-ease hover:bg-white/[0.06] hover:text-white"
					onClick={() => void openExternal(EXTERNAL.website, 'Website')}
				>
					<VexMark size={30} />
				</button>
			</div>
		</aside>
	);
}
