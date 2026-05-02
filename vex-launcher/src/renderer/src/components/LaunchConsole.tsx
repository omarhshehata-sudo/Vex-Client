import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef } from 'react';

import { Panel } from './ui/Panel';

function lineIsError(line: string): boolean {
	const s = line.toLowerCase();
	return s.startsWith('[error]') || s.startsWith('error:') || s.startsWith('minecraft launch failed') || (s.includes('failed') && s.includes('minecraft'));
}

export function LaunchConsole({
	lines,
	header,
	rightHeader,
}: {
	lines: string[];
	header?: ReactNode;
	rightHeader?: ReactNode;
}) {
	const bottomRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
	}, [lines.length]);

	const content = useMemo(() => {
		return lines.map((line, idx) => (
			<div
				key={`${idx}-${line.slice(0, 16)}`}
				className={[
					'whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed',
					lineIsError(line) ? 'text-red-300' : 'text-vex-dim',
				].join(' ')}
			>
				{line}
			</div>
		));
	}, [lines]);

	return (
		<Panel className="p-0">
			<div className="flex items-center justify-between gap-3 border-b border-vex-border/70 px-4 py-3">
				<div className="text-xs font-semibold uppercase tracking-widest text-vex-glow/90">
					{header ?? 'Launch Console'}
				</div>
				{rightHeader}
			</div>
			<div className="vex-app-scroll max-h-72 overflow-auto px-4 py-3">{content}</div>
			<div ref={bottomRef} />
		</Panel>
	);
}

