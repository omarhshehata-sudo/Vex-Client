import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AccountsPage } from './pages/AccountsPage';
import { HomePage } from './pages/HomePage';
import { PlayPage } from './pages/PlayPage';
import { SettingsPage } from './pages/SettingsPage';
import { VersionsPage } from './pages/VersionsPage';
import { NewsPage } from './pages/NewsPage';
import { ModsPage } from './pages/ModsPage';
import { ProfilesPage } from './pages/ProfilesPage';
import { AppLayout } from './layout/AppLayout';

export function App() {
	return (
		<HashRouter>
			<Routes>
				<Route element={<AppLayout />}>
					<Route index element={<HomePage />} />
					<Route path="/play" element={<PlayPage />} />
					<Route path="/news" element={<NewsPage />} />
					<Route path="/versions" element={<VersionsPage />} />
					<Route path="/mods" element={<ModsPage />} />
					<Route path="/profiles" element={<ProfilesPage />} />
					<Route path="/account" element={<AccountsPage />} />
					<Route path="/accounts" element={<Navigate to="/account" replace />} />
					<Route path="/settings" element={<SettingsPage />} />
					<Route path="*" element={<Navigate to="/" replace />} />
				</Route>
			</Routes>
		</HashRouter>
	);
}
