function api() {
	return window.vexLauncher;
}

export class UpdateService {
	static async checkForUpdates(): Promise<string> {
		const r = await api()?.updatesCheck();
		return r?.message ?? 'Update service unavailable.';
	}
}
