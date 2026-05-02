import { useEffect, useMemo, useRef, useState } from 'react';

import { VersionService } from '../../services/VersionService';
import type { VersionEntry } from '../../services/types';
import { VersionCard } from './VersionCard';

export function VersionSelector({
	value,
	onChange,
}: {
	value: string | null;
	onChange: (id: string) => void;
}) {
	const [versions, setVersions] = useState<VersionEntry[]>([]);
	const [error, setError] = useState<string | null>(null);
	const rowRef = useRef<HTMLDivElement | null>(null);
	const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

	useEffect(() => {
		void (async () => {
			try {
				const v = await VersionService.listVersions();
				setVersions(v);
				setError(null);
			} catch (e) {
				setError(e instanceof Error ? e.message : String(e));
			}
		})();
	}, []);

	const list = useMemo(() => {
		// Main process returns a curated catalog resolved against Mojang's manifest.
		return versions;
	}, [versions]);

	useEffect(() => {
		if (!value) return;
		const el = itemRefs.current[value];
		if (!el) return;
		el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
	}, [value, list.length]);

	if (error) {
		return <div className="mt-2 text-[11px] text-vex-error/90">Could not load versions. {error}</div>;
	}

	return (
		<div className="mt-3">
			<div className="flex items-center justify-between gap-3">
				<div className="text-xs font-semibold uppercase tracking-widest text-vex-dim">Version</div>
				<div className="text-[11px] text-vex-dim">Click a card to select</div>
			</div>

			<div
				ref={rowRef}
				className="vex-app-scroll vex-version-row mt-3 flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none]"
			>
				{/* hide scrollbar (webkit) */}
				<style>{`.vex-version-row::-webkit-scrollbar{display:none}`}</style>

				{list.map((v, idx) => (
					<div key={v.id} className="vex-version-row-card-in shrink-0" style={{ animationDelay: `${Math.min(idx, 16) * 42}ms` }}>
						<div className="sr-only">{v.id}</div>
						<div>
							<VersionCard
								id={v.id}
								subtitle={v.label}
								badge={v.tags?.includes('latest') ? 'Latest' : undefined}
								selected={v.id === value}
								onClick={() => onChange(v.id)}
								ref={(el) => {
									itemRefs.current[v.id] = el;
								}}
							/>
						</div>
					</div>
				))}
			</div>

			{!value && <div className="mt-2 text-[11px] text-vex-dim">Pick a version to enable Play.</div>}
		</div>
	);
}

