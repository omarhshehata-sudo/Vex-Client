import type { ModLoader } from '../services/types';

export type LoaderOption = { value: ModLoader; label: string; description: string };

/** Order matches Profiles “Create profile” loader list. */
export const LOADER_OPTIONS_ALL: LoaderOption[] = [
	{ value: 'vanilla', label: 'Vanilla', description: 'Official JAR only — no mod loader on the classpath.' },
	{ value: 'fabric', label: 'Fabric', description: 'Lightweight; huge mod ecosystem. Often paired with Quilt-compatible mods.' },
	{ value: 'forge', label: 'Forge', description: 'Classic modded stack; heavier installs, broad legacy mod support.' },
	{ value: 'quilt', label: 'Quilt', description: 'Fabric-related toolchain; pick when your mods target Quilt explicitly.' },
	{ value: 'neoforge', label: 'NeoForge', description: 'Modern fork lineage from Forge for current Minecraft lines.' },
];

export const LOADER_OPTIONS_MODDED: LoaderOption[] = LOADER_OPTIONS_ALL.filter((o) => o.value !== 'vanilla');
