import { ConsoleService } from './ConsoleService';

export type StatusState = 'idle' | 'checking' | 'downloading' | 'launching' | 'error';

export type StatusSnapshot = {
	state: StatusState;
	text: string;
	progress: number; // 0..100
};

type Listener = () => void;

function clamp(n: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, n));
}

function consoleServiceLog(message: string, type: 'info' | 'error'): void {
	// Avoid logging the idle reset spam.
	if (message === 'Idle') return;
	ConsoleService.log(message, type);
}

/**
 * Global status/progress store for the launcher.
 * Renderer-only (React reads it through `useStatus`).
 */
export class StatusService {
	private static listeners = new Set<Listener>();
	private static snapshot: StatusSnapshot = { state: 'idle', text: 'Idle', progress: 0 };

	// Animated progress (smooth UI): store target separately.
	private static targetProgress = 0;
	private static raf: number | null = null;

	static getSnapshot(): StatusSnapshot {
		return this.snapshot;
	}

	static subscribe(listener: Listener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private static emit(): void {
		for (const l of this.listeners) l();
	}

	static set(partial: Partial<StatusSnapshot>): void {
		this.snapshot = {
			...this.snapshot,
			...partial,
			progress: partial.progress === undefined ? this.snapshot.progress : clamp(partial.progress, 0, 100),
		};
		this.targetProgress = this.snapshot.progress;
		this.emit();
	}

	static setState(state: StatusState, text?: string): void {
		const nextText = text ?? this.snapshot.text;
		// Log status transitions into the launcher console (premium “alive” feel).
		if (nextText !== this.snapshot.text) {
			// Static import is safe here; keep this fast + reliable.
			// eslint-disable-next-line @typescript-eslint/no-use-before-define
			consoleServiceLog(nextText, state === 'error' ? 'error' : 'info');
		}
		this.set({ state, text: nextText });
	}

	static setText(text: string): void {
		if (text !== this.snapshot.text) {
			// eslint-disable-next-line @typescript-eslint/no-use-before-define
			consoleServiceLog(text, this.snapshot.state === 'error' ? 'error' : 'info');
		}
		this.set({ text });
	}

	/**
	 * Smoothly animate progress toward a target 0..100.
	 * Call this repeatedly (or on events) to avoid instant jumps.
	 */
	static setProgressTarget(target: number): void {
		this.targetProgress = clamp(target, 0, 100);
		if (this.raf !== null) return;
		const tick = () => {
			const cur = this.snapshot.progress;
			const t = this.targetProgress;
			const next = cur + (t - cur) * 0.18; // easing
			const snapped = Math.abs(t - next) < 0.2 ? t : next;
			this.snapshot = { ...this.snapshot, progress: clamp(snapped, 0, 100) };
			this.emit();
			if (snapped !== t) {
				this.raf = window.requestAnimationFrame(tick);
			} else {
				this.raf = null;
			}
		};
		this.raf = window.requestAnimationFrame(tick);
	}

	static reset(): void {
		this.targetProgress = 0;
		this.snapshot = { state: 'idle', text: 'Idle', progress: 0 };
		if (this.raf !== null) {
			window.cancelAnimationFrame(this.raf);
			this.raf = null;
		}
		this.emit();
	}
}
