import type { LauncherProfile } from './types';

function api() {
	const a = window.vexLauncher;
	if (!a) throw new Error('Launcher API unavailable.');
	return a;
}

export class ProfilesService {
	static async list(): Promise<LauncherProfile[]> {
		const r = (await api().profilesList()) as { ok: true; profiles: LauncherProfile[] };
		if (!r.ok) return [];
		return r.profiles;
	}

	static async setActive(profileId: string): Promise<void> {
		const r = (await api().profilesSetActive(profileId)) as { ok: true } | { ok: false; title: string; detail: string };
		if (!r.ok) throw new Error(r.detail || r.title);
	}

	static async create(input: Partial<LauncherProfile> & { name?: string; minecraftVersion?: string }): Promise<LauncherProfile> {
		const r = (await api().profilesCreate(input)) as { ok: true; profile: LauncherProfile } | { ok: false; title: string; detail: string };
		if (!r.ok) throw new Error(r.detail || r.title);
		return r.profile;
	}

	static async update(id: string, patch: Partial<LauncherProfile>): Promise<LauncherProfile> {
		const r = (await api().profilesUpdate({ id, patch })) as { ok: true; profile: LauncherProfile } | { ok: false; title: string; detail: string };
		if (!r.ok) throw new Error(r.detail || r.title);
		return r.profile;
	}

	static async delete(profileId: string): Promise<void> {
		const r = (await api().profilesDelete(profileId)) as { ok: true } | { ok: false; title: string; detail: string };
		if (!r.ok) throw new Error(r.detail || r.title);
	}

	static async duplicate(profileId: string): Promise<LauncherProfile> {
		const r = (await api().profilesDuplicate(profileId)) as { ok: true; profile: LauncherProfile } | { ok: false; title: string; detail: string };
		if (!r.ok) throw new Error(r.detail || r.title);
		return r.profile;
	}
}
