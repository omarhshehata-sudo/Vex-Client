import type { ReactNode } from 'react';

import { HomeHeroSpaceBackdrop } from '../components/home/HomeHeroSpaceBackdrop';
import { LauncherMainNavBar } from '../components/layout/LauncherMainNavBar';

type Props = {
	children: ReactNode;
	/** Classes on the inner width-constrained column (scrolls with page). */
	innerClassName?: string;
	notificationDot?: boolean;
};

const defaultInner = 'mx-auto flex w-full max-w-[1320px] min-h-0 flex-1 flex-col';

/**
 * Full-bleed shell: top nav + cosmic backdrop + scroll region.
 * Used for routes that no longer show the left icon sidebar (top bar is primary nav).
 */
export function LauncherPageScaffold({ children, innerClassName = defaultInner, notificationDot = false }: Props) {
	return (
		<div className="vex-no-drag flex min-h-screen flex-col bg-[#050505] text-white">
			<LauncherMainNavBar notificationDot={notificationDot} />

			<div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
				<div className="pointer-events-none absolute inset-0">
					<HomeHeroSpaceBackdrop />
				</div>
				<div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#050505]/70 via-transparent to-[#050505]/92" />

				<div className="vex-app-scroll relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 md:px-8 md:py-8">
					<div className={innerClassName}>{children}</div>
				</div>
			</div>
		</div>
	);
}
