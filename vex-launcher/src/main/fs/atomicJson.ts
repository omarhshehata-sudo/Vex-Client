import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, basename, join } from 'node:path';
import { randomUUID } from 'node:crypto';

export function writeJsonFileAtomic(path: string, value: unknown): void {
	const dir = dirname(path);
	mkdirSync(dir, { recursive: true });
	const tmp = join(dir, `.${basename(path)}.${randomUUID()}.tmp`);
	writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8');
	renameSync(tmp, path);
}
