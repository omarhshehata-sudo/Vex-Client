import type { ReactNode } from 'react';

export function PageHeader({
	title,
	description,
	right,
}: {
	title: ReactNode;
	description?: ReactNode;
	right?: ReactNode;
}) {
	return (
		<div className="flex flex-wrap items-start justify-between gap-4">
			<div className="min-w-0">
				<div className="text-[34px] font-bold tracking-tight text-vex-text">{title}</div>
				{description && <div className="mt-3 max-w-2xl text-[13px] leading-relaxed text-vex-muted">{description}</div>}
			</div>
			{right && <div className="shrink-0">{right}</div>}
		</div>
	);
}

