import { release } from 'node:os';

import type { MinecraftFeatureFlags, MinecraftRule, MinecraftRuleOs } from './versionJsonTypes';

export type OsName = 'osx' | 'windows' | 'linux';

export function currentOsName(): OsName {
	if (process.platform === 'darwin') return 'osx';
	if (process.platform === 'win32') return 'windows';
	return 'linux';
}

/** Mojang `os.arch` values in version.json rules. */
export function currentOsArchRule(): string {
	if (process.arch === 'ia32' || process.arch === 'x32') return 'x86';
	if (process.arch === 'arm' || process.arch === 'arm64') return process.platform === 'darwin' ? 'arm64' : 'arm64';
	return 'x64';
}

function osMatches(ruleOs: MinecraftRuleOs | undefined): boolean {
	if (!ruleOs) return true;
	if (ruleOs.name && ruleOs.name !== currentOsName()) return false;
	if (ruleOs.arch && ruleOs.arch !== currentOsArchRule()) return false;
	if (ruleOs.version && !new RegExp(ruleOs.version).test(release())) {
		return false;
	}
	return true;
}

function featuresMatch(required: Record<string, boolean> | undefined, flags: MinecraftFeatureFlags): boolean {
	if (!required) return true;
	for (const [k, need] of Object.entries(required)) {
		if ((flags[k] ?? false) !== need) return false;
	}
	return true;
}

export function ruleMatches(
	rule: MinecraftRule,
	features: MinecraftFeatureFlags,
): boolean {
	if (rule.os && !osMatches(rule.os)) return false;
	if (rule.features && !featuresMatch(rule.features, features)) return false;
	return true;
}

/**
 * Mojang-style rules: walk in order; each matching rule sets allow/disallow.
 * If there are no rules, the item applies.
 */
export function rulesAllow(rules: MinecraftRule[] | undefined, features: MinecraftFeatureFlags): boolean {
	if (!rules || rules.length === 0) return true;
	let allowed = false;
	for (const rule of rules) {
		if (ruleMatches(rule, features)) {
			allowed = rule.action === 'allow';
		}
	}
	return allowed;
}
