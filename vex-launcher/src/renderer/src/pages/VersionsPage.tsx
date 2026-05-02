import { useCallback, useEffect, useMemo, useState } from 'react';

import { ErrorAlert } from '../components/ErrorAlert';
import { Button } from '../components/ui/Button';
import { LauncherPageScaffold } from '../layout/LauncherPageScaffold';
import { PageHeader } from '../layout/PageHeader';
import { IconLayers, IconRefresh } from '../components/ui/icons';
import { VersionService } from '../services/VersionService';
import type { VersionEntry } from '../services/types';
import { ToastService } from '../services/ToastService';
import { useLauncherStore } from '../state/launcherStore';
import type { LaunchStatusEvent } from '../vite-env';

export function VersionsPage() {
	const [versions, setVersions] = useState<VersionEntry[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [selected, setSelected] = useState<string | null>(null);
	const [installingId, setInstallingId] = useState<string | null>(null);
	const [installDetail, setInstallDetail] = useState<string>('');
	const [busyList, setBusyList] = useState(false);

	const installedVersionIds = useLauncherStore((s) => s.installedVersionIds);
	const installedSet = useMemo(() => new Set(installedVersionIds), [installedVersionIds]);

	const loadAll = useCallback(async () => {
		setBusyList(true);
		setError(null);
		try {
			const [list] = await Promise.all([VersionService.listVersions(), useLauncherStore.getState().refreshInstalled()]);
			setVersions(list);
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setBusyList(false);
		}
	}, []);

	useEffect(() => {
		void loadAll();
	}, [loadAll]);

	const onInstall = async (id: string, e: React.MouseEvent) => {
		e.stopPropagation();
		setInstallingId(id);
		setInstallDetail('');
		const api = window.vexLauncher;
		const onStatus = (ev: LaunchStatusEvent) => {
			const d = [ev.phase, ev.detail].filter(Boolean).join(' — ');
			setInstallDetail(d);
		};
		try {
			api?.launchStatusOff();
			api?.launchStatusOn(onStatus);
			const r = await VersionService.install(id);
			if (!r.ok) {
				ToastService.push({ type: 'error', title: r.title, message: r.detail });
				return;
			}
			ToastService.push({ type: 'success', title: 'Installed', message: `${id} is ready to play.` });
			await useLauncherStore.getState().refreshInstalled();
		} catch (err) {
			ToastService.push({
				type: 'error',
				title: 'Install failed',
				message: err instanceof Error ? err.message : String(err),
			});
		} finally {
			api?.launchStatusOff();
			setInstallingId(null);
			setInstallDetail('');
		}
	};

	const onDelete = async (id: string, e: React.MouseEvent) => {
		e.stopPropagation();
		if (!installedSet.has(id)) {
			ToastService.push({ type: 'info', title: 'Not installed', message: `${id} has no local version folder.` });
			return;
		}
		const ok = window.confirm(`Remove Minecraft ${id} from this game directory?\n\nThis deletes versions/${id} only (shared libraries/assets stay).`);
		if (!ok) return;
		const r = await VersionService.delete(id);
		if (!r.ok) {
			ToastService.push({ type: 'error', title: r.title, message: r.detail });
			return;
		}
		ToastService.push({ type: 'success', title: 'Removed', message: `${id} was deleted.` });
		await useLauncherStore.getState().hydrate();
	};

	const sorted = useMemo(() => versions, [versions]);

	return (
		<LauncherPageScaffold innerClassName="mx-auto flex w-full max-w-[1320px] min-h-0 flex-1 flex-col gap-8 pb-16">
			<PageHeader
				title="Versions"
				description="Install from the Mojang manifest, track what is on disk, and remove old installs."
				right={
					<Button
						variant="secondary"
						className="h-9 gap-2 px-3 text-[13px]"
						disabled={busyList}
						onClick={() => void loadAll()}
					>
						<IconRefresh size={16} />
						Refresh
					</Button>
				}
			/>
			{error && <ErrorAlert title="Could not load versions" detail={error} />}

			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{sorted.map((v) => {
					const isSel = v.id === selected;
					const isLatest = v.tags?.includes('latest');
					const installed = installedSet.has(v.id);
					const installing = installingId === v.id;
					return (
						<div
							key={v.id}
							role="button"
							tabIndex={0}
							onKeyDown={(ke) => {
								if (ke.key === 'Enter' || ke.key === ' ') {
									ke.preventDefault();
									setSelected(v.id);
								}
							}}
							className={[
								'vex-card group relative min-h-[210px] cursor-pointer overflow-hidden rounded-vex-lg border bg-gradient-to-br p-6 transition duration-200 vex-ease',
								isSel
									? 'border-vex-accent/35 from-white/[0.06] via-vex-surface to-vex-surface2 shadow-[0_0_0_1px_rgba(124,92,255,0.22),0_22px_70px_-40px_rgba(0,0,0,0.65)] ring-1 ring-vex-accent/20'
									: 'border-white/[0.06] from-white/[0.03] via-vex-surface to-vex-surface2 shadow-panel/25 ring-1 ring-white/[0.04] hover:border-white/10',
							].join(' ')}
							onClick={() => setSelected(v.id)}
						>
							<div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-vex-accent/10 blur-2xl transition duration-200 group-hover:bg-vex-accent/16" />

							<div className="relative flex items-start justify-between gap-4">
								<div className="flex min-w-0 items-start gap-3">
									<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-vex-lg bg-white/[0.04] text-vex-dim ring-1 ring-white/10">
										<IconLayers size={18} />
									</div>
									<div className="min-w-0">
										<div className="font-mono text-[18px] font-semibold tracking-tight text-vex-text">{v.id}</div>
										<div className="mt-1 text-[12px] uppercase tracking-widest text-vex-muted">{v.type}</div>
									</div>
								</div>

								<div className="flex flex-col items-end gap-1">
									{isLatest && (
										<span className="rounded-full bg-vex-accent/14 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-vex-text ring-1 ring-vex-accent/25">
											Latest
										</span>
									)}
									<span
										className={[
											'rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1',
											installed
												? 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/25'
												: 'bg-white/[0.04] text-vex-dim ring-white/10',
										].join(' ')}
									>
										{installed ? 'Installed' : 'Not installed'}
									</span>
								</div>
							</div>

							{installing && installDetail ? (
								<div className="relative mt-4 truncate text-[11px] text-vex-dim">{installDetail}</div>
							) : null}

							<div className="relative mt-6 flex flex-wrap gap-2" onClick={(ev) => ev.stopPropagation()}>
								<Button
									variant="primary"
									className="px-4 py-2 text-xs"
									loading={installing}
									disabled={installing}
									onClick={(ev) => void onInstall(v.id, ev)}
								>
									{installed ? 'Repair / update' : 'Install'}
								</Button>
								<Button
									variant="secondary"
									className="px-4 py-2 text-xs"
									disabled={installing || !installed}
									onClick={(ev) => void onDelete(v.id, ev)}
								>
									Delete
								</Button>
							</div>
						</div>
					);
				})}
			</div>
		</LauncherPageScaffold>
	);
}
