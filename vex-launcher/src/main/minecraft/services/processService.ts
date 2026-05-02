import { spawn } from 'node:child_process';
import readline from 'node:readline';

export type ProcessLineHandler = (line: string) => void;

export type SpawnJavaResult = {
	pid: number;
};

export type SpawnJavaOptions = {
	javaPath: string;
	args: string[];
	cwd: string;
	env?: Record<string, string>;
	/** When true, game keeps running if the launcher exits (stdio ignored, child unref). */
	detached?: boolean;
	onStdoutLine?: ProcessLineHandler;
	onStderrLine?: ProcessLineHandler;
	onExit?: (code: number | null, signal: NodeJS.Signals | null) => void;
};

function pipeLines(stream: NodeJS.ReadableStream, onLine: ProcessLineHandler | undefined): void {
	if (!onLine) return;
	const rl = readline.createInterface({ input: stream });
	rl.on('line', (line) => onLine(line));
}

/**
 * Spawn a Java process and stream stdout/stderr line-by-line.
 * Resolves once the OS actually starts the process (spawn event), not when it exits.
 */
export async function spawnJavaProcess(opts: SpawnJavaOptions): Promise<SpawnJavaResult> {
	const detached = Boolean(opts.detached);
	return new Promise((resolve, reject) => {
		const child = spawn(opts.javaPath, opts.args, {
			cwd: opts.cwd,
			env: opts.env ? { ...process.env, ...opts.env } : process.env,
			detached,
			windowsHide: true,
			stdio: detached ? 'ignore' : (['ignore', 'pipe', 'pipe'] as const),
		});

		child.once('spawn', () => {
			if (detached) child.unref();
			resolve({ pid: child.pid ?? -1 });
		});
		child.once('error', (e) => {
			reject(e);
		});

		if (!detached) {
			pipeLines(child.stdout!, opts.onStdoutLine);
			pipeLines(child.stderr!, opts.onStderrLine);
		}

		child.once('exit', (code, signal) => {
			opts.onExit?.(code, signal);
		});
	});
}

