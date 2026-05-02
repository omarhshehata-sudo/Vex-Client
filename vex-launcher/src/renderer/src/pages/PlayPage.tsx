import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ErrorAlert } from '../components/ErrorAlert';
import { LauncherPageScaffold } from '../layout/LauncherPageScaffold';
import { Button } from '../components/ui/Button';
import { PlayButton, type PlayButtonPhase } from '../components/ui/PlayButton';
import { Panel } from '../components/ui/Panel';
import { Skeleton } from '../components/ui/Skeleton';
import { VersionProfileChoiceDialog } from '../components/profiles/VersionProfileChoiceDialog';
import { VersionCarousel } from '../components/versions/VersionCarousel';
import { useStatus } from '../hooks/useStatus';
import { AccountService } from '../services/AccountService';
import { LauncherService, type LaunchStatusMessage } from '../services/LauncherService';
import { SettingsService } from '../services/SettingsService';
import type { AuthProfile, LauncherSettings } from '../services/types';
import type { LaunchStatusEvent } from '../vite-env';
import { StatusService, type StatusState } from '../services/StatusService';
import { ConsoleService } from '../services/ConsoleService';
import { JavaService } from '../services/JavaService';
import { friendlyErrorMessage } from '../services/friendlyError';
import { ProfilesService } from '../services/ProfilesService';
import { ToastService } from '../services/ToastService';
import { useLauncherStore } from '../state/launcherStore';

