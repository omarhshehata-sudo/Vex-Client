import type { JavaCandidate } from '../vite-env';
import type { JavaValidateResponse } from '../vite-env';
import { ConsoleService } from './ConsoleService';

function api() {
	const a = window.vexLauncher;
	if (!a) throw new Error('Launcher API unavailable.');
	return a;
}

export class JavaService {
	static async detect(): Promise<JavaCandidate[]> {
		const r = await api().javaDetect();
		ConsoleService.log(`Java detect: found ${r.candidates.length} candidate(s).`, 'info');
		for (const c of r.candidates) {
			ConsoleService.log(`Java candidate: ${c.path}${c.major ? ` (Java ${c.major})` : ''}`, 'info');
		}
		return r.candidates;
	}

	static async validateJava(javaPath: string): Promise<JavaValidateResponse> {
		const r = await api().javaValidate(javaPath);
		if (r.ok) {
			const major = r.candidate.major;
			if (major !== undefined && major < 21) {
				ConsoleService.log(`Java at ${r.candidate.path} is Java ${major} (recommended 21+).`, 'warn');
			} else {
				ConsoleService.log(`Java validated: ${r.candidate.path}${major ? ` (Java ${major})` : ''}`, 'success');
			}
		} else {
			ConsoleService.log(`Java validate failed: ${r.message}`, 'error');
		}
		return r;
	}
}

