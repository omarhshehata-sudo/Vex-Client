import { NavLink } from 'react-router-dom';

import { AccountMenu } from '../account/AccountMenu';
import { VexMark } from '../ui/VexMark';
import { ToastService } from '../../services/ToastService';
import { useLauncherStore } from '../../state/launcherStore';

export const LAUNCHER_MAIN_NAV: Array<{ to: string; label: string; end?: boolean; disabled?: boolean }> = [
	{ to: '/', label: 'HOME', end: true },
	{ to: '/profiles', label: 'PROFILES' },
	{ to: '/mods', label: 'MODS' },
	{ to: '/news', label: 'NEWS' },
	{ to: '/settings', label: 'SETTINGS' },
	{ to: '#', label: 'STORE', disabled: true },
];

function IconBell({ className }: { className?: string }) {
	return (
		<svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
			<path d="M18 8A6 6 0 0 0 6 8c0 7-3 7-3 14h18c0-7-3-7-3-14" />
			<path d="M13.73 21a2 2 0 0 1-3.46 0" />
		</svg>
	);
}

type Props = {
	/** Purple unread dot on the bell (news screen mock). */
	notificationDot?: boolean;
};

export function LauncherMainNavBar({ notificationDot = false }: Props) {
	const account = useLauncherStore((s) => s.account);

	return (
		<header className="relative z-40 flex shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#050505]/90 px-5 py-3 backdrop-blur-xl md:px-8">
			<div className="flex items-center gap-3">
				<VexMark size={34} alt="Vex" />
				<div className="flex items-baseline gap-2">
					<span className="text-[20px] font-black tracking-[0.02em]">VEX</span>
					<span className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/55">Client</span>
				</div>
			</div>
			<nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex" aria-label="Main">
				{LAUNCHER_MAIN_NAV.map((item) =>
					item.disabled ? (
						<button
							key={item.label}
							type="button"
							onClick={() => ToastService.push({ type: 'info', title: 'Store', message: 'Coming soon.' })}
							className="m-0 cursor-pointer border-0 bg-transparent p-0 text-[12px] font-bold tracking-[0.2em] text-white/35 hover:text-white/50"
						>
							{/* Same inner wrapper as NavLink labels so baseline / flex cross-axis matches HOME–SETTINGS */}
							<span className="relative inline-block pb-1">{item.label}</span>
						</button>
					) : (
						<NavLink
							key={item.to}
							to={item.to}
							end={item.end}
							className={({ isActive }) =>
								[
									'text-[12px] font-bold tracking-[0.2em] transition-[color,opacity,transform] duration-[var(--vex-ui-ms)] vex-ease',
									isActive ? 'text-white' : 'text-white/45 hover:text-white/80',
								].join(' ')
							}
						>
							{({ isActive }) => (
								<span className="relative inline-block pb-1">
									{item.label}
									{isActive ? (
										<span className="vex-nav-active-line absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-[0_0_12px_rgba(168,85,247,0.7)]" />
									) : null}
								</span>
							)}
						</NavLink>
					),
				)}
			</nav>
			<div className="flex items-center gap-3">
				<button
					type="button"
					className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/60 transition hover:text-white"
					aria-label="Notifications"
					onClick={() => ToastService.push({ type: 'info', title: 'Notifications', message: 'No new notifications.' })}
				>
					<IconBell />
					{notificationDot ? (
						<span
							className="absolute right-2 top-2 h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(168,85,247,0.95)]"
							aria-hidden
						/>
					) : null}
				</button>
				<AccountMenu headerTheme="light" statusLine={account?.signedIn ? 'Online' : 'Offline'} />
			</div>
		</header>
	);
}
