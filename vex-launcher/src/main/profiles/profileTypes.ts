import type { ModLoader } from '../mods/modsTypes';

export type LauncherProfile = {
	id: string;
	name: string;
	minecraftVersion: string;
	loader: ModLoader;
	/** Fabric / Forge / NeoForge / Quilt installer version hint; empty = use launcher defaults. */
	loaderVersion: string;
	ramMb: number;
	javaPath: string;
	gameDirectory: string;
	/** Absolute mods dir, or empty to use `<userData>/profiles/<id>/mods`. */
	modsDirectory: string;
	resolutionWidth: number;
	resolutionHeight: number;
	fullscreen: boolean;
	icon: string;
	color: string;
	/** Extra JVM flags for this profile (applied before global `extraJvmArgs`). */
	profileExtraJvmArgs: string;
	/** Last Minecraft version id actually launched for this profile (display). */
	lastPlayedVersionId: string | null;
	lastPlayedAtEpochSec: number | null;
	createdAtEpochSec: number;
};

export type ProfilesFile = {
	version: 1;
	profiles: LauncherProfile[];
};

export function createDefaultProfileShape(opts: {
	id: string;
	name: string;
	gameDirectory: string;
	minecraftVersion: string;
	createdAtEpochSec: number;
	loader?: ModLoader;
}): LauncherProfile {
	return {
		id: opts.id,
		name: opts.name,
		minecraftVersion: opts.minecraftVersion,
		loader: opts.loader ?? 'fabric',
		loaderVersion: '',
		ramMb: 4096,
		javaPath: 'java',
		gameDirectory: opts.gameDirectory,
		modsDirectory: '',
		resolutionWidth: 1280,
		resolutionHeight: 720,
		fullscreen: false,
		icon: '🎮',
		color: '#7C5CFF',
		profileExtraJvmArgs: '',
		lastPlayedVersionId: null,
		lastPlayedAtEpochSec: null,
		createdAtEpochSec: opts.createdAtEpochSec,
	};
}
