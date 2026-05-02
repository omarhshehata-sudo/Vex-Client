import { useCallback, useEffect, useState } from 'react';

import { AccountPanel } from '../components/AccountPanel';
import { ErrorAlert } from '../components/ErrorAlert';
import { LauncherPageScaffold } from '../layout/LauncherPageScaffold';
import { PageHeader } from '../layout/PageHeader';
import { AccountService } from '../services/AccountService';
import type { AuthProfile } from '../services/types';
import { friendlyErrorMessage } from '../services/friendlyError';

export function AccountsPage() {
	const [profile, setProfile] = useState<AuthProfile | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		try {
			setProfile(await AccountService.getProfile());
			setError(null);
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		}
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const onSignIn = async () => {
		setBusy(true);
		const r = await AccountService.signInWithMicrosoft();
		setBusy(false);
		if (!r.ok) {
			setError(r.message);
			return;
		}
		await refresh();
	};

	const onSignOut = async () => {
		setBusy(true);
		await AccountService.signOut();
		setBusy(false);
		await refresh();
	};

	if (!profile) {
		return (
			<LauncherPageScaffold innerClassName="mx-auto flex min-h-[40vh] w-full max-w-[760px] flex-1 items-center justify-center">
				<div className="text-sm text-vex-dim">Loading account…</div>
			</LauncherPageScaffold>
		);
	}

	return (
		<LauncherPageScaffold innerClassName="mx-auto flex w-full max-w-[760px] min-h-0 flex-1 flex-col gap-8 pb-16">
			<PageHeader title="Account" description="Microsoft authentication for Minecraft — designed to feel trustworthy, not “placeholder UI”." />
			{error && <ErrorAlert title="Account error" friendly={friendlyErrorMessage(error) ?? undefined} detail={error} />}
			<div className="w-full">
				<AccountPanel profile={profile} busy={busy} onSignIn={() => void onSignIn()} onSignOut={() => void onSignOut()} />
			</div>
		</LauncherPageScaffold>
	);
}

