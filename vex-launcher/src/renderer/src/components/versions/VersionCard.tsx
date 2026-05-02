import { forwardRef } from 'react';

export const VersionCard = forwardRef<
	HTMLButtonElement,
	{
		id: string;
		subtitle?: string;
		badge?: string;
		selected?: boolean;
		onClick?: () => void;
	}
>(function VersionCard({ id, subtitle, badge, selected, onClick }, ref) {
	return (
		<button
			ref={ref}
			type="button"
			onClick={onClick}
			className={[
				'vex-no-drag group relative shrink-0 select-none',
				'rounded-vex-lg border px-5 py-4 text-left transition-[transform,box-shadow,filter,border-color,background-color] duration-[280ms] vex-ease',
				'active:scale-[0.99]',
				selected
					? 'scale-[1.03] border-vex-accent/55 bg-vex-accent/10 shadow-vex'
					: 'border-vex-border/60 bg-vex-bg/35 hover:scale-[1.02] hover:border-vex-accent/40 hover:bg-vex-raised',
			].join(' ')}
		>
			{/* Glow */}
			<div
				aria-hidden
				className={[
					'pointer-events-none absolute -inset-6 rounded-[28px] blur-2xl transition-opacity duration-[280ms] vex-ease',
					selected ? 'bg-vex-accent/25 opacity-100' : 'bg-vex-accent/10 opacity-0 group-hover:opacity-100',
				].join(' ')}
			/>

			{/* Badge */}
			{badge && (
				<div className="absolute right-3 top-3 rounded-full border border-vex-accent/35 bg-vex-accent/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-vex-glow">
					{badge}
				</div>
			)}

			<div className="relative flex items-center justify-between gap-3">
				<div>
					<div className="text-center font-mono text-lg font-semibold tracking-tight text-vex-text">{id}</div>
					{subtitle && <div className="mt-1 text-center text-[11px] font-medium text-vex-dim">{subtitle}</div>}
				</div>
				{/* small icon */}
				<div
					aria-hidden
					className={[
						'flex h-9 w-9 items-center justify-center rounded-vex border text-xs font-semibold transition-[transform,border-color,background-color,color,box-shadow] duration-[280ms] vex-ease',
						selected ? 'border-vex-accent/40 bg-vex-accent/18 text-vex-text' : 'border-vex-border/60 bg-vex-bg/30 text-vex-dim group-hover:border-vex-accent/35',
					].join(' ')}
				>
					MC
				</div>
			</div>
		</button>
	);
});

