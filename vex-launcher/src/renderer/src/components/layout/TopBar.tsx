import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { AccountService } from '../../services/AccountService';
import type { AuthProfile } from '../../services/types';
import { VexMark } from '../ui/VexMark';

function initials(username?: string): string {
	if (!username) return '??';
	return AccountService.initialsFor(username);
}

export function TopBar() {
	const [profile, setProfile] = useState<AuthProfile | null>(null);
	const location = useLocation();

	useEffect(() => {
		void (async () => {
			try {
				setProfile(await AccountService.getProfile());
			} catch {
				setProfile({ signedIn: false });
			}
		})();
	}, []);

	const display = useMemo(() => {
		if (!profile) return { title: 'Welcome', sub: 'Loading account…', initials: '…' };
		if (!profile.signedIn) return { title: 'Welcome', sub: 'Signed out', initials: 'V' };
		return { title: 'Welcome back', sub: profile.username ?? 'Signed in', initials: initials(profile.username) };
	}, [profile]);

	return (
		<div className="flex items-center justify-between gap-4">
			<div>
				<div className="flex items-center gap-2.5">
					<div className="flex h-8 w-8 shrink-0 items-center justify-center">
						<VexMark size={26} />
					</div>
					<div className="text-[11px] font-semibold uppercase tracking-widest text-vex-dim">Vex Launcher</div>
					<div className="ml-2 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] text-white/35">
						{location.pathname || '/'}
					</div>
				</div>
				<h2 className="mt-1 text-xl font-semibold tracking-tight text-vex-text">{display.title}</h2>
				<p className="mt-1 text-xs text-vex-dim">{display.sub}</p>
			</div>

			<div className="flex items-center gap-3 rounded-vex-lg border border-vex-border/60 bg-vex-surface px-3 py-2">
				<div
					className="flex h-10 w-10 items-center justify-center rounded-vex bg-vex-accent text-sm font-bold text-white shadow-vex ring-1 ring-white/10"
					aria-hidden
				>
					{display.initials}
				</div>
				<div className="min-w-0">
					<div className="truncate text-sm font-semibold text-vex-text">{profile?.signedIn ? profile.username : 'Guest'}</div>
					<div className="truncate font-mono text-[10px] text-vex-dim">{profile?.signedIn ? profile.uuid : '—'}</div>
				</div>
			</div>
		</div>
	);
}

