import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

import { ToastViewport } from '../components/ui/ToastViewport';
import { MojangManifestService } from '../services/MojangManifestService';
import { useLauncherStore } from '../state/launcherStore';
import { MainContainer } from './MainContainer';

export function AppLayout() {
	const location = useLocation();

	useEffect(() => {
		MojangManifestService.prefetch();
		void useLauncherStore.getState().hydrate();
	}, []);

	return (
		<div className="relative flex min-h-screen flex-col bg-[#050505]">
			<div className="flex min-h-0 flex-1">
				<div className="flex min-w-0 flex-1">
					<div className="relative min-w-0 flex-1">
						<MainContainer>
							<div key={location.pathname} className="vex-route-enter">
								<Outlet />
							</div>
						</MainContainer>
					</div>
				</div>
			</div>

			<ToastViewport />
		</div>
	);
}

