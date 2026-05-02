import type { ReactNode } from 'react';

/** Scroll root for routed pages (each page supplies its own chrome, e.g. `LauncherPageScaffold`). */
export function MainContainer({ children }: { children: ReactNode }) {
	return (
		<div className="vex-app-scroll relative min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
			{children}
		</div>
	);
}
