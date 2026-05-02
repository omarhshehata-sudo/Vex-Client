export type LaunchStatusMessage =
	| 'Checking account…'
	| 'Checking Java…'
	| 'Checking Minecraft files…'
	| 'Preparing launch…'
	| 'Launching Minecraft…';

type Fail = { ok: false; title: string; detail: string };

function api() {
	const a = window.vexLauncher;
	if (!a) throw new Error('Launcher API unavailable.');
	return a;
}

export type PlaySequenceResult =
	| Fail
	| { ok: true; summary: string; launch: { mode: 'started'; message: string } };

export class LauncherService {
	/**
	 * Full gated launch sequence with status callbacks for the UI.
	 * The final step calls main-process `launchMinecraft()` and streams process output via the console panel.
	 */
	static async runPlaySequence(onStatus: (s: LaunchStatusMessage) => void): Promise<PlaySequenceResult> {
		const ipc = api();

		onStatus('Checking account…');
		let g = await ipc.launchCheckAccount();
		if (!g.ok) return g;

		onStatus('Checking Java…');
		g = await ipc.launchCheckJava();
		if (!g.ok) return g;

		onStatus('Checking Minecraft files…');
		g = await ipc.launchCheckMinecraftFiles();
		if (!g.ok) return g;

		onStatus('Preparing launch…');
		const prep = await ipc.launchPrepare();
		if (!prep.ok) return prep;

		onStatus('Launching Minecraft…');
		const lm = await ipc.launchLaunchMinecraft();
		if (!lm.ok) return lm;

		return {
			ok: true,
			summary: prep.summary,
			launch: { mode: lm.mode, message: lm.message },
		};
	}

	/**
	 * Thin wrapper around the final IPC step (keeps a stable name for future real launches).
	 */
	static async launchMinecraft(): Promise<void> {
		const ipc = api();
		const lm = await ipc.launchLaunchMinecraft();
		if (!lm.ok) {
			throw new Error(`${lm.title}: ${lm.detail}`);
		}
	}

	static async devTestLaunch(): Promise<{ ok: true; message: string } | Fail> {
		const ipc = api();
		const r = await ipc.launchDevTestLaunch();
		return r;
	}
}
