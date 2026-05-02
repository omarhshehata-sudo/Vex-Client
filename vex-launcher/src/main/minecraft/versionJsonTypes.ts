export type MinecraftRuleAction = 'allow' | 'disallow';

export type MinecraftRuleOs = {
	name?: 'osx' | 'windows' | 'linux';
	arch?: string;
	version?: string;
};

export type MinecraftRule = {
	action: MinecraftRuleAction;
	os?: MinecraftRuleOs;
	features?: Record<string, boolean>;
};

export type MinecraftFeatureFlags = Record<string, boolean>;

export type DownloadArtifact = {
	path: string;
	sha1: string;
	size: number;
	url: string;
};

export type MinecraftLibrary = {
	name: string;
	downloads?: {
		artifact?: DownloadArtifact;
		classifiers?: Record<string, DownloadArtifact>;
	};
	rules?: MinecraftRule[];
	natives?: Record<string, string>;
};

export type MinecraftVersionJson = {
	id: string;
	type?: string;
	mainClass: string;
	assets?: string;
	assetIndex: {
		id: string;
		sha1: string;
		size: number;
		url: string;
	};
	downloads: {
		client: DownloadArtifact;
	};
	libraries: MinecraftLibrary[];
	arguments?: {
		game: Array<string | MinecraftArgumentFragment>;
		jvm: Array<string | MinecraftArgumentFragment>;
	};
	minecraftArguments?: string;
	logging?: {
		client?: {
			argument: string;
			file: DownloadArtifact;
			type: string;
		};
	};
};

export type MinecraftArgumentFragment = {
	rules: MinecraftRule[];
	value: string | string[];
};

export type VersionManifestV2 = {
	versions: Array<{
		id: string;
		type: string;
		url: string;
		time: string;
		releaseTime: string;
		sha1: string;
	}>;
};

export type AssetIndexJson = {
	objects: Record<string, { hash: string; size: number }>;
};