export function PlayPage() {
	const nav = useNavigate();
	const status = useStatus();
	const [profile, setProfile] = useState<AuthProfile | null>(null);
	const [settingsState, setSettingsState] = useState<LauncherSettings | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<{ title: string; detail: string } | null>(null);
	const [launchNote, setLaunchNote] = useState<string | null>(null);
	const [launchStatus, setLaunchStatus] = useState<LaunchStatusMessage | null>(null);
	const [javaLine, setJavaLine] = useState<string>('Java: detecting…');
	const [versionChoiceId, setVersionChoiceId] = useState<string | null>(null);
	const [carouselKey, setCarouselKey] = useState(0);

	const setGlobal = useCallback((state: StatusState, text: string, pct?: number) => {
		StatusService.setState(state, text);
		if (pct !== undefined) StatusService.setProgressTarget(pct);
	}, []);

	const appendConsole = useCallback((line: string) => {
		const s = String(line ?? '');
		if (s.trim().length === 0) return;
		if (s.toLowerCase().startsWith('error:') || s.toLowerCase().startsWith('[error]')) {
			ConsoleService.log(s.replace(/^\[error\]\s*/i, '').replace(/^error:\s*/i, ''), 'error');
			return;
		}
		if (s.toLowerCase().startsWith('[warn]')) {
			ConsoleService.log(s.replace(/^\[warn\]\s*/i, ''), 'warn');
			return;
		}
		if (s.toLowerCase().startsWith('[success]')) {
			ConsoleService.log(s.replace(/^\[success\]\s*/i, ''), 'success');
			return;
		}
		ConsoleService.log(s.replace(/^\[info\]\s*/i, ''), 'info');
	}, []);

	const refresh = useCallback(async () => {
		setError(null);
		try {
			const [p, s] = await Promise.all([AccountService.getProfile(), SettingsService.load()]);
			setProfile(p);
			setSettingsState(s);
		} catch (e) {
			setError({ title: 'Could not load launcher data', detail: e instanceof Error ? e.message : String(e) });
		}
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	useEffect(() => {
		void (async () => {
			try {
				const javaPath = settingsState?.javaPath ?? 'java';
				const r = await JavaService.validateJava(javaPath);
				if (!r.ok) {
					setJavaLine('Java not found ❌ Install Java 21');
					return;
				}
				const major = r.candidate.major;
				if (major === undefined) {
					setJavaLine('Java detected ✔ (unknown version)');
					return;
				}
				if (major < 21) {
					setJavaLine(`Java ${major} detected ⚠ (need 21+)`);
					return;
				}
				setJavaLine(`Java ${major} detected ✔`);
			} catch {
				setJavaLine('Java not found ❌ Install Java 21');
			}
		})();
	}, [settingsState?.javaPath]);

	const patchLocal = (patch: Partial<LauncherSettings>) => {
		setSettingsState((prev) => (prev ? { ...prev, ...patch } : prev));
	};

	const persist = async (patch: Partial<LauncherSettings>, quiet?: boolean) => {
		try {
			const next = await SettingsService.save(patch);
			setSettingsState(next);
			useLauncherStore.getState().applySettings(next);
			if (!quiet) ToastService.push({ type: 'success', title: 'Settings saved' });
		} catch (e) {
			setError({ title: 'Save failed', detail: e instanceof Error ? e.message : String(e) });
		}
	};

	const onPlay = async () => {
		setLaunchNote(null);
		setError(null);
		setLaunchStatus(null);
		ConsoleService.clear();
		setGlobal('checking', 'Checking Java…', 5);
		setBusy(true);
		try {
			window.vexLauncher?.launchConsoleOff();
			window.vexLauncher?.launchConsoleOn((line) => appendConsole(line));
			window.vexLauncher?.launchStatusOff();
			window.vexLauncher?.launchStatusOn((ev: LaunchStatusEvent) => {
				// Map main-process events into global status/progress.
				const phaseText = ev.phase || 'Working…';
				let st: StatusState = 'checking';
				if (phaseText.toLowerCase().includes('download')) st = 'downloading';
				if (phaseText.toLowerCase().includes('launch')) st = 'launching';
				StatusService.setState(st, phaseText);
				if (typeof ev.percent === 'number' && Number.isFinite(ev.percent)) {
					StatusService.setProgressTarget(Math.round(Math.max(0, Math.min(1, ev.percent)) * 100));
				}
				if (ev.detail) appendConsole(`[INFO] ${ev.detail}`);
			});
			const result = await LauncherService.runPlaySequence((s) => {
				setLaunchStatus(s);
				appendConsole(`[INFO] ${s}`);
			});
			if (!result.ok) {
				setError({ title: result.title, detail: result.detail });
				return;
			}
			setLaunchNote(result.summary);
			ToastService.push({ type: 'success', title: 'Launch started', message: result.launch.message });
			appendConsole(`[INFO] ${result.launch.message}`);
			void useLauncherStore.getState().hydrate();
		} catch (e) {
			StatusService.setState('error', 'Error');
			setError({ title: 'Launch failed', detail: e instanceof Error ? e.message : String(e) });
		} finally {
			setBusy(false);
			setLaunchStatus(null);
			StatusService.reset();
		}
	};

	const onDevTestLaunch = async () => {
		setError(null);
		setLaunchNote(null);
		setLaunchStatus(null);
		ConsoleService.clear();
		setGlobal('launching', 'Dev Test Launch…', 5);
		setBusy(true);
		try {
			window.vexLauncher?.launchConsoleOff();
			window.vexLauncher?.launchConsoleOn((line) => appendConsole(line));
			window.vexLauncher?.launchStatusOff();
			window.vexLauncher?.launchStatusOn((ev: LaunchStatusEvent) => {
				const phaseText = ev.phase || 'Working…';
				let st: StatusState = 'checking';
				if (phaseText.toLowerCase().includes('download')) st = 'downloading';
				if (phaseText.toLowerCase().includes('launch')) st = 'launching';
				StatusService.setState(st, phaseText);
				if (typeof ev.percent === 'number' && Number.isFinite(ev.percent)) {
					StatusService.setProgressTarget(Math.round(Math.max(0, Math.min(1, ev.percent)) * 100));
				}
			});
			appendConsole('[INFO] DEV TEST LAUNCH…');
			const r = await LauncherService.devTestLaunch();
			if (!r.ok) {
				setError({ title: r.title, detail: r.detail });
				return;
			}
			ToastService.push({ type: 'info', title: 'Dev Test Launch', message: r.message });
			appendConsole(`[INFO] ${r.message}`);
		} catch (e) {
			StatusService.setState('error', 'Error');
			setError({ title: 'Dev Test Launch failed', detail: e instanceof Error ? e.message : String(e) });
		} finally {
			setBusy(false);
			StatusService.reset();
		}
	};

	// Boot failures must not stay behind this gate — otherwise `error` is set but UI never leaves “Loading…”.
	if (error && (!settingsState || !profile)) {
		return (
			<LauncherPageScaffold innerClassName="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center p-6 md:p-8">
				<ErrorAlert title={error.title} friendly={friendlyErrorMessage(error.detail) ?? undefined} detail={error.detail} />
			</LauncherPageScaffold>
		);
	}

	if (!settingsState || !profile) {
		return (
			<LauncherPageScaffold innerClassName="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 md:py-10">
				<Panel>
					<div className="mx-auto max-w-xl">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="mt-3 h-10 w-72" />
						<Skeleton className="mt-3 h-4 w-full" />
						<Skeleton className="mt-2 h-4 w-5/6" />
						<div className="mt-6 grid gap-3">
							<Skeleton className="h-12 w-full" />
							<Skeleton className="h-12 w-full" />
							<Skeleton className="h-12 w-full" />
						</div>
					</div>
				</Panel>
				<Panel>
					<Skeleton className="h-4 w-24" />
					<Skeleton className="mt-4 h-24 w-full" />
				</Panel>
			</LauncherPageScaffold>
		);
	}

	const s = settingsState;
	const hasSelectedVersion = Boolean(s.selectedVersionId && String(s.selectedVersionId).trim().length > 0);
	const isReady =
		!busy &&
		hasSelectedVersion &&
		String(javaLine).includes('✔') &&
		(status.state === 'idle' || status.state === 'checking');
	const playPhase: PlayButtonPhase = useMemo(() => {
		if (!busy) return 'idle';
		const t = String(launchStatus ?? status.text ?? '').toLowerCase();
		if (t.includes('download')) return 'downloading';
		if (t.includes('launch')) return 'launching';
		return 'checking';
	}, [busy, launchStatus, status.text]);

	return (
		<LauncherPageScaffold innerClassName="mx-auto flex w-full min-h-0 flex-1 flex-col">
			{error && (
				<ErrorAlert title={error.title} friendly={friendlyErrorMessage(error.detail) ?? undefined} detail={error.detail} />
			)}

			<div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center">
				<div className="flex w-full max-w-[560px] flex-col items-center text-center">
					<div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-vex-accent/10 blur-3xl" />

					{/* 1) Title (optional) */}
					<div className="relative">
						<div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-vex-muted">VEX LAUNCHER</div>
						<div className="mt-3 text-[32px] font-bold tracking-tight text-vex-text">Play</div>
					</div>

					{/* Title → Play: 32px */}
					<div className="relative mt-8">
						<PlayButton phase={playPhase} disabled={busy || !hasSelectedVersion} onClick={() => void onPlay()} />
					</div>

					{/* Play → Versions: 20px */}
					<div className="mt-5 w-full">
						<VersionCarousel
							key={carouselKey}
							value={s.selectedVersionId}
							onChange={(id) => {
								setVersionChoiceId(id);
							}}
						/>
					</div>

					<VersionProfileChoiceDialog
						open={Boolean(versionChoiceId)}
						versionId={versionChoiceId}
						onClose={() => {
							setVersionChoiceId(null);
							setCarouselKey((k) => k + 1);
							void refresh();
						}}
						onUpdateProfile={async () => {
							const id = versionChoiceId;
							if (!id) return;
							await persist({ selectedVersionId: id }, true);
							setVersionChoiceId(null);
							setCarouselKey((k) => k + 1);
						}}
						onCreateProfile={async () => {
							const id = versionChoiceId;
							if (!id) return;
							try {
								await ProfilesService.create({ name: `Minecraft ${id}`, minecraftVersion: id, loader: 'fabric' });
								setVersionChoiceId(null);
								setCarouselKey((k) => k + 1);
								await refresh();
								ToastService.push({ type: 'success', title: 'Profile created' });
							} catch (e) {
								ToastService.push({ type: 'error', title: 'Create failed', message: e instanceof Error ? e.message : String(e) });
							}
						}}
					/>

					{/* Versions → Status: 16px */}
					<div className="mt-4 flex flex-col items-center">
						<div className="text-[13px] text-vex-dim">{status.text}</div>

						{/* Status → Progress: 8px */}
						<div className="mt-2">
							<div className="h-[6px] w-[320px] overflow-hidden rounded-full bg-[#1F1F2A]">
								<div
									className="h-[6px] rounded-full bg-[#7C5CFF]"
									style={{ width: `${Math.round(status.progress)}%`, transition: 'width 160ms var(--vex-ease)' }}
								/>
							</div>
						</div>
					</div>

					{/* Extra launcher-only info stays below the spec block */}
					<div className="mt-5 w-full max-w-[320px]">
						<Button
							variant="secondary"
							className="w-full h-[36px] rounded-[12px] px-4 text-sm"
							loading={busy && !launchStatus}
							disabled={busy || !hasSelectedVersion}
							onClick={() => void onDevTestLaunch()}
						>
							Dev Test Launch
						</Button>
					</div>

					{!profile.signedIn && (
						<div className="mt-4 w-full max-w-[320px] rounded-[12px] bg-[#1B1B23] px-4 py-3 text-left text-[12px] text-vex-dim">
							<span className="font-semibold text-vex-text">Signed out.</span> Microsoft sign-in unlocks full play after approval.
						</div>
					)}
				</div>
			</div>
		</LauncherPageScaffold>
	);
}
