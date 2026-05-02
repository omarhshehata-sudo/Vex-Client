import { AccountService } from '../../services/AccountService';
import type { AuthProfile } from '../../services/types';
import { IconCog } from '../ui/icons';

export function AccountChip({
	profile,
	onOpenAccounts,
}: {
	profile: AuthProfile;
	onOpenAccounts: () => void;
}) {
	const initials = profile.signedIn ? AccountService.initialsFor(profile.username ?? '') : 'V';
	const name = profile.signedIn ? profile.username ?? 'Signed in' : 'Guest';

	return (
		<div className="vex-no-drag flex items-center">
			<div className="flex h-[40px] items-center gap-[10px] rounded-[12px] bg-transparent px-3 transition duration-[160ms] vex-ease hover:bg-[#1B1B23]">
				<div
					className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-vex-accent text-[12px] font-bold text-white shadow-vex ring-1 ring-white/10"
					aria-hidden
				>
					{initials}
				</div>
				<div className="min-w-0">
					<div className="max-w-[140px] truncate text-sm font-semibold text-vex-text">{name}</div>
					<div className="max-w-[140px] truncate text-[10px] text-vex-dim">
						{profile.signedIn ? 'Account' : 'Signed out'}
					</div>
				</div>
				<button
					type="button"
					onClick={onOpenAccounts}
					className="vex-press rounded-[12px] bg-transparent px-3 py-2 text-xs font-semibold text-vex-text transition duration-[160ms] vex-ease hover:bg-[#1B1B23]"
					aria-label="Account settings"
					title="Account settings"
				>
					<IconCog size={18} />
				</button>
			</div>
		</div>
	);
}

