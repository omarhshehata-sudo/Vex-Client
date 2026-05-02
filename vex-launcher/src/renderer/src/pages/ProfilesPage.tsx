import { useCallback, useEffect, useState } from 'react';

import { MinecraftSkinAvatar } from '../components/account/MinecraftSkinAvatar';
import { Button } from '../components/ui/Button';
import { MenuSelect } from '../components/ui/MenuSelect';
import { ErrorAlert } from '../components/ErrorAlert';
import { Input } from '../components/ui/Input';
import { LauncherPageScaffold } from '../layout/LauncherPageScaffold';
import { PageHeader } from '../layout/PageHeader';
import { Skeleton } from '../components/ui/Skeleton';
import { PremiumVersionSelectorModal } from '../components/versions/PremiumVersionSelectorModal';
import { ProfilesService } from '../services/ProfilesService';
import { SettingsService } from '../services/SettingsService';
import type { LauncherProfile, LauncherSettings, ModLoader } from '../services/types';
import { ToastService } from '../services/ToastService';
import { useLauncherStore } from '../state/launcherStore';
import { LOADER_OPTIONS_ALL } from '../constants/loaderSelectOptions';

function formatLastPlayed(epochSec: number | null | undefined): string {
	if (epochSec == null || !Number.isFinite(epochSec)) return 'Never';
	return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(epochSec * 1000));
}

