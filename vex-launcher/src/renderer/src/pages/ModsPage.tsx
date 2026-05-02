import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '../components/ui/Button';
import { ErrorAlert } from '../components/ErrorAlert';
import { Input } from '../components/ui/Input';
import { LauncherPageScaffold } from '../layout/LauncherPageScaffold';
import { PageHeader } from '../layout/PageHeader';
import { PremiumVersionSelectorModal } from '../components/versions/PremiumVersionSelectorModal';
import { MenuSelect } from '../components/ui/MenuSelect';
import { Skeleton } from '../components/ui/Skeleton';
import { LOADER_OPTIONS_ALL, LOADER_OPTIONS_MODDED } from '../constants/loaderSelectOptions';
import { ModsService, type ModrinthSearchSort } from '../services/ModsService';
import { SettingsService } from '../services/SettingsService';
import type { InstalledModRecord, LauncherSettings, ModLoader, ModsPersistedState } from '../services/types';
import { ToastService } from '../services/ToastService';
import { useLauncherStore } from '../state/launcherStore';

type Tab = 'browse' | 'installed' | 'import';

const MODRINTH_SORT_OPTIONS: { value: ModrinthSearchSort; label: string }[] = [
	{ value: 'relevance', label: 'Relevance' },
	{ value: 'downloads', label: 'Downloads' },
	{ value: 'follows', label: 'Follows' },
	{ value: 'updated', label: 'Recently updated' },
	{ value: 'newest', label: 'Newest' },
];

type SearchHit = {
	project_id: string;
	title?: string;
	description?: string;
	icon_url?: string | null;
	author?: string;
	downloads?: number;
	follows?: number;
	versions?: string[];
	date_modified?: string;
};

function profileKey(mc: string, loader: ModLoader): string {
	return `${mc.trim()}-${loader}`;
}

