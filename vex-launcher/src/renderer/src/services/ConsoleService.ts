export type ConsoleLogType = 'info' | 'warn' | 'error' | 'success';

export type ConsoleLogEntry = {
	id: string;
	at: number; // epoch ms
	type: ConsoleLogType;
	message: string;
};

type Listener = () => void;

function clampLines(entries: ConsoleLogEntry[], max: number): ConsoleLogEntry[] {
	if (entries.length <= max) return entries;
	return entries.slice(entries.length - max);
}

function id(): string {
	// good enough for UI keys
	return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export class ConsoleService {
	private static listeners = new Set<Listener>();
	private static entries: ConsoleLogEntry[] = [];
	private static maxEntries = 1200;

	static getEntries(): ConsoleLogEntry[] {
		return this.entries;
	}

	static subscribe(listener: Listener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private static emit(): void {
		for (const l of this.listeners) l();
	}

	static log(message: string, type: ConsoleLogType = 'info'): void {
		const m = String(message ?? '').trimEnd();
		if (!m) return;
		this.entries = clampLines([...this.entries, { id: id(), at: Date.now(), type, message: m }], this.maxEntries);
		this.emit();
	}

	static clear(): void {
		this.entries = [];
		this.emit();
	}

	static toText(entries = this.entries): string {
		return entries
			.map((e) => {
				const time = new Date(e.at).toISOString();
				return `[${time}] [${e.type.toUpperCase()}] ${e.message}`;
			})
			.join('\n');
	}
}
