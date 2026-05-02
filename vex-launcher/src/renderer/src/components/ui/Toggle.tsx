import type { ReactNode } from 'react';

export function Toggle({
	checked,
	onChange,
	title,
	description,
}: {
	checked: boolean;
	onChange: (checked: boolean) => void;
	title: ReactNode;
	description?: ReactNode;
}) {
	return (
		<label className="vex-no-drag flex cursor-pointer items-start justify-between gap-4 rounded-vex border border-vex-border/60 bg-vex-surface px-4 py-3 transition-[border-color,background-color,box-shadow,opacity] duration-[var(--vex-ui-ms)] vex-ease hover:border-vex-accent/30">
			<div className="min-w-0">
				<div className="text-sm font-medium text-vex-text">{title}</div>
				{description && <div className="mt-0.5 text-[11px] text-vex-dim">{description}</div>}
			</div>
			<button
				type="button"
				aria-pressed={checked}
				onClick={() => onChange(!checked)}
				className={[
					'relative mt-0.5 h-6 w-11 rounded-full border transition duration-200 ease-out',
					checked ? 'border-vex-accent/40 bg-vex-accent/35' : 'border-vex-border/60 bg-vex-bg/40',
				].join(' ')}
			>
				<span
					className={[
						'absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-sm transition duration-200 ease-out',
						checked ? 'left-[22px]' : 'left-[2px]',
					].join(' ')}
				/>
			</button>
		</label>
	);
}

