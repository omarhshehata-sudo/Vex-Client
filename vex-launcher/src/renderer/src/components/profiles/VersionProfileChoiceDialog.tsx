import { Button } from '../ui/Button';

type Props = {
	open: boolean;
	versionId: string | null;
	onClose: () => void;
	onUpdateProfile: () => void;
	onCreateProfile: () => void;
};

export function VersionProfileChoiceDialog({ open, versionId, onClose, onUpdateProfile, onCreateProfile }: Props) {
	if (!open || !versionId) return null;
	return (
		<div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
			<div className="w-full max-w-[420px] rounded-[18px] border border-white/[0.08] bg-[#14141A] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
				<div className="text-[18px] font-bold text-vex-text">Use Minecraft {versionId}?</div>
				<p className="mt-2 text-[13px] leading-relaxed text-white/70">
					Update the active profile to this version, or create a new profile so your current setup stays unchanged.
				</p>
				<div className="mt-5 flex flex-col gap-2">
					<Button className="h-[40px] w-full" onClick={onUpdateProfile}>
						Update current profile
					</Button>
					<Button variant="secondary" className="h-[40px] w-full" onClick={onCreateProfile}>
						Create new profile
					</Button>
					<button type="button" className="mt-1 text-center text-[12px] font-semibold text-white/50 hover:text-white/80" onClick={onClose}>
						Cancel
					</button>
				</div>
			</div>
		</div>
	);
}
