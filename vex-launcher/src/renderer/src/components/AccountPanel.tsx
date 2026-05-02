import type { AuthProfile } from '../services/types';
import { AccountService } from '../services/AccountService';
import { MinecraftSkinAvatar } from './account/MinecraftSkinAvatar';
import { IconUser } from './ui/icons';

export function AccountPanel({
	profile,
	busy,
	onSignIn,
	onSignOut,
}: {
	profile: AuthProfile;
	busy: boolean;
	onSignIn: () => void;
	onSignOut: () => void;
}) {
	if (!profile.signedIn) {
		return (
			<div className="vex-fade-in vex-surface-animate relative overflow-hidden rounded-vex-lg border border-white/[0.08] bg-gradient-to-br from-white/[0.05] via-vex-surface to-vex-surface2 p-6 shadow-panel ring-1 ring-white/[0.04]">
				<div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-vex-accent/18 blur-3xl" />
				<div className="relative">
					<div className="flex items-start gap-4">
						<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-vex-lg bg-white/[0.04] text-vex-text ring-1 ring-white/10">
							<IconUser size={26} />
						</div>
						<div className="min-w-0">
							<div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-vex-muted">Account</div>
							<div className="mt-2 text-[22px] font-bold tracking-tight text-vex-text">Sign in with Microsoft</div>
							<p className="mt-2 text-[13px] leading-relaxed text-vex-muted">
								Connect the same account you use for Minecraft. This unlocks the full launcher experience once approvals land.
							</p>
						</div>
					</div>

					<button
						type="button"
						disabled={busy}
						onClick={onSignIn}
						className={[
							'vex-no-drag mt-6 w-full select-none overflow-hidden rounded-vex-lg px-6 py-4 text-base font-semibold tracking-tight',
							'transition duration-200 vex-ease',
							'shadow-[0_18px_70px_-34px_rgba(124,92,255,0.75)] ring-1 ring-white/10',
							'bg-gradient-to-r from-[#2f6feb] via-[#2b7cea] to-[#7c5cff] text-white',
							'hover:-translate-y-0.5 hover:shadow-[0_22px_90px_-40px_rgba(124,92,255,0.85)]',
							'active:scale-[0.97] active:brightness-95',
							busy ? 'cursor-not-allowed opacity-45' : '',
						].join(' ')}
					>
						{busy ? 'Waiting for browser…' : 'Continue with Microsoft'}
					</button>

					<div className="mt-5 rounded-vex-lg border border-white/[0.08] bg-white/[0.03] p-4 text-[12px] leading-relaxed text-vex-dim ring-1 ring-white/[0.04]">
						<span className="font-semibold text-vex-text">Security note.</span> We use official Microsoft login. Your password is never stored on disk by Vex.
					</div>
				</div>
			</div>
		);
	}

	const initials = AccountService.initialsFor(profile.username ?? '');

	return (
		<div className="vex-fade-in vex-surface-animate relative overflow-hidden rounded-vex-lg border border-white/[0.08] bg-gradient-to-br from-white/[0.05] via-vex-surface to-vex-surface2 p-6 shadow-panel ring-1 ring-white/[0.04]">
			<div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-vex-accent/16 blur-3xl" />
			<div className="relative">
				<div className="flex items-start gap-4">
					<div
						className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-vex-lg bg-[#1B1B23] ring-1 ring-white/10 shadow-vex"
						aria-hidden
					>
						<MinecraftSkinAvatar
							uuid={profile.uuid}
							size={180}
							className="absolute inset-[-12%] h-[124%] w-[124%] max-w-none object-cover object-top [image-rendering:pixelated]"
							fallback={
								<div className="flex h-full w-full items-center justify-center bg-vex-accent text-base font-bold text-white">{initials}</div>
							}
						/>
					</div>
					<div className="min-w-0 flex-1">
						<div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-vex-muted">Signed in</div>
						<div className="mt-2 truncate text-[22px] font-bold tracking-tight text-vex-text">{profile.username}</div>
						<div className="mt-1 truncate font-mono text-[11px] text-vex-dim">{profile.uuid}</div>
						<p className="mt-2 text-[12px] leading-relaxed text-vex-dim">
							Skin from your Minecraft Java profile via Crafatar (public CDN).
						</p>
					</div>
				</div>

				<div className="mt-6 flex flex-wrap gap-2">
					<button
						type="button"
						disabled={busy}
						onClick={onSignOut}
						className="vex-no-drag rounded-vex-lg border border-white/[0.10] bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-vex-text shadow-panel/20 ring-1 ring-white/[0.04] transition duration-200 vex-ease hover:-translate-y-0.5 hover:bg-white/[0.05] active:scale-[0.97] disabled:opacity-40"
					>
						Sign out
					</button>
				</div>
			</div>
		</div>
	);
}
