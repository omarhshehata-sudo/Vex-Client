import { Outlet } from 'react-router-dom';

import { Sidebar } from './Sidebar';
import { ToastViewport } from '../ui/ToastViewport';

export function AppShell() {
	const padTop = window.vexLauncher?.platform === 'darwin' ? 'pt-10' : 'pt-4';

	return (
		<div className={`vex-ambient-bg relative flex min-h-screen flex-col ${padTop}`}>
			<div aria-hidden className="pointer-events-none absolute inset-0 vex-vignette" />
			<div className="flex min-h-0 flex-1">
				<Sidebar />
				<div className="vex-app-scroll min-w-0 flex-1 overflow-y-auto p-6">
					<div className="mx-auto flex max-w-6xl flex-col gap-6">
						<Outlet />
					</div>
				</div>
			</div>
			<ToastViewport />
		</div>
	);
}
