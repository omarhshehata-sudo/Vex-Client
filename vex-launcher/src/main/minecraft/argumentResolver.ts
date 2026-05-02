import { randomUUID } from 'node:crypto';

import { rulesAllow } from './ruleUtils';
import type { MinecraftArgumentFragment, MinecraftFeatureFlags, MinecraftVersionJson } from './versionJsonTypes';

export type LaunchVariableMap = Record<string, string>;

function substitute(template: string, vars: LaunchVariableMap): string {
	return template.replace(/\$\{([^}]+)\}/g, (_, key: string) => vars[key] ?? '');
}

function flattenArgParts(
	parts: Array<string | MinecraftArgumentFragment>,
	features: MinecraftFeatureFlags,
): string[] {
	const out: string[] = [];
	for (const p of parts) {
		if (typeof p === 'string') {
			out.push(p);
			continue;
		}
		if (!rulesAllow(p.rules, features)) continue;
		if (Array.isArray(p.value)) {
			out.push(...p.value);
		} else {
			out.push(p.value);
		}
	}
	return out;
}

export function buildJvmArgs(
	versionJson: MinecraftVersionJson,
	vars: LaunchVariableMap,
	features: MinecraftFeatureFlags,
): string[] {
	const jvm = versionJson.arguments?.jvm;
	if (!jvm) {
		return [`-Djava.library.path=${vars.natives_directory}`, '-cp', vars.classpath];
	}
	const raw = flattenArgParts(jvm, features);
	return raw.map((s) => substitute(s, vars));
}

export function buildGameArgs(
	versionJson: MinecraftVersionJson,
	vars: LaunchVariableMap,
	features: MinecraftFeatureFlags,
): string[] {
	const game = versionJson.arguments?.game;
	if (!game) {
		const legacy = versionJson.minecraftArguments;
		if (!legacy) return [];
		return substitute(legacy, vars).split(/\s+/);
	}
	const raw = flattenArgParts(game, features);
	const substituted = raw.map((s) => substitute(s, vars));
	const argv: string[] = [];
	for (let i = 0; i < substituted.length; i += 1) {
		const tok = substituted[i]!;
		if (tok.startsWith('--')) {
			const next = substituted[i + 1];
			if (next !== undefined && !next.startsWith('--') && next.trim() === '') {
				i += 1;
				continue;
			}
			if (next !== undefined && !next.startsWith('--') && next === '') {
				i += 1;
				continue;
			}
		}
		if (tok === '' || tok.trim() === '') continue;
		argv.push(tok);
	}
	return argv;
}

export function buildLaunchVariableMap(opts: {
	versionId: string;
	gameDir: string;
	assetsDir: string;
	assetsIndexName: string;
	classpath: string;
	nativesDir: string;
	username: string;
	uuid: string;
	accessToken: string;
	userType: string;
	versionType: string;
	authXuid: string;
	clientId: string;
	resolutionWidth: number;
	resolutionHeight: number;
}): LaunchVariableMap {
	return {
		auth_player_name: opts.username,
		version_name: opts.versionId,
		game_directory: opts.gameDir,
		assets_root: opts.assetsDir,
		assets_index_name: opts.assetsIndexName,
		auth_uuid: opts.uuid,
		auth_access_token: opts.accessToken,
		user_type: opts.userType,
		version_type: opts.versionType,
		auth_xuid: opts.authXuid,
		clientid: opts.clientId,
		classpath: opts.classpath,
		natives_directory: opts.nativesDir,
		launcher_name: 'vex-launcher',
		launcher_version: '0.1.0-alpha',
		user_properties: '{}',
		resolution_width: String(opts.resolutionWidth),
		resolution_height: String(opts.resolutionHeight),
	};
}

export function defaultLaunchFeatures(opts: {
	hasCustomResolution: boolean;
	isDemoUser?: boolean;
}): MinecraftFeatureFlags {
	return {
		is_demo_user: opts.isDemoUser ?? false,
		has_custom_resolution: opts.hasCustomResolution,
		has_quick_plays_support: false,
		is_quick_play_singleplayer: false,
		is_quick_play_multiplayer: false,
		is_quick_play_realms: false,
	};
}

export function stableClientId(): string {
	return randomUUID();
}