function formatBytes(n?: number): string {
	if (n == null || !Number.isFinite(n)) return '—';
	if (n < 1024) return `${n} B`;
	if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
	return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function ModsPage() {
	const [tab, setTab] = useState<Tab>('browse');
	const [bundle, setBundle] = useState<{
		state: ModsPersistedState;
		settings: LauncherSettings;
		profileId: string | null;
		modCount: number;
	} | null>(null);
	const [loadErr, setLoadErr] = useState<string | null>(null);

	const mcFilter = useRef('');
	const [mc, setMc] = useState('');
	const [loader, setLoader] = useState<ModLoader>('fabric');

	const refresh = useCallback(async () => {
		setLoadErr(null);
		try {
			const b = await ModsService.getState();
			setBundle(b);
			const mcDefault = b.settings.selectedVersionId?.trim() ?? '';
			setMc(mcDefault);
			setLoader(b.settings.selectedModLoader ?? 'fabric');
			mcFilter.current = mcDefault;
		} catch (e) {
			setLoadErr(e instanceof Error ? e.message : String(e));
		}
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const saveLaunchProfile = async () => {
		try {
			const cur = bundle?.settings ?? (await SettingsService.load());
			const nextMc = mc.trim() || cur.selectedVersionId;
			const next = await SettingsService.save({
				...cur,
				selectedVersionId: nextMc,
				selectedModLoader: loader,
			});
			useLauncherStore.getState().applySettings(next);
			await refresh();
			ToastService.push({
				type: 'success',
				title: 'Profile updated',
				message: `${next.profileName} · ${profileKey(mc || (next.selectedVersionId ?? ''), loader)}`,
			});
		} catch (e) {
			ToastService.push({ type: 'error', title: 'Save failed', message: e instanceof Error ? e.message : String(e) });
		}
	};

	const activeProfileId = useMemo(() => bundle?.profileId ?? bundle?.settings.launcherProfileId ?? null, [bundle]);

	useEffect(() => {
		if (loader === 'vanilla' && tab === 'browse') setTab('installed');
	}, [loader, tab]);

	/* ─── Browse ─── */
	const [q, setQ] = useState('');
	const [debouncedQ, setDebouncedQ] = useState('');
	const [sort, setSort] = useState<ModrinthSearchSort>('relevance');
	const [hits, setHits] = useState<SearchHit[]>([]);
	const [total, setTotal] = useState(0);
	const [off, setOff] = useState(0);
	const [searching, setSearching] = useState(false);
	const [searchErr, setSearchErr] = useState<string | null>(null);

	useEffect(() => {
		const t = window.setTimeout(() => setDebouncedQ(q.trim()), 420);
		return () => window.clearTimeout(t);
	}, [q]);

	useEffect(() => {
		if (tab !== 'browse' || loader === 'vanilla') return;
		let cancelled = false;
		const run = async () => {
			setSearchErr(null);
			setSearching(true);
			try {
				const r = await ModsService.search({
					query: debouncedQ || '*',
					limit: 20,
					offset: 0,
					gameVersion: mcFilter.current || mc || undefined,
					loader: loader === 'vanilla' ? undefined : loader,
					sort,
				});
				if (cancelled) return;
				const h = (r.hits ?? []) as SearchHit[];
				setHits(h);
				setTotal(r.total_hits ?? 0);
				setOff(h.length);
			} catch (e) {
				if (!cancelled) setSearchErr(e instanceof Error ? e.message : String(e));
			} finally {
				if (!cancelled) setSearching(false);
			}
		};
		void run();
		return () => {
			cancelled = true;
		};
	}, [debouncedQ, sort, loader, tab, mc]);

	const loadMore = async () => {
		if (loader === 'vanilla') return;
		setSearchErr(null);
		setSearching(true);
		try {
			const r = await ModsService.search({
				query: debouncedQ || '*',
				limit: 20,
				offset: off,
				gameVersion: mcFilter.current || mc || undefined,
				loader: loader === 'vanilla' ? undefined : loader,
				sort,
			});
			const h = (r.hits ?? []) as SearchHit[];
			setHits((prev) => [...prev, ...h]);
			setTotal(r.total_hits ?? 0);
			setOff((o) => o + h.length);
		} catch (e) {
			setSearchErr(e instanceof Error ? e.message : String(e));
		} finally {
			setSearching(false);
		}
	};

	/* Detail */
	const [detail, setDetail] = useState<SearchHit | null>(null);
	const [versions, setVersions] = useState<Array<{ id: string; name: string; version_number: string }>>([]);
	const [detailLoading, setDetailLoading] = useState(false);
	const [installDeps, setInstallDeps] = useState(true);
	const [installingVersionId, setInstallingVersionId] = useState<string | null>(null);

	const openDetail = async (h: SearchHit) => {
		setDetail(h);
		setDetailLoading(true);
		setVersions([]);
		try {
			const gv = mcFilter.current || mc || undefined;
			const list = await ModsService.listProjectVersions(h.project_id, gv, loader);
			setVersions(
				(list as Array<{ id: string; name: string; version_number: string; game_versions?: string[]; loaders?: string[] }>).filter(
					(v) =>
						(!gv || v.game_versions?.includes(gv)) &&
						(!loader || v.loaders?.includes(loader)),
				),
			);
		} catch {
			setVersions([]);
		} finally {
			setDetailLoading(false);
		}
	};

	const installVersion = async (versionId: string) => {
		if (loader === 'vanilla') {
			ToastService.push({ type: 'warn', title: 'Vanilla', message: 'Switch loader before installing mods.' });
			return;
		}
		const gv = (mcFilter.current || mc || bundle?.settings.selectedVersionId || '').trim();
		if (!gv) {
			ToastService.push({ type: 'warn', title: 'Minecraft version', message: 'Set a Minecraft version above.' });
			return;
		}
		setInstallingVersionId(versionId);
		try {
			const r = await ModsService.installVersion({ versionId, minecraftVersion: gv, loader, installDeps });
			const depMsg = r.installedDeps.length ? ` (+ ${r.installedDeps.length} dependencies)` : '';
			ToastService.push({ type: 'success', title: 'Installed', message: `${r.mod.name}${depMsg}` });
			setDetail(null);
			await refresh();
			setTab('installed');
		} catch (e) {
			ToastService.push({ type: 'error', title: 'Install failed', message: e instanceof Error ? e.message : String(e) });
		} finally {
			setInstallingVersionId(null);
		}
	};

	/* Installed */
	const [filterQ, setFilterQ] = useState('');
	const installedRows = useMemo(() => {
		if (!bundle?.state) return [];
		const pid = activeProfileId;
		const s = bundle.settings;
		return bundle.state.installedMods.filter((m) => {
			if (pid) {
				const legacyMatch =
					!m.launcherProfileId && profileKey(m.minecraftVersion, m.loader) === profileKey(s.selectedVersionId ?? '', s.selectedModLoader);
				if (m.launcherProfileId !== pid && !legacyMatch) return false;
			}
			if (!filterQ.trim()) return true;
			return m.name.toLowerCase().includes(filterQ.toLowerCase());
		});
	}, [bundle, activeProfileId, filterQ]);

	/* Import */
	const [pickPaths, setPickPaths] = useState<string[]>([]);
	const [impMc, setImpMc] = useState('');
	const [impLoader, setImpLoader] = useState<ModLoader>('fabric');
	/** Opens `PremiumVersionSelectorModal` for toolbar MC or import target MC. */
	const [versionPickFor, setVersionPickFor] = useState<'toolbar' | 'import' | null>(null);

	useEffect(() => {
		if (bundle?.settings) {
			setImpMc(bundle.settings.selectedVersionId?.trim() ?? '');
			setImpLoader(bundle.settings.selectedModLoader ?? 'fabric');
		}
	}, [bundle?.settings]);

	const pickFiles = async () => {
		const p = await ModsService.pickImportJars();
		setPickPaths(p);
	};

	const runImport = async () => {
		if (impLoader === 'vanilla') {
			ToastService.push({ type: 'warn', title: 'Vanilla', message: 'Choose a modded loader for import.' });
			return;
		}
		if (!pickPaths.length) return;
		try {
			const r = await ModsService.importPaths(pickPaths, impMc.trim(), impLoader);
			ToastService.push({ type: 'success', title: 'Imported', message: `${r.length} mod(s)` });
			setPickPaths([]);
			await refresh();
			setTab('installed');
		} catch (e) {
			ToastService.push({ type: 'error', title: 'Import failed', message: e instanceof Error ? e.message : String(e) });
		}
	};

	if (loadErr && !bundle) {
		return (
			<LauncherPageScaffold innerClassName="mx-auto w-full max-w-[1320px] flex-1 p-6 md:p-8">
				<ErrorAlert title="Mods unavailable" detail={loadErr} />
			</LauncherPageScaffold>
		);
	}

	return (
		<LauncherPageScaffold innerClassName="mx-auto flex w-full max-w-[1320px] min-h-0 flex-1 flex-col gap-8 pb-16">
			<PageHeader title="Mods" description="Mods install into the active profile’s folder. Vanilla profiles cannot load Modrinth mods here." />

			<div className="vex-card rounded-[18px] border border-white/[0.06] bg-[#14141A]/85 p-5 shadow-panel backdrop-blur-xl">
				<div className="flex flex-wrap items-end gap-4">
					<div className="min-w-[200px] flex-1 sm:max-w-[300px]">
						<div className="text-[11px] font-semibold uppercase tracking-widest text-vex-dim">Minecraft version</div>
						<button
							type="button"
							onClick={() => setVersionPickFor('toolbar')}
							className="vex-no-drag mt-1 flex h-10 w-full items-center justify-between gap-2 rounded-[12px] border border-white/10 bg-[#1B1B23] px-3 text-left font-mono text-[13px] text-vex-text transition hover:border-white/20 hover:bg-[#22222c]"
						>
							<span className="truncate">{mc.trim() || bundle?.settings.selectedVersionId?.trim() || 'Pick a version'}</span>
							<span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[#A78BFA]/90">Browse</span>
						</button>
						<div className="mt-1 text-[10px] text-white/40">Defaults to this profile’s version until you change it and apply.</div>
					</div>
					<div className="min-w-[160px]">
						<div className="text-[11px] font-semibold uppercase tracking-widest text-vex-dim">Loader</div>
						<div className="mt-1">
							<MenuSelect
								aria-label="Mod loader"
								value={loader}
								onChange={(v) => setLoader(v)}
								options={LOADER_OPTIONS_ALL}
							/>
						</div>
					</div>
					<div className="min-w-[200px] flex-1">
						<div className="text-[11px] font-semibold uppercase tracking-widest text-vex-dim">Active profile</div>
						<div className="mt-1 text-[14px] font-semibold text-vex-text">{bundle?.settings.profileName ?? '—'}</div>
						<div className="mt-0.5 font-mono text-[11px] text-vex-dim">{activeProfileId ?? '—'}</div>
					</div>
					<Button variant="primary" className="h-10 px-4" onClick={() => void saveLaunchProfile()}>
						Apply to active profile
					</Button>
				</div>
			</div>

			<div className="flex gap-2 border-b border-white/[0.06] pb-2">
				{(['browse', 'installed', 'import'] as const).map((t) => (
					<button
						key={t}
						type="button"
						onClick={() => setTab(t)}
						className={[
							'vex-no-drag rounded-full px-4 py-2 text-[13px] font-semibold transition',
							tab === t
								? 'bg-vex-accent/20 text-white ring-1 ring-vex-accent/40'
								: 'text-vex-dim hover:bg-white/[0.05] hover:text-white',
						].join(' ')}
					>
						{t === 'browse' ? 'Browse' : t === 'installed' ? 'Installed' : 'Import'}
					</button>
				))}
			</div>

			{tab === 'browse' && loader === 'vanilla' ? (
				<div className="rounded-[16px] border border-white/[0.08] bg-[#14141A]/80 p-8 text-center text-[13px] text-vex-dim">
					Browse is disabled for <span className="font-semibold text-vex-text">vanilla</span> profiles. Switch the loader above (saved to the active
					profile) or use a separate modded profile.
				</div>
			) : null}

			{tab === 'browse' && loader !== 'vanilla' && (
				<div className="space-y-6">
					<div className="flex flex-wrap gap-3">
						<Input
							className="h-10 min-w-[220px] flex-1 rounded-[12px] border border-white/10 bg-[#1B1B23] px-3 text-[13px]"
							placeholder="Search Modrinth…"
							value={q}
							onChange={(e) => setQ(e.target.value)}
						/>
						<div className="min-w-[180px]">
							<MenuSelect aria-label="Sort search results" value={sort} onChange={(v) => setSort(v)} options={MODRINTH_SORT_OPTIONS} />
						</div>
					</div>
					{searchErr && <ErrorAlert title="Search failed" detail={searchErr} />}
					<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
						{searching && hits.length === 0
							? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[160px] rounded-[16px]" />)
							: null}
						{!searching && hits.length === 0 ? (
							<div className="col-span-full rounded-[16px] border border-dashed border-white/15 bg-white/[0.02] py-16 text-center text-[13px] text-vex-dim">
								No results. Try another query or filters.
							</div>
						) : null}
						{hits.map((h) => (
							<button
								key={h.project_id}
								type="button"
								onClick={() => void openDetail(h)}
								className="vex-no-drag group text-left rounded-[16px] border border-white/[0.06] bg-[#14141A]/90 p-4 shadow-panel transition hover:-translate-y-[2px] hover:border-vex-accent/35 hover:shadow-[0_0_28px_rgba(124,92,255,0.18)]"
							>
								<div className="flex gap-3">
									<div className="h-14 w-14 shrink-0 overflow-hidden rounded-[12px] bg-white/5 ring-1 ring-white/10">
										{h.icon_url ? <img src={h.icon_url} alt="" className="h-full w-full object-cover" /> : null}
									</div>
									<div className="min-w-0">
										<div className="truncate font-semibold text-vex-text">{h.title ?? h.project_id}</div>
										<div className="mt-1 line-clamp-2 text-[12px] text-vex-dim">{h.description ?? ''}</div>
										<div className="mt-2 flex flex-wrap gap-2 text-[11px] text-vex-dim">
											<span>{(h.downloads ?? 0).toLocaleString()} dl</span>
											<span>{(h.follows ?? 0).toLocaleString()} follows</span>
										</div>
									</div>
								</div>
							</button>
						))}
					</div>
					{hits.length > 0 && off < total ? (
						<div className="flex justify-center">
							<Button variant="secondary" className="h-10 px-6" loading={searching} onClick={() => void loadMore()}>
								Load more
							</Button>
						</div>
					) : null}
				</div>
			)}

			{tab === 'installed' && (
				<div className="space-y-4">
					<Input
						className="h-10 max-w-md rounded-[12px] border border-white/10 bg-[#1B1B23] px-3 text-[13px]"
						placeholder="Filter installed…"
						value={filterQ}
						onChange={(e) => setFilterQ(e.target.value)}
					/>
					{activeProfileId ? (
						<Button variant="secondary" className="h-9" onClick={() => void ModsService.openModsFolder(activeProfileId)}>
							Open mods folder
						</Button>
					) : null}
					<div className="overflow-hidden rounded-[16px] border border-white/[0.06]">
						{installedRows.length === 0 ? (
							<div className="p-8 text-center text-[13px] text-vex-dim">No mods for this profile yet.</div>
						) : (
							<table className="w-full text-left text-[13px]">
								<thead className="bg-white/[0.03] text-[11px] uppercase tracking-wider text-vex-dim">
									<tr>
										<th className="px-4 py-3">Mod</th>
										<th className="px-4 py-3">Version</th>
										<th className="px-4 py-3">Size</th>
										<th className="px-4 py-3">On</th>
										<th className="px-4 py-3" />
									</tr>
								</thead>
								<tbody>
									{installedRows.map((m) => (
										<InstalledRow key={m.id} mod={m} onChange={() => void refresh()} />
									))}
								</tbody>
							</table>
						)}
					</div>
				</div>
			)}

			{tab === 'import' && (
				<div className="space-y-6">
					<div
						className="rounded-[20px] border-2 border-dashed border-white/15 bg-[#14141A]/60 px-8 py-14 text-center transition hover:border-vex-accent/40 hover:shadow-[0_0_40px_rgba(124,92,255,0.12)]"
						onDragOver={(e) => e.preventDefault()}
						onDrop={(e) => {
							e.preventDefault();
							const files = Array.from(e.dataTransfer.files ?? []).filter((f) => f.name.toLowerCase().endsWith('.jar'));
							const paths = files.map((f) => (f as File & { path?: string }).path).filter(Boolean) as string[];
							if (paths.length) setPickPaths(paths);
							else ToastService.push({ type: 'warn', title: 'No paths', message: 'Drop .jar files from disk (Electron provides paths).' });
						}}
					>
						<div className="text-[15px] font-semibold text-vex-text">Drop .jar mods here</div>
						<div className="mt-2 text-[12px] text-vex-dim">Or use the file picker (recommended).</div>
						<div className="mt-6 flex justify-center gap-3">
							<Button variant="secondary" className="h-10 px-5" onClick={() => void pickFiles()}>
								Choose files
							</Button>
						</div>
					</div>
					<div className="grid gap-4 sm:grid-cols-2">
						<div>
							<div className="text-[11px] font-semibold uppercase tracking-widest text-vex-dim">Target Minecraft</div>
							<button
								type="button"
								onClick={() => setVersionPickFor('import')}
								className="vex-no-drag mt-1 flex h-10 w-full items-center justify-between gap-2 rounded-[12px] border border-white/10 bg-[#1B1B23] px-3 text-left font-mono text-[13px] text-vex-text transition hover:border-white/20 hover:bg-[#22222c]"
							>
								<span className="truncate">{impMc.trim() || bundle?.settings.selectedVersionId?.trim() || 'Pick a version'}</span>
								<span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[#A78BFA]/90">Browse</span>
							</button>
						</div>
						<div>
							<div className="text-[11px] font-semibold uppercase tracking-widest text-vex-dim">Loader</div>
							<div className="mt-1">
								<MenuSelect
									aria-label="Import target loader"
									value={impLoader}
									onChange={(v) => setImpLoader(v)}
									options={LOADER_OPTIONS_MODDED}
								/>
							</div>
						</div>
					</div>
					{pickPaths.length > 0 ? (
						<div className="rounded-[14px] border border-white/10 bg-black/20 p-4">
							<div className="text-[12px] font-semibold text-vex-text">{pickPaths.length} file(s)</div>
							<ul className="vex-app-scroll mt-2 max-h-40 list-inside list-disc overflow-y-auto text-[11px] text-vex-dim">
								{pickPaths.map((p) => (
									<li key={p} className="truncate font-mono">
										{p}
									</li>
								))}
							</ul>
							<Button variant="primary" className="mt-4 h-10" onClick={() => void runImport()}>
								Import
							</Button>
						</div>
					) : null}
				</div>
			)}

			{detail ? (
				<div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-6" role="dialog">
					<div className="vex-app-scroll max-h-[90vh] w-full max-w-[640px] overflow-y-auto rounded-[20px] border border-white/10 bg-[#12121a] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
						<div className="flex items-start justify-between gap-4">
							<div>
								<div className="text-[20px] font-bold text-vex-text">{detail.title}</div>
								<div className="mt-1 font-mono text-[11px] text-vex-dim">{detail.project_id}</div>
							</div>
							<button type="button" className="text-vex-dim hover:text-white" onClick={() => setDetail(null)}>
								Close
							</button>
						</div>
						<p className="mt-4 text-[13px] leading-relaxed text-vex-dim">{detail.description}</p>
						<label className="mt-4 flex items-center gap-2 text-[13px] text-vex-text">
							<input type="checkbox" checked={installDeps} onChange={(e) => setInstallDeps(e.target.checked)} />
							Install required dependencies when available
						</label>
						<div className="mt-4 text-[12px] font-semibold text-vex-dim">Compatible versions</div>
						{detailLoading ? <Skeleton className="mt-2 h-24 w-full rounded-[12px]" /> : null}
						<div className="mt-2 space-y-2">
							{versions.map((v) => (
								<div
									key={v.id}
									className="flex items-center justify-between gap-3 rounded-[12px] border border-white/[0.06] bg-white/[0.03] px-3 py-2"
								>
									<div className="min-w-0">
										<div className="truncate font-mono text-[13px] text-vex-text">{v.version_number}</div>
										<div className="truncate text-[11px] text-vex-dim">{v.name}</div>
									</div>
									<Button
										variant="primary"
										className="h-8 shrink-0 px-3 text-[12px]"
										loading={installingVersionId === v.id}
										disabled={installingVersionId !== null}
										onClick={() => void installVersion(v.id)}
									>
										Install
									</Button>
								</div>
							))}
						</div>
					</div>
				</div>
			) : null}

			<PremiumVersionSelectorModal
				open={versionPickFor !== null}
				value={
					versionPickFor === 'import'
						? impMc.trim() || bundle?.settings.selectedVersionId || null
						: mc.trim() || bundle?.settings.selectedVersionId || null
				}
				defaultShowSnapshots
				onCancel={() => setVersionPickFor(null)}
				onSelect={(id) => {
					if (versionPickFor === 'import') setImpMc(id);
					else {
						setMc(id);
						mcFilter.current = id;
					}
					setVersionPickFor(null);
				}}
			/>
		</LauncherPageScaffold>
	);
}

function InstalledRow({ mod, onChange }: { mod: InstalledModRecord; onChange: () => void }) {
	return (
		<tr className="border-t border-white/[0.05]">
			<td className="px-4 py-3">
				<div className="flex items-center gap-2">
					{mod.iconUrl ? <img src={mod.iconUrl} alt="" className="h-8 w-8 rounded-[8px] object-cover" /> : null}
					<div>
						<div className="font-semibold text-vex-text">{mod.name}</div>
						<div className="text-[11px] text-vex-dim">{mod.filename}</div>
					</div>
				</div>
			</td>
			<td className="px-4 py-3 text-vex-dim">{mod.versionId?.slice(0, 8) ?? 'local'}</td>
			<td className="px-4 py-3 text-vex-dim">{formatBytes(mod.fileSizeBytes)}</td>
			<td className="px-4 py-3">
				<button
					type="button"
					className={[
						'vex-no-drag relative h-7 w-12 rounded-full transition',
						mod.enabled ? 'bg-emerald-500/30' : 'bg-white/10',
					].join(' ')}
					onClick={() => {
						void (async () => {
							try {
								await ModsService.setEnabled(mod.id, !mod.enabled);
								onChange();
							} catch (e) {
								ToastService.push({ type: 'error', title: 'Toggle failed', message: e instanceof Error ? e.message : String(e) });
							}
						})();
					}}
				>
					<span
						className={[
							'absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow transition',
							mod.enabled ? 'left-[26px]' : 'left-[4px]',
						].join(' ')}
					/>
				</button>
			</td>
			<td className="px-4 py-3 text-right">
				<Button
					variant="danger"
					className="h-8 px-3 text-[12px]"
					onClick={() => {
						if (!window.confirm(`Remove ${mod.name}?`)) return;
						void (async () => {
							try {
								await ModsService.deleteMod(mod.id);
								onChange();
								ToastService.push({ type: 'success', title: 'Removed' });
							} catch (e) {
								ToastService.push({ type: 'error', title: 'Delete failed', message: e instanceof Error ? e.message : String(e) });
							}
						})();
					}}
				>
					Delete
				</Button>
			</td>
		</tr>
	);
}
