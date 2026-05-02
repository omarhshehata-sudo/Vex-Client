import { useEffect, useMemo, useRef, useState } from 'react';

import { AccountService } from '../../services/AccountService';
import type { AuthProfile } from '../../services/types';
import { MinecraftSkinAvatar } from './MinecraftSkinAvatar';
import { ToastService } from '../../services/ToastService';
import { useLauncherStore } from '../../state/launcherStore';
import { IconUser } from '../ui/icons';

function useOnClickOutside(ref: React.RefObject<HTMLElement>, onOutside: () => void) {
	useEffect(() => {
		const onDown = (e: MouseEvent) => {
			const el = ref.current;
			if (!el) return;
			if (e.target instanceof Node && el.contains(e.target)) return;
			onOutside();
		};
		window.addEventListener('mousedown', onDown);
		return () => window.removeEventListener('mousedown', onDown);
	}, [ref, onOutside]);
}

export function AccountMenu({ statusLine, headerTheme }: { statusLine?: string; headerTheme?: 'default' | 'light' }) {
	const lightHeader = headerTheme === 'light';
	const [open, setOpen] = useState(false);
	const [profile, setProfile] = useState<AuthProfile | null>(null);
	const [busy, setBusy] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);

	useOnClickOutside(rootRef, () => setOpen(false));

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setOpen(false);
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, []);

	const refresh = async () => {
		try {
			setProfile(await AccountService.getProfile());
			void useLauncherStore.getState().hydrate();
		} catch {
			setProfile({ signedIn: false });
		}
	};

	useEffect(() => {
		void refresh();
	}, []);

	const initials = useMemo(() => {
		if (profile?.signedIn) return AccountService.initialsFor(profile.username ?? '');
		return 'V';
	}, [profile?.signedIn, profile?.username]);

	const label = useMemo(() => {
		if (!profile) return 'Account';
		if (!profile.signedIn) return 'Sign in';
		return profile.username ?? 'Signed in';
	}, [profile]);

	const subLabel = useMemo(() => {
		if (statusLine) return statusLine;
		if (!profile) return 'Loading…';
		if (!profile.signedIn) return 'Not signed in';
		return 'Microsoft connected';
	}, [profile, statusLine]);

	const onSignIn = async () => {
		setBusy(true);
		const r = await AccountService.signInWithMicrosoft();
		setBusy(false);
		if (!r.ok) {
			ToastService.push({ type: 'error', title: 'Sign-in failed', message: r.message });
			return;
		}
		await refresh();
	};

	const onSignOut = async () => {
		setBusy(true);
		await AccountService.signOut();
		setBusy(false);
		await refresh();
		setOpen(false);
	};

	return (
		<div ref={rootRef} className="vex-no-drag relative pointer-events-auto">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className={[
					'vex-no-drag group flex items-center gap-3 rounded-[14px] px-3 py-2.5',
					'transition duration-200 vex-ease focus:outline-none focus:ring-2 focus:ring-violet-500/35',
					lightHeader
						? 'border border-white/[0.1] bg-black/35 text-white hover:border-violet-400/40 hover:bg-white/[0.06]'
						: 'border border-white/10 bg-white/[0.03] hover:border-vex-accent/35 hover:bg-white/[0.05] focus:ring-vex-accent/25',
				].join(' ')}
				aria-label="Account menu"
			>
				<div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#1B1B23] ring-1 ring-white/10">
					{profile?.signedIn ? (
						<MinecraftSkinAvatar
							uuid={profile.uuid}
							size={96}
							className="absolute inset-[-8%] h-[116%] w-[116%] max-w-none object-cover object-top [image-rendering:pixelated]"
							fallback={<div className="text-[12px] font-bold text-white">{initials}</div>}
						/>
					) : (
						<IconUser size={18} className="text-white/70" />
					)}
				</div>
				<div className="min-w-0 flex-1 text-left">
					<div
						className={[
							'max-w-[140px] truncate text-[13px] font-semibold',
							lightHeader ? 'text-white' : 'text-vex-text',
						].join(' ')}
					>
						{label}
					</div>
					<div className="flex items-center gap-1.5">
						{profile?.signedIn && lightHeader ? (
							<span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" aria-hidden />
						) : null}
						<div
							className={[
								'max-w-[130px] truncate text-[11px]',
								lightHeader ? 'text-white/55' : 'text-vex-dim',
							].join(' ')}
						>
							{subLabel}
						</div>
					</div>
				</div>
				{lightHeader ? (
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-white/45" aria-hidden>
						<path d="M6 9l6 6 6-6" />
					</svg>
				) : null}
			</button>

			{open && (
				<div
					className={[
						'absolute right-0 mt-3 w-[320px] overflow-hidden rounded-[16px]',
						'border border-white/10 bg-[#0F0F14]/80 shadow-[0_18px_70px_rgba(0,0,0,0.6)] backdrop-blur-xl',
					].join(' ')}
				>
					<div className="px-4 py-3">
						<div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Account</div>
						<div className="mt-2 flex items-center gap-3">
							<div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1B1B23] ring-1 ring-white/10">
								<MinecraftSkinAvatar
									uuid={profile?.signedIn ? profile.uuid : null}
									size={160}
									className="absolute inset-[-8%] h-[116%] w-[116%] max-w-none object-cover object-top [image-rendering:pixelated]"
									fallback={<div className="text-[13px] font-bold text-white">{initials}</div>}
								/>
							</div>
							<div className="min-w-0">
								<div className="truncate text-[14px] font-semibold text-vex-text">
									{profile?.signedIn ? profile.username ?? 'Signed in' : 'Not signed in'}
								</div>
								<div className="truncate text-[12px] text-vex-dim">
									{profile?.signedIn ? 'Microsoft connected' : 'Connect your Microsoft account'}
								</div>
							</div>
						</div>

						<div className="mt-3 h-px bg-white/10" />

						<div className="mt-3 space-y-2">
							{!profile?.signedIn ? (
								<button
									type="button"
									className={[
										'vex-press flex w-full items-center justify-center rounded-[12px] bg-vex-accent px-4 py-2.5 text-[13px] font-semibold text-white',
										'shadow-[0_0_24px_rgba(124,92,255,0.35)] ring-1 ring-white/10 transition duration-200 vex-ease',
										'hover:bg-vex-accentHover disabled:opacity-50',
									].join(' ')}
									disabled={busy}
									onClick={() => void onSignIn()}
								>
									{busy ? 'Connecting…' : 'Continue with Microsoft'}
								</button>
							) : (
								<div className="grid gap-2">
									<button
										type="button"
										className={[
											'vex-press flex w-full items-center justify-center rounded-[12px] bg-vex-accent px-4 py-2.5 text-[13px] font-semibold text-white',
											'shadow-[0_0_24px_rgba(124,92,255,0.35)] ring-1 ring-white/10 transition duration-200 vex-ease',
											'hover:bg-vex-accentHover disabled:opacity-50',
										].join(' ')}
										disabled={busy}
										onClick={() => void onSignIn()}
									>
										{busy ? 'Opening…' : 'Switch account'}
									</button>
									<button
										type="button"
										className="vex-press flex w-full items-center justify-center rounded-[12px] border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[13px] font-semibold text-vex-text transition duration-200 vex-ease hover:bg-white/[0.06] disabled:opacity-50"
										disabled={busy}
										onClick={() => void onSignOut()}
									>
										Sign out
									</button>
								</div>
							)}
						</div>

						<div className="mt-3 rounded-[12px] border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-white/60">
							<span className="font-semibold text-white/75">Security note.</span> Official Microsoft authentication. Passwords are never stored.
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

