import { useLauncherStore } from '../state/launcherStore';
import { ConsoleService } from './ConsoleService';

export type ToastType = 'info' | 'success' | 'warn' | 'error';

export type Toast = {
	id: string;
	type: ToastType;
	title: string;
	message?: string;
	at: number;
};

type Listener = () => void;

function uid(): string {
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

class ToastStore {
	private listeners = new Set<Listener>();
	private toasts: Toast[] = [];

	subscribe(fn: Listener) {
		this.listeners.add(fn);
		return () => this.listeners.delete(fn);
	}

	get() {
		return this.toasts;
	}

	push(t: Omit<Toast, 'id' | 'at'>, ttlMs = 3200) {
		const allowUi = useLauncherStore.getState().settings?.desktopNotifications !== false;
		if (!allowUi && t.type !== 'error') return;

		const toast: Toast = { ...t, id: uid(), at: Date.now() };
		this.toasts = [toast, ...this.toasts].slice(0, 4);
		this.emit();

		// Mirror high-signal events to console.
		if (t.type === 'error') ConsoleService.log(`${t.title}${t.message ? ` — ${t.message}` : ''}`, 'error');
		if (t.type === 'success') ConsoleService.log(`${t.title}${t.message ? ` — ${t.message}` : ''}`, 'success');

		window.setTimeout(() => this.dismiss(toast.id), ttlMs);
	}

	dismiss(id: string) {
		const before = this.toasts.length;
		this.toasts = this.toasts.filter((x) => x.id !== id);
		if (this.toasts.length !== before) this.emit();
	}

	clear() {
		this.toasts = [];
		this.emit();
	}

	private emit() {
		for (const fn of this.listeners) fn();
	}
}

export const ToastService = new ToastStore();

