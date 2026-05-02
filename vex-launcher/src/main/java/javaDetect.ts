import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

export type JavaCandidate = {
	path: string;
	versionText?: string;
	major?: number;
};

function parseMajor(versionOutput: string): number | undefined {
	// Examples:
	// openjdk version "21.0.2" 2024-01-16
	// java version "1.8.0_402"
	const m = versionOutput.match(/version\s+\"([0-9]+)(?:\.([0-9]+))?/i);
	if (!m) return undefined;
	const first = Number(m[1]);
	const second = m[2] ? Number(m[2]) : undefined;
	if (Number.isFinite(first) && first === 1 && second && Number.isFinite(second)) return second; // 1.8 -> 8
	if (Number.isFinite(first)) return first;
	return undefined;
}

function javaVersion(path: string): { text?: string; major?: number; error?: string } {
	try {
		const r = spawnSync(path, ['-version'], { encoding: 'utf8' });
		const out = `${r.stderr ?? ''}\n${r.stdout ?? ''}`.trim();
		if (r.error) return { error: r.error.message };
		if (r.status !== 0 && r.status !== null) {
			return { error: (out || `Exit code ${r.status}`).slice(0, 400) };
		}
		const text = out.split('\n').slice(0, 3).join('\n') || undefined;
		return { text, major: parseMajor(out) };
	} catch (e) {
		return { error: e instanceof Error ? e.message : String(e) };
	}
}

export function validateJavaPath(path: string): { ok: true; candidate: JavaCandidate } | { ok: false; message: string } {
	const p = String(path ?? '').trim();
	if (!p) return { ok: false, message: 'Empty Java path.' };
	if (process.platform !== 'win32' && p.includes('\\')) {
		// allow, just don't reject
	}
	const v = javaVersion(p);
	if (v.error) return { ok: false, message: v.error };
	const text = v.text ?? '(no version output)';
	return { ok: true, candidate: { path: p, versionText: text, major: v.major } };
}

function uniqByPath(list: JavaCandidate[]): JavaCandidate[] {
	const seen = new Set<string>();
	const out: JavaCandidate[] = [];
	for (const c of list) {
		const p = c.path;
		if (seen.has(p)) continue;
		seen.add(p);
		out.push(c);
	}
	return out;
}

export function detectJavaCandidates(): JavaCandidate[] {
	const candidates: JavaCandidate[] = [];

	// PATH java
	try {
		const which = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['java'], { encoding: 'utf8' });
		if (which.status === 0) {
			const p = (which.stdout ?? '').trim().split('\n')[0]?.trim();
			if (p) candidates.push({ path: p });
		}
	} catch {
		/* ignore */
	}

	// JAVA_HOME
	const javaHome = process.env.JAVA_HOME?.trim();
	if (javaHome) {
		const p = join(javaHome, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
		if (existsSync(p)) candidates.push({ path: p });
	}

	// macOS: scan /Library/Java/JavaVirtualMachines
	if (process.platform === 'darwin') {
		// Explicit system java shim.
		if (existsSync('/usr/bin/java')) candidates.push({ path: '/usr/bin/java' });
		const root = '/Library/Java/JavaVirtualMachines';
		if (existsSync(root)) {
			for (const dir of readdirSync(root)) {
				const p = join(root, dir, 'Contents', 'Home', 'bin', 'java');
				if (existsSync(p)) candidates.push({ path: p });
			}
		}
	}

	// Windows: scan Program Files/Java/*
	if (process.platform === 'win32') {
		const roots = [
			process.env['ProgramFiles'] ?? 'C:\\\\Program Files',
			process.env['ProgramFiles(x86)'] ?? 'C:\\\\Program Files (x86)',
		];
		for (const r of roots) {
			const javaRoot = join(r, 'Java');
			if (!existsSync(javaRoot)) continue;
			for (const dir of readdirSync(javaRoot)) {
				const p = join(javaRoot, dir, 'bin', 'java.exe');
				if (existsSync(p)) candidates.push({ path: p });
			}
		}
	}

	// Linux: common locations
	if (process.platform === 'linux') {
		const roots = ['/usr/lib/jvm', '/usr/java'];
		for (const r of roots) {
			if (!existsSync(r)) continue;
			for (const dir of readdirSync(r)) {
				const p = join(r, dir, 'bin', 'java');
				if (existsSync(p)) candidates.push({ path: p });
			}
		}
	}

	const unique = uniqByPath(candidates);
	return unique.map((c) => {
		const v = javaVersion(c.path);
		return { ...c, versionText: v.text ?? v.error, major: v.major };
	});
}

