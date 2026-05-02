import { create } from 'zustand';

import type { AuthProfile } from '../services/types';
import { applyLauncherUx } from '../launcherUx';
import { AccountService } from '../services/AccountService';
import { ModsService } from '../services/ModsService';
import { SettingsService } from '../services/SettingsService';
import { VersionService } from '../services/VersionService';

type LauncherStore = {
	settings: LauncherSettings | null;
	installedVersionIds: string[];
	modCount: number;
	account: AuthProfile | null;
	hydrate: () => Promise<void>;
	applySettings: (next: LauncherSettings) => void;
	refreshInstalled: () => Promise<void>;
	refreshAccount: () => Promise<void>;
	/** Persist merged patch and refresh local `settings`. */
	saveSettings: (patch: Partial<LauncherSettings>) => Promise<LauncherSettings>;
};

export const useLauncherStore = create<LauncherStore>((set, get) => ({
	settings: null,
	installedVersionIds: [],
	modCount: 0,
	account: null,

	hydrate: async () => {
		const [settings, installedVersionIds, account, modsBundle] = await Promise.all([
			SettingsService.load(),
			VersionService.listInstalled(),
			AccountService.getProfile(),
			ModsService.getState().catch(() => null),
		]);
		set({
			settings,
			installedVersionIds,
			account,
			modCount: modsBundle?.modCount ?? 0,
		});
		applyLauncherUx(settings);
	},

	applySettings: (settings) => {
		applyLauncherUx(settings);
		set({ settings });
	},

	refreshInstalled: async () => {
		const installedVersionIds = await VersionService.listInstalled();
		set({ installedVersionIds });
	},

	refreshAccount: async () => {
		set({ account: await AccountService.getProfile() });
	},

	saveSettings: async (patch) => {
		const cur = get().settings ?? (await SettingsService.load());
		const next = await SettingsService.save({ ...cur, ...patch });
		let modCount = get().modCount;
		try {
			const m = await ModsService.getState();
			modCount = m.modCount;
		} catch {
			/* ignore */
		}
		set({ settings: next, modCount });
		return next;
	},
}));
