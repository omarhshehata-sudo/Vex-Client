import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { VersionService } from './services/versionService';

export function listInstalledVersionIds(gameDirectory: string): string[] {
	const root = join(gameDirectory, 'versions');
	if (!existsSync(root)) return [];
	const out: string[] = [];
	for (const ent of readdirSync(root, { withFileTypes: true })) {
		if (!ent.isDirectory()) continue;
		const id = ent.name;
		const json = VersionService.versionJsonPath(gameDirectory, id);
		if (existsSync(json)) out.push(id);
	}
	out.sort((a, b) => a.localeCompare(b));
	return out;
}

export function deleteInstalledVersion(gameDirectory: string, versionId: string): void {
	const id = String(versionId ?? '').trim();
	if (!id || !/^[0-9A-Za-z._+-]+$/.test(id)) {
		throw new Error('Invalid version id.');
	}
	const root = join(gameDirectory, 'versions', id);
	if (!existsSync(root)) {
		throw new Error(`Version ${id} is not installed (no versions/${id} folder).`);
	}
	rmSync(root, { recursive: true, force: true });
}
