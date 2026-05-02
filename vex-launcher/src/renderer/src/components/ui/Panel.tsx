import type { ReactNode } from 'react';

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
	return (
		<div
			className={`vex-fade-in vex-surface-animate relative overflow-hidden rounded-vex-lg border border-white/[0.04] bg-gradient-to-br from-white/[0.05] via-vex-surface to-vex-surface2 p-6 shadow-panel ring-1 ring-white/[0.03] ${className}`.trim()}
		>
			<div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-vex-accent/15 blur-3xl" />
			<div className="relative">{children}</div>
		</div>
	);
}