export function ProfilesPage() {
	const account = useLauncherStore((s) => s.account);
	const [profiles, setProfiles] = useState<LauncherProfile[] | null>(null);
	const [activeSettings, setActiveSettings] = useState<LauncherSettings | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);

	const [creating, setCreating] = useState(false);
	const [newName, setNewName] = useState('New profile');
	const [newMc, setNewMc] = useState('1.21.4');
	const [newLoader, setNewLoader] = useState<ModLoader>('fabric');
	const [createVersionPickerOpen, setCreateVersionPickerOpen] = useState(false);

	const [editing, setEditing] = useState<LauncherProfile | null>(null);

	const refresh = useCallback(async () => {
		setError(null);
		try {
			const [list, s] = await Promise.all([ProfilesService.list(), SettingsService.load()]);
			setProfiles(list);
			setActiveSettings(s);
			useLauncherStore.getState().applySettings(s);
			await useLauncherStore.getState().hydrate();
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		}
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const activeId = activeSettings?.launcherProfileId ?? activeSettings?.selectedProfileId ?? '';

	const setActive = async (id: string) => {
		setBusyId(id);
		try {
			await ProfilesService.setActive(id);
			const s = await SettingsService.load();
			setActiveSettings(s);
			useLauncherStore.getState().applySettings(s);
			await useLauncherStore.getState().hydrate();
			ToastService.push({ type: 'success', title: 'Active profile', message: 'Selection updated.' });
		} catch (e) {
			ToastService.push({ type: 'error', title: 'Failed', message: e instanceof Error ? e.message : String(e) });
		} finally {
			setBusyId(null);
		}
	};

	const create = async () => {
		setCreating(true);
		try {
			await ProfilesService.create({
				name: newName.trim() || 'New profile',
				minecraftVersion: newMc.trim() || '1.21.4',
				loader: newLoader,
			});
			await refresh();
			ToastService.push({ type: 'success', title: 'Profile created' });
		} catch (e) {
			ToastService.push({ type: 'error', title: 'Create failed', message: e instanceof Error ? e.message : String(e) });
		} finally {
			setCreating(false);
		}
	};

	const saveEdit = async () => {
		if (!editing) return;
		setBusyId(editing.id);
		try {
			await ProfilesService.update(editing.id, editing);
			setEditing(null);
			await refresh();
			ToastService.push({ type: 'success', title: 'Profile saved' });
		} catch (e) {
			ToastService.push({ type: 'error', title: 'Save failed', message: e instanceof Error ? e.message : String(e) });
		} finally {
			setBusyId(null);
		}
	};

	const dup = async (id: string) => {
		setBusyId(id);
		try {
			await ProfilesService.duplicate(id);
			await refresh();
			ToastService.push({ type: 'success', title: 'Duplicated' });
		} catch (e) {
			ToastService.push({ type: 'error', title: 'Duplicate failed', message: e instanceof Error ? e.message : String(e) });
		} finally {
			setBusyId(null);
		}
	};

	const del = async (id: string) => {
		if (!window.confirm('Delete this profile? Installed mod metadata may remain on disk.')) return;
		setBusyId(id);
		try {
			await ProfilesService.delete(id);
			await refresh();
			ToastService.push({ type: 'success', title: 'Profile deleted' });
		} catch (e) {
			ToastService.push({ type: 'error', title: 'Delete failed', message: e instanceof Error ? e.message : String(e) });
		} finally {
			setBusyId(null);
		}
	};

	if (error && !profiles) {
		return (
			<LauncherPageScaffold innerClassName="mx-auto w-full max-w-[1320px] flex-1 p-6 md:p-8">
				<ErrorAlert title="Profiles" detail={error} />
			</LauncherPageScaffold>
		);
	}

	if (!profiles || !activeSettings) {
		return (
			<LauncherPageScaffold innerClassName="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-6 p-6 md:p-8">
				<Skeleton className="h-10 w-48" />
				<Skeleton className="h-40 w-full rounded-[16px]" />
			</LauncherPageScaffold>
		);
	}

	return (
		<LauncherPageScaffold innerClassName="mx-auto flex w-full max-w-[1320px] min-h-0 flex-1 flex-col gap-8 pb-16">
			<PageHeader title="Profiles" description="Each profile is a saved setup: version, loader, Java, RAM, game folder, and mods." />

			<div className="vex-card rounded-[18px] border border-white/[0.06] bg-[#14141A]/85 p-6 shadow-panel backdrop-blur-xl">
				<div className="text-[14px] font-semibold text-vex-text">Create profile</div>
				<div className="mt-4 flex flex-wrap items-end gap-3">
					<div className="min-w-[160px]">
						<div className="text-[11px] font-semibold uppercase tracking-wider text-vex-dim">Name</div>
						<Input className="mt-1 h-10 rounded-[12px] border border-white/10 bg-[#1B1B23] px-3 text-[13px]" value={newName} onChange={(e) => setNewName(e.target.value)} />
					</div>
					<div className="min-w-[200px] flex-1 sm:max-w-[280px]">
						<div className="text-[11px] font-semibold uppercase tracking-wider text-vex-dim">Minecraft</div>
						<button
							type="button"
							onClick={() => setCreateVersionPickerOpen(true)}
							className="vex-no-drag mt-1 flex h-10 w-full items-center justify-between gap-2 rounded-[12px] border border-white/10 bg-[#1B1B23] px-3 text-left font-mono text-[13px] text-vex-text transition hover:border-white/20 hover:bg-[#22222c]"
						>
							<span className="truncate">{newMc.trim() || 'Pick a version'}</span>
							<span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[#A78BFA]/90">All versions</span>
						</button>
					</div>
					<div className="min-w-[160px]">
						<div className="text-[11px] font-semibold uppercase tracking-wider text-vex-dim">Loader</div>
						<div className="mt-1">
							<MenuSelect
								aria-label="Profile loader"
								value={newLoader}
								onChange={(v) => setNewLoader(v)}
								options={LOADER_OPTIONS_ALL}
							/>
						</div>
					</div>
					<Button className="h-10 px-5" loading={creating} onClick={() => void create()}>
						Create
					</Button>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				{profiles.map((p) => {
					const isActive = p.id === activeId;
					return (
						<div
							key={p.id}
							className={[
								'rounded-[18px] border p-5 shadow-panel transition',
								isActive ? 'border-vex-accent/45 bg-[#1A1728]/95 ring-1 ring-vex-accent/25' : 'border-white/[0.06] bg-[#14141A]/85',
							].join(' ')}
						>
							<div className="flex items-start justify-between gap-3">
								<div className="flex min-w-0 items-center gap-3">
									<div
										className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[14px] text-[22px]"
										style={{
											background: account?.signedIn ? '#1B1B23' : `${p.color}22`,
											boxShadow: `inset 0 0 0 1px ${p.color}55`,
										}}
									>
										{account?.signedIn ? (
											<MinecraftSkinAvatar
												uuid={account.uuid}
												size={96}
												className="absolute inset-[-8%] h-[116%] w-[116%] max-w-none object-cover object-top [image-rendering:pixelated]"
												fallback={
													<span className="relative z-[1]" aria-hidden>
														{p.icon || '🎮'}
													</span>
												}
											/>
										) : (
											<span className="relative z-[1]" style={{ color: p.color }} aria-hidden>
												{p.icon || '🎮'}
											</span>
										)}
									</div>
									<div className="min-w-0">
										<div className="truncate text-[16px] font-bold text-vex-text">{p.name}</div>
										<div className="mt-1 font-mono text-[12px] text-vex-dim">
											{p.minecraftVersion} · {p.loader}
										</div>
										<div className="mt-1 text-[11px] text-white/50">Last played: {formatLastPlayed(p.lastPlayedAtEpochSec)}</div>
									</div>
								</div>
								{isActive ? (
									<span className="shrink-0 rounded-full bg-vex-accent/20 px-2.5 py-1 text-[11px] font-semibold text-vex-accent">Active</span>
								) : (
									<Button
										variant="secondary"
										className="h-8 shrink-0 px-3 text-[12px]"
										loading={busyId === p.id}
										onClick={() => void setActive(p.id)}
									>
										Select
									</Button>
								)}
							</div>
							<div className="mt-4 flex flex-wrap gap-2">
								<Button variant="secondary" className="h-8 px-3 text-[12px]" onClick={() => setEditing({ ...p })}>
									Edit
								</Button>
								<Button variant="secondary" className="h-8 px-3 text-[12px]" loading={busyId === p.id} onClick={() => void dup(p.id)}>
									Duplicate
								</Button>
								<Button variant="danger" className="h-8 px-3 text-[12px]" loading={busyId === p.id} onClick={() => void del(p.id)}>
									Delete
								</Button>
							</div>
						</div>
					);
				})}
			</div>

			{editing ? (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
					<div className="vex-app-scroll max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-[18px] border border-white/[0.08] bg-[#14141A] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
						<div className="text-[18px] font-bold text-vex-text">Edit profile</div>
						<div className="mt-4 space-y-3">
							<label className="block text-[12px] text-vex-dim">
								Name
								<Input className="mt-1 h-10 rounded-[12px] border border-white/10 bg-[#1B1B23] px-3" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
							</label>
							<label className="block text-[12px] text-vex-dim">
								Minecraft version
								<Input
									className="mt-1 h-10 rounded-[12px] border border-white/10 bg-[#1B1B23] px-3 font-mono"
									value={editing.minecraftVersion}
									onChange={(e) => setEditing({ ...editing, minecraftVersion: e.target.value })}
								/>
							</label>
							<label className="block text-[12px] text-vex-dim">
								Loader
								<div className="mt-1">
									<MenuSelect
										aria-label="Edit profile loader"
										value={editing.loader}
										onChange={(v) => setEditing({ ...editing, loader: v })}
										options={LOADER_OPTIONS_ALL}
									/>
								</div>
							</label>
							<label className="block text-[12px] text-vex-dim">
								Loader version (optional)
								<Input
									className="mt-1 h-10 rounded-[12px] border border-white/10 bg-[#1B1B23] px-3 font-mono text-[12px]"
									value={editing.loaderVersion}
									onChange={(e) => setEditing({ ...editing, loaderVersion: e.target.value })}
									placeholder="e.g. Fabric loader version"
								/>
							</label>
							<label className="block text-[12px] text-vex-dim">
								RAM (MB)
								<Input
									type="number"
									className="mt-1 h-10 rounded-[12px] border border-white/10 bg-[#1B1B23] px-3"
									value={editing.ramMb}
									onChange={(e) => setEditing({ ...editing, ramMb: Number(e.target.value) })}
								/>
							</label>
							<label className="block text-[12px] text-vex-dim">
								Java path
								<Input className="mt-1 h-10 rounded-[12px] border border-white/10 bg-[#1B1B23] px-3 font-mono text-[12px]" value={editing.javaPath} onChange={(e) => setEditing({ ...editing, javaPath: e.target.value })} />
							</label>
							<label className="block text-[12px] text-vex-dim">
								Game directory
								<Input className="mt-1 h-10 rounded-[12px] border border-white/10 bg-[#1B1B23] px-3 font-mono text-[12px]" value={editing.gameDirectory} onChange={(e) => setEditing({ ...editing, gameDirectory: e.target.value })} />
							</label>
							<label className="block text-[12px] text-vex-dim">
								Mods folder (absolute, optional)
								<Input
									className="mt-1 h-10 rounded-[12px] border border-white/10 bg-[#1B1B23] px-3 font-mono text-[12px]"
									value={editing.modsDirectory}
									onChange={(e) => setEditing({ ...editing, modsDirectory: e.target.value })}
									placeholder="Empty = default per-profile folder"
								/>
							</label>
							<label className="block text-[12px] text-vex-dim">
								Icon (emoji)
								<Input className="mt-1 h-10 rounded-[12px] border border-white/10 bg-[#1B1B23] px-3" value={editing.icon} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} />
							</label>
							<label className="block text-[12px] text-vex-dim">
								Accent color
								<Input className="mt-1 h-10 rounded-[12px] border border-white/10 bg-[#1B1B23] px-3 font-mono text-[12px]" value={editing.color} onChange={(e) => setEditing({ ...editing, color: e.target.value })} />
							</label>
							<label className="block text-[12px] text-vex-dim">
								Profile JVM args (optional)
								<textarea
									className="vex-no-drag mt-1 min-h-[72px] w-full rounded-[12px] border border-white/10 bg-[#1B1B23] p-3 font-mono text-[12px]"
									value={editing.profileExtraJvmArgs}
									onChange={(e) => setEditing({ ...editing, profileExtraJvmArgs: e.target.value })}
								/>
							</label>
						</div>
						<div className="mt-6 flex justify-end gap-2">
							<Button variant="secondary" className="h-10 px-4" onClick={() => setEditing(null)}>
								Cancel
							</Button>
							<Button className="h-10 px-4" loading={busyId === editing.id} onClick={() => void saveEdit()}>
								Save
							</Button>
						</div>
					</div>
				</div>
			) : null}

			<PremiumVersionSelectorModal
				open={createVersionPickerOpen}
				value={newMc.trim() || null}
				defaultShowSnapshots={false}
				onCancel={() => setCreateVersionPickerOpen(false)}
				onSelect={(id) => {
					setNewMc(id);
					setCreateVersionPickerOpen(false);
				}}
			/>
		</LauncherPageScaffold>
	);
}
