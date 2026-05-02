export type VersionCatalogEntry = {
	/** Canonical launcher version id (matches `versionsList()` ids when possible). */
	id: string;
	/** Human-friendly name shown in the card badge. */
	name: string;
	/** release | snapshot | legacy */
	type: 'release' | 'snapshot' | 'legacy';
	/** Short label (Stable / Snapshot / Legacy) */
	label: string;
	/** Whether this version is pinned/favorited by default. */
	pinned?: boolean;
	/** Safe abstract background theme key (no copyrighted art). */
	background:
		| 'gradient-purple'
		| 'gradient-indigo'
		| 'gradient-blue'
		| 'gradient-teal'
		| 'gradient-violet'
		| 'gradient-slate'
		| 'gradient-ember';
};

// Data-driven catalog (safe backgrounds; can be replaced with real assets later).
// Order is newest → oldest.
export const VERSION_CATALOG: VersionCatalogEntry[] = [
	{ id: '1.21.4', name: '1.21.4', type: 'release', label: 'Stable', background: 'gradient-purple' },
	{ id: '1.21', name: '1.21', type: 'release', label: 'Stable', background: 'gradient-indigo' },
	{ id: '1.20.6', name: '1.20.6', type: 'release', label: 'Stable', background: 'gradient-blue' },
	{ id: '1.20.4', name: '1.20.4', type: 'release', label: 'Stable', background: 'gradient-teal' },
	{ id: '1.20.2', name: '1.20.2', type: 'release', label: 'Stable', pinned: true, background: 'gradient-violet' },
	{ id: '1.20.1', name: '1.20.1', type: 'release', label: 'Stable', pinned: true, background: 'gradient-purple' },
	{ id: '1.19.4', name: '1.19.4', type: 'release', label: 'Stable', background: 'gradient-indigo' },
	{ id: '1.19.2', name: '1.19.2', type: 'release', label: 'Stable', background: 'gradient-blue' },
	{ id: '1.18.2', name: '1.18.2', type: 'release', label: 'Stable', background: 'gradient-teal' },
	{ id: '1.18.1', name: '1.18.1', type: 'release', label: 'Stable', background: 'gradient-violet' },
	{ id: '1.17.1', name: '1.17.1', type: 'release', label: 'Stable', background: 'gradient-slate' },
	{ id: '1.16.5', name: '1.16.5', type: 'release', label: 'Stable', background: 'gradient-ember' },
	{ id: '1.16.4', name: '1.16.4', type: 'release', label: 'Stable', background: 'gradient-ember' },
	{ id: '1.15.2', name: '1.15.2', type: 'release', label: 'Stable', background: 'gradient-slate' },
	{ id: '1.14.4', name: '1.14.4', type: 'release', label: 'Stable', background: 'gradient-blue' },
	{ id: '1.13.2', name: '1.13.2', type: 'release', label: 'Stable', background: 'gradient-teal' },
	{ id: '1.12.2', name: '1.12.2', type: 'legacy', label: 'Legacy', pinned: true, background: 'gradient-slate' },
	{ id: '1.11.2', name: '1.11.2', type: 'legacy', label: 'Legacy', background: 'gradient-slate' },
	{ id: '1.10.2', name: '1.10.2', type: 'legacy', label: 'Legacy', background: 'gradient-slate' },
	{ id: '1.9.4', name: '1.9.4', type: 'legacy', label: 'Legacy', background: 'gradient-slate' },
	{ id: '1.8.9', name: '1.8.9', type: 'legacy', label: 'Legacy', pinned: true, background: 'gradient-purple' },
	{ id: '1.8.8', name: '1.8.8', type: 'legacy', label: 'Legacy', background: 'gradient-indigo' },
	{ id: '1.7.10', name: '1.7.10', type: 'legacy', label: 'Legacy', background: 'gradient-slate' },
	{ id: '24w14a', name: '24w14a', type: 'snapshot', label: 'Snapshot', background: 'gradient-violet' },
	{ id: '24w10a', name: '24w10a', type: 'snapshot', label: 'Snapshot', background: 'gradient-violet' },
	{ id: '23w51a', name: '23w51a', type: 'snapshot', label: 'Snapshot', background: 'gradient-violet' },
	{ id: '23w43a', name: '23w43a', type: 'snapshot', label: 'Snapshot', background: 'gradient-violet' },
	{ id: 'Latest Snapshot', name: 'Latest Snapshot', type: 'snapshot', label: 'Snapshot', background: 'gradient-violet' },
];

