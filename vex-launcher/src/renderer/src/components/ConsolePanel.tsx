import { useEffect, useMemo, useRef, useState } from 'react';

import { useConsole } from '../hooks/useConsole';
import { ConsoleService, type ConsoleLogEntry, type ConsoleLogType } from '../services/ConsoleService';
import { Panel } from './ui/Panel';

function formatTime(at: number): string {
	const d = new Date(at);
	return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function tagClass(t: ConsoleLogType): string {
	switch (t) {
		case 'success':
			return 'bg-vex-success/12 text-vex-success border-vex-success/30';
		case 'warn':
			return 'bg-vex-warning/12 text-vex-warning border-vex-warning/30';
		case 'error':
			return 'bg-vex-error/12 text-vex-error border-vex-error/30';
		default:
			return 'bg-white/5 text-vex-dim border-vex-border';
	}
}

function typeLabel(t: ConsoleLogType): string {
	return t.toUpperCase();
}

export function ConsolePanel({ defaultOpen = true }: { defaultOpen?: boolean }) {
	const [open, setOpen] = useState(defaultOpen);
	const [filter, setFilter] = useState<Set<ConsoleLogType>>(new Set(['info', 'success', 'warn', 'error']));

	const entries = useConsole(filter);
	const bottomRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!open) return;
		bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
	}, [entries.length, open]);

	const toggle = (t: ConsoleLogType) => {
		setFilter((prev) => {
			const next = new Set(prev);
			if (next.has(t)) next.delete(t);
			else next.add(t);
			return next;
		});
	};

	const copy = async () => {
		const text = ConsoleService.toText(entries);
		try {
			await navigator.clipboard.writeText(text);
			ConsoleService.log('Copied console logs to clipboard.', 'success');
		} catch (e) {
			ConsoleService.log(`Copy failed: ${e instanceof Error ? e.message : String(e)}`, 'error');
		}
	};

	const rows = useMemo(() => {
		return entries.map((e: ConsoleLogEntry) => (
			<div key={e.id} className="flex gap-3 py-1.5">
				<div className="w-[70px] shrink-0 text-[10px] text-vex-dim/90">{formatTime(e.at)}</div>
				<div
					className={[
						'mt-[1px] shrink-0 rounded border px-2 py-[2px] text-[10px] font-semibold tracking-wide',
						tagClass(e.type),
					].join(' ')}
				>
					{typeLabel(e.type)}
				</div>
				<div className="min-w-0 flex-1 whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-vex-text/90">
					{e.message}
				</div>
			</div>
		));
	}, [entries]);

	return (
		<Panel className="p-0">
			<button
				type="button"
				className="vex-no-drag flex w-full items-center justify-between gap-3 border-b border-vex-border/70 px-4 py-3 text-left"
				onClick={() => setOpen((v) => !v)}
			>
				<div className="text-xs font-semibold uppercase tracking-widest text-vex-glow/90">Launcher Console</div>
				<div className="text-[11px] text-vex-dim">{open ? 'Hide' : 'Show'}</div>
			</button>

			{open && (
				<div className="px-4 py-3">
					<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
						<div className="flex flex-wrap items-center gap-2">
							<button
								type="button"
								className="vex-no-drag rounded-vex border border-vex-border/60 bg-vex-bg/40 px-3 py-1.5 text-[11px] text-vex-text transition duration-200 ease-out hover:border-vex-accent/40 hover:bg-vex-raised"
								onClick={() => ConsoleService.clear()}
							>
								Clear
							</button>
							<button
								type="button"
								className="vex-no-drag rounded-vex border border-vex-border/60 bg-vex-bg/40 px-3 py-1.5 text-[11px] text-vex-text transition duration-200 ease-out hover:border-vex-accent/40 hover:bg-vex-raised"
								onClick={() => void copy()}
							>
								Copy logs
							</button>
						</div>

						<div className="flex flex-wrap items-center gap-2 text-[10px]">
							{(['info', 'success', 'warn', 'error'] as const).map((t) => (
								<button
									key={t}
									type="button"
									className={[
										'vex-no-drag rounded-lg border px-2 py-1 font-semibold tracking-wide',
										filter.has(t) ? tagClass(t) : 'border-vex-border/70 bg-vex-bg/30 text-vex-dim',
									].join(' ')}
									onClick={() => toggle(t)}
								>
									{t.toUpperCase()}
								</button>
							))}
						</div>
					</div>

					<div className="vex-app-scroll max-h-80 overflow-auto rounded-vex border border-vex-border/60 bg-vex-bg/40 px-3 py-2">
						{rows.length === 0 ? (
							<div className="py-8 text-center text-[11px] text-vex-dim">No logs yet.</div>
						) : (
							rows
						)}
						<div ref={bottomRef} />
					</div>
				</div>
			)}
		</Panel>
	);
}

