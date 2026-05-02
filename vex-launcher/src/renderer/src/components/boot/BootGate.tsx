import { useEffect, useMemo, useRef, useState } from 'react';

import { LoadingScreen, type BootPhase } from './LoadingScreen';
import { JavaService } from '../../services/JavaService';
import { SettingsService } from '../../services/SettingsService';

type BootStep = { text: string; target: number };

function clamp(n: number, min: number, max: number) {
	return Math.max(min, Math.min(max, n));
}

/** Four phases shown on the cosmic loading timeline (must match `LoadingScreen` icons). */
const BOOT_TIMELINE: readonly string[] = ['INITIATING', 'CHECKING FILES', 'PREPARING', 'LAUNCHING'];

export function BootGate({ children }: { children: React.ReactNode }) {
	const steps: BootStep[] = useMemo(
		() => [
			{ text: BOOT_TIMELINE[0]!, target: 16 },
			{ text: BOOT_TIMELINE[1]!, target: 42 },
			{ text: BOOT_TIMELINE[2]!, target: 68 },
			{ text: BOOT_TIMELINE[3]!, target: 92 },
		],
		[]
	);

	const targetDurationMs = useMemo(() => 4800 + Math.round(Math.random() * 4200), []);

	const [ready, setReady] = useState(false);
	const [exiting, setExiting] = useState(false);
	const [activeStepIndex, setActiveStepIndex] = useState(0);
	const [phase, setPhase] = useState<BootPhase>('loading');
	const [progress, setProgress] = useState(0);

	const target = useRef(0);
	const raf = useRef<number | null>(null);
	const exitTimer = useRef<number | null>(null);
	const hardFailSafe = useRef<number | null>(null);
	const runToken = useRef(0);

	useEffect(() => {
		target.current = 0;
		const tick = () => {
			setProgress((cur) => {
				const t = target.current;
				const next = cur + (t - cur) * 0.14;
				const snapped = Math.abs(t - next) < 0.35 ? t : next;
				return clamp(snapped, 0, 100);
			});
			raf.current = window.requestAnimationFrame(tick);
		};
		raf.current = window.requestAnimationFrame(tick);
		return () => {
			if (raf.current !== null) window.cancelAnimationFrame(raf.current);
			raf.current = null;
		};
	}, []);

	useEffect(() => {
		runToken.current += 1;
		const token = runToken.current;

		const run = async () => {
			if (hardFailSafe.current !== null) window.clearTimeout(hardFailSafe.current);
			hardFailSafe.current = window.setTimeout(() => {
				setExiting(true);
				window.setTimeout(() => setReady(true), 260);
			}, 12000);

			const startedAt = Date.now();
			const go = (idx: number) => {
				const s = steps[Math.max(0, Math.min(steps.length - 1, idx))]!;
				setActiveStepIndex(Math.max(0, Math.min(steps.length - 1, idx)));
				target.current = s.target;
			};

			go(0);
			await new Promise((r) => window.setTimeout(r, 140));
			if (runToken.current !== token) return;

			go(1);
			let settings: { javaPath?: string } | null = null;
			try {
				if (window.vexLauncher?.settingsGet) {
					settings = await SettingsService.load();
				} else {
					await new Promise((r) => window.setTimeout(r, 200));
					settings = null;
				}
			} catch {
				settings = null;
			}
			if (runToken.current !== token) return;

			go(2);
			try {
				const javaPath = settings?.javaPath ?? 'java';
				if (window.vexLauncher) {
					await JavaService.validateJava(javaPath);
				} else {
					await new Promise((r) => window.setTimeout(r, 200));
				}
			} catch {
				/* Java validation is advisory; timeline continues regardless */
			}
			if (runToken.current !== token) return;

			await new Promise((r) => window.setTimeout(r, 200));
			if (runToken.current !== token) return;

			go(3);
			await new Promise((r) => window.setTimeout(r, 160));
			if (runToken.current !== token) return;

			target.current = 93;
			const elapsed = Date.now() - startedAt;
			const remaining = Math.max(0, targetDurationMs - elapsed);
			const hold = Math.max(0, remaining - 400);
			if (hold > 0) await new Promise((r) => window.setTimeout(r, hold));
			if (runToken.current !== token) return;

			target.current = 100;
			setPhase('ready');
			await new Promise((r) => window.setTimeout(r, 200));
			if (runToken.current !== token) return;

			setExiting(true);
			await new Promise((r) => window.setTimeout(r, 220));
			if (runToken.current !== token) return;

			setReady(true);
		};

		void run();
		return () => {
			runToken.current += 1;
			if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
			exitTimer.current = null;
			if (hardFailSafe.current !== null) window.clearTimeout(hardFailSafe.current);
			hardFailSafe.current = null;
		};
	}, [steps, targetDurationMs]);

	useEffect(() => {
		if (!exiting) return;
		if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
		exitTimer.current = window.setTimeout(() => setReady(true), 700);
		return () => {
			if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
			exitTimer.current = null;
		};
	}, [exiting]);

	if (ready) return <>{children}</>;

	return (
		<LoadingScreen
			progress={progress}
			steps={BOOT_TIMELINE}
			activeStepIndex={activeStepIndex}
			exiting={exiting}
			phase={phase}
		/>
	);
}
