import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ConsolePanel } from '../components/ConsolePanel';
import { ErrorAlert } from '../components/ErrorAlert';
import { HomeHeroSpaceBackdrop } from '../components/home/HomeHeroSpaceBackdrop';
import { LauncherMainNavBar } from '../components/layout/LauncherMainNavBar';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { MenuSelect } from '../components/ui/MenuSelect';
import { Skeleton } from '../components/ui/Skeleton';
import { IconBug, IconCog, IconDownload, IconPalette, IconScreen, IconSpark, IconUser } from '../components/ui/icons';

import { AccountService } from '../services/AccountService';
import { JavaService } from '../services/JavaService';
import { SettingsService } from '../services/SettingsService';
import type { AuthProfile, LauncherSettings, ModLoader } from '../services/types';
import { friendlyErrorMessage } from '../services/friendlyError';
import { ToastService } from '../services/ToastService';
import { useLauncherStore } from '../state/launcherStore';
import { ACCENT_CSS, applyLauncherUx, coerceAccentId, type AccentId } from '../launcherUx';
import { LOADER_OPTIONS_ALL } from '../constants/loaderSelectOptions';

type CategoryId = 'general' | 'account' | 'minecraft' | 'launcher' | 'appearance' | 'notifications' | 'about';

function IconBellNav({ size = 18 }: { size?: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
			<path d="M18 8A6 6 0 0 0 6 8c0 7-3 7-3 14h18c0-7-3-7-3-14" />
			<path d="M13.73 21a2 2 0 0 1-3.46 0" />
		</svg>
	);
}

const CATEGORIES: Array<{
	id: CategoryId;
	label: string;
	icon: React.ReactNode;
	desc: string;
}> = [
	{ id: 'general', label: 'General', icon: <IconCog size={18} strokeWidth={1.75} />, desc: 'Language, startup, and Discord.' },
	{ id: 'account', label: 'Account', icon: <IconUser size={18} strokeWidth={1.75} />, desc: 'Microsoft sign-in status.' },
	{ id: 'minecraft', label: 'Minecraft', icon: <IconScreen size={18} strokeWidth={1.75} />, desc: 'Game directory, resolution, loader.' },
	{ id: 'launcher', label: 'Launcher', icon: <IconDownload size={18} strokeWidth={1.75} />, desc: 'Downloads, cache, and exit behavior.' },
	{ id: 'appearance', label: 'Appearance', icon: <IconPalette size={18} strokeWidth={1.75} />, desc: 'Motion and visual tuning.' },
	{ id: 'notifications', label: 'Notifications', icon: <IconBellNav size={18} />, desc: 'Alerts and update prompts.' },
	{ id: 'about', label: 'About', icon: <IconSpark size={18} strokeWidth={1.75} />, desc: 'Version, JVM flags, diagnostics.' },
];

const LANGUAGE_OPTIONS = [
	{ value: 'English', label: 'English' },
	{ value: 'Español', label: 'Español' },
	{ value: 'Français', label: 'Français' },
	{ value: 'Deutsch', label: 'Deutsch' },
] as const;

const THEME_OPTIONS = [
	{ value: 'Dark Purple', label: 'Dark Purple' },
	{ value: 'Dark', label: 'Dark' },
	{ value: 'High contrast', label: 'High contrast' },
] as const;

const ACCENT_INTENSITY_OPTIONS: Array<{ value: 'subtle' | 'normal' | 'strong'; label: string }> = [
	{ value: 'subtle', label: 'Subtle' },
	{ value: 'normal', label: 'Normal' },
	{ value: 'strong', label: 'Strong' },
];

const RAM_OPTIONS_MB = [1024, 2048, 3072, 4096, 6144, 8192, 12288, 16384] as const;

const LAUNCHER_VERSION_LABEL = '0.1.0-alpha';

function isDifferent(a: LauncherSettings, b: LauncherSettings): boolean {
	return (
		a.ramMb !== b.ramMb ||
		a.javaPath !== b.javaPath ||
		a.gameDirectory !== b.gameDirectory ||
		a.resolutionWidth !== b.resolutionWidth ||
		a.resolutionHeight !== b.resolutionHeight ||
		a.fullscreen !== b.fullscreen ||
		a.selectedVersionId !== b.selectedVersionId ||
		a.closeLauncherAfterGameStart !== b.closeLauncherAfterGameStart ||
		a.extraJvmArgs !== b.extraJvmArgs ||
		a.selectedModLoader !== b.selectedModLoader ||
		a.selectedProfileId !== b.selectedProfileId ||
		a.profileName !== b.profileName ||
		a.loaderVersion !== b.loaderVersion ||
		a.profileIcon !== b.profileIcon ||
		a.profileColor !== b.profileColor ||
		a.profileExtraJvmArgs !== b.profileExtraJvmArgs ||
		a.modsDirectory !== b.modsDirectory ||
		a.language !== b.language ||
		a.startOnBoot !== b.startOnBoot ||
		a.minimizeToTray !== b.minimizeToTray ||
		a.checkForUpdates !== b.checkForUpdates ||
		a.discordRichPresence !== b.discordRichPresence ||
		a.theme !== b.theme ||
		a.accent !== b.accent ||
		a.animationsEnabled !== b.animationsEnabled ||
		a.reduceMotion !== b.reduceMotion ||
		a.accentIntensity !== b.accentIntensity ||
		a.desktopNotifications !== b.desktopNotifications ||
		a.updatePrompts !== b.updatePrompts ||
		a.newsHighlights !== b.newsHighlights ||
		a.parallelDownloads !== b.parallelDownloads ||
		a.debugMode !== b.debugMode
	);
}

function SettingsGroup({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="relative overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0a0a12]/60 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl md:p-6">
			<div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" />
			<div className="relative">
				<div className="text-[12px] font-bold uppercase tracking-[0.24em] text-white">{title.toUpperCase()}</div>
				{description && <div className="mt-1.5 text-[13px] leading-relaxed text-white/52">{description}</div>}
				<div className="mt-4">{children}</div>
			</div>
		</div>
	);
}

function SettingRow({
	label,
	description,
	control,
}: {
	label: string;
	description?: string;
	control: React.ReactNode;
}) {
	return (
		<div
			className={[
				'group flex flex-col gap-3 rounded-[12px] px-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-2',
				'transition duration-[220ms] vex-ease',
				'hover:bg-white/[0.04]',
			].join(' ')}
		>
			<div className="min-w-0">
				<div className="text-[14px] font-semibold text-white">{label}</div>
				{description && <div className="mt-0.5 text-[12px] leading-snug text-white/50">{description}</div>}
			</div>
			<div className="shrink-0 sm:pl-4">{control}</div>
		</div>
	);
}

function MockPanel({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="relative overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0a0a12]/60 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl md:p-6">
			<div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" />
			<div className="relative">
				<div className="text-[12px] font-bold uppercase tracking-[0.24em] text-white">{title.toUpperCase()}</div>
				<div className="mt-4">{children}</div>
			</div>
		</div>
	);
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
	return (
		<button
			type="button"
			aria-pressed={checked}
			onClick={() => onChange(!checked)}
			className={[
				'vex-no-drag relative h-[24px] w-[46px] rounded-full transition duration-[240ms] vex-ease will-change-transform',
				'hover:scale-[1.03]',
				checked
					? 'bg-[#7C5CFF] shadow-[0_0_0_1px_rgba(124,92,255,0.35),0_0_20px_rgba(124,92,255,0.25)]'
					: 'bg-[#343443] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]',
			].join(' ')}
		>
			<span
				className={[
					'absolute top-1/2 h-[18px] w-[18px] -translate-y-1/2 rounded-full bg-white shadow-sm transition duration-[240ms] vex-ease',
					checked ? 'left-[25px]' : 'left-[3px]',
				].join(' ')}
			/>
		</button>
	);
}

function TextInput(props: React.ComponentProps<typeof Input>) {
	return (
		<Input
			{...props}
			className={[
				'h-[36px] rounded-[10px] border border-white/[0.06] bg-[#1B1B23] px-[10px] py-0 text-[13px]',
				'focus:border-vex-accent/40 focus:ring-2 focus:ring-vex-accent/20',
				props.className ?? '',
			]
				.filter(Boolean)
				.join(' ')}
		/>
	);
}

function formatGb(mb: number): string {
	const gb = mb / 1024;
	return `${gb % 1 === 0 ? gb.toFixed(0) : gb.toFixed(1)} GB`;
}

export function SettingsPage() {
	const nav = useNavigate();
	const [saved, setSaved] = useState<LauncherSettings | null>(null);
	const [draft, setDraft] = useState<LauncherSettings | null>(null);
	const [error, setError] = useState<{ title: string; detail: string } | null>(null);
	const [javaCandidates, setJavaCandidates] = useState<Array<{ path: string; major?: number; versionText?: string }>>([]);
	const [accountProfile, setAccountProfile] = useState<AuthProfile | null>(null);
	const [accountBusy, setAccountBusy] = useState(false);
	const [category, setCategory] = useState<CategoryId>('general');
	const [shownCategory, setShownCategory] = useState<CategoryId>('general');
	const [swapPhase, setSwapPhase] = useState<'in' | 'out'>('in');
	const [saving, setSaving] = useState(false);
	const [showConsoleModal, setShowConsoleModal] = useState(false);
	const [cacheClearBusy, setCacheClearBusy] = useState(false);
	const swapTimer = useRef<number | null>(null);

	useEffect(() => {
		if (!draft) return;
		applyLauncherUx(draft);
		return () => {
			applyLauncherUx(useLauncherStore.getState().settings);
		};
	}, [draft]);

	useEffect(() => {
		void (async () => {
			try {
				const s = await SettingsService.load();
				setSaved(s);
				setDraft(s);
				setAccountProfile(await AccountService.getProfile());
			} catch (e) {
				setError({ title: 'Load failed', detail: e instanceof Error ? e.message : String(e) });
			}
		})();
	}, []);

	const dirty = useMemo(() => {
		if (!saved || !draft) return false;
		return isDifferent(saved, draft);
	}, [saved, draft]);

	const javaSelectOptions = useMemo(() => {
		if (!draft) return [];
		const d = draft;
		const opts: Array<{ value: string; label: string }> = [];
		const cur = (d.javaPath ?? 'java').trim() || 'java';
		const short = cur.length > 42 ? `…${cur.slice(-40)}` : cur;
		opts.push({ value: d.javaPath || 'java', label: cur === 'java' ? 'System default (java)' : short });
		for (const c of javaCandidates) {
			const maj = c.major;
			const rec = maj !== undefined && maj >= 21;
			const lab =
				maj !== undefined
					? `Java ${maj}${rec ? ' (Recommended)' : ''}${c.versionText ? ` — ${c.versionText}` : ''}`
					: (c.versionText ?? c.path);
			if (!opts.some((o) => o.value === c.path)) opts.push({ value: c.path, label: lab });
		}
		return opts;
	}, [draft, javaCandidates]);

	const ramSelectOptions = useMemo(() => {
		if (!draft) {
			return RAM_OPTIONS_MB.map((mb) => ({ value: String(mb), label: `${mb} MB (${formatGb(mb)})` }));
		}
		const base = RAM_OPTIONS_MB.map((mb) => ({ value: String(mb), label: `${mb} MB (${formatGb(mb)})` }));
		const cur = String(draft.ramMb);
		if (base.some((o) => o.value === cur)) return base;
		return [{ value: cur, label: `${draft.ramMb} MB (custom)` }, ...base];
	}, [draft]);

	const detectJava = async () => {
		setError(null);
		try {
			const list = await JavaService.detect();
			setJavaCandidates(list);
			const has21 = list.some((c) => (c.major ?? 0) >= 21);
			ToastService.push({
				type: has21 ? 'success' : 'warn',
				title: `Detected ${list.length} Java installation(s)`,
				message: has21 ? 'Java 21+ available.' : 'Java 21+ not found.',
			});
		} catch (e) {
			setError({ title: 'Java detection failed', detail: e instanceof Error ? e.message : String(e) });
		}
	};

	const saveAll = async () => {
		if (!draft) return;
		setSaving(true);
		setError(null);
		try {
			const next = await SettingsService.save(draft);
			setSaved(next);
			setDraft(next);
			useLauncherStore.getState().applySettings(next);
			ToastService.push({ type: 'success', title: 'Settings saved' });
		} catch (e) {
			setError({ title: 'Save failed', detail: e instanceof Error ? e.message : String(e) });
		} finally {
			setSaving(false);
		}
	};

	const reset = () => {
		if (!saved) return;
		setDraft(saved);
		ToastService.push({ type: 'info', title: 'Changes reset' });
	};

	useEffect(() => {
		if (swapTimer.current) window.clearTimeout(swapTimer.current);
		setSwapPhase('out');
		swapTimer.current = window.setTimeout(() => {
			setShownCategory(category);
			setSwapPhase('in');
		}, 140);
		return () => {
			if (swapTimer.current) window.clearTimeout(swapTimer.current);
			swapTimer.current = null;
		};
	}, [category]);

	if (error && !draft) {
		return (
			<div className="mx-auto flex min-h-[50vh] max-w-3xl flex-col justify-center p-6">
				<ErrorAlert title={error.title} friendly={friendlyErrorMessage(error.detail) ?? undefined} detail={error.detail} />
			</div>
		);
	}

	if (!draft) {
		return (
			<div className="w-full px-[40px] py-[40px]">
				<div className="grid gap-[32px]" style={{ gridTemplateColumns: '240px 1fr' }}>
					<div className="space-y-3">
						<Skeleton className="h-9 w-44" />
						<div className="space-y-3 pt-2">
							{Array.from({ length: 7 }).map((_, i) => (
								<Skeleton key={i} className="h-[44px] w-full rounded-[12px]" />
							))}
						</div>
					</div>
					<div className="min-w-0">
						<Skeleton className="h-8 w-56" />
						<Skeleton className="mt-2 h-4 w-96" />
						<div className="mt-6 space-y-5">
							<Skeleton className="h-40 w-full rounded-[16px]" />
							<Skeleton className="h-40 w-full rounded-[16px]" />
						</div>
					</div>
				</div>
			</div>
		);
	}

	const d = draft;
	const languageMenuValue = LANGUAGE_OPTIONS.some((o) => o.value === d.language) ? d.language : LANGUAGE_OPTIONS[0].value;
	const themeMenuValue = THEME_OPTIONS.some((o) => o.value === d.theme) ? d.theme : THEME_OPTIONS[0].value;
	const javaMenuValue = javaSelectOptions.some((o) => o.value === d.javaPath) ? d.javaPath : (javaSelectOptions[0]?.value ?? d.javaPath ?? 'java');
	const active = CATEGORIES.find((c) => c.id === category) ?? CATEGORIES[0];
	const shown = CATEGORIES.find((c) => c.id === shownCategory) ?? active;

	return (
		<div className="vex-no-drag flex min-h-screen flex-col bg-[#050505] text-white">
			<LauncherMainNavBar notificationDot />

			<div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
				<div className="pointer-events-none absolute inset-0">
					<HomeHeroSpaceBackdrop />
				</div>
				<div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#050505]/93 via-[#050505]/82 via-55% to-transparent" />

				<div className="vex-app-scroll relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5 md:px-8 md:py-7">
					{error && (
						<div className="mb-5 max-w-3xl">
							<ErrorAlert title={error.title} friendly={friendlyErrorMessage(error.detail) ?? undefined} detail={error.detail} />
						</div>
					)}

					<div className="mx-auto flex w-full max-w-[1380px] flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
						<aside className="w-full shrink-0 lg:w-[252px]">
							<div className="rounded-2xl border border-white/[0.08] bg-black/45 p-3 shadow-[0_20px_70px_rgba(0,0,0,0.5)] backdrop-blur-xl">
								<div className="px-2 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.32em] text-white/40">SETTINGS</div>
								<nav className="flex flex-col gap-1" aria-label="Settings categories">
									{CATEGORIES.map((c) => {
										const selected = c.id === category;
										return (
											<button
												key={c.id}
												type="button"
												onClick={() => setCategory(c.id)}
												className={[
													'vex-no-drag relative flex items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-semibold transition',
													selected
														? 'border border-violet-500/25 bg-violet-600/15 text-white shadow-[inset_3px_0_0_#a855f7,0_0_24px_rgba(124,58,237,0.12)]'
														: 'border border-transparent text-white/55 hover:bg-white/[0.05] hover:text-white/90',
												].join(' ')}
											>
												<span className="text-current opacity-90" aria-hidden>
													{c.icon}
												</span>
												{c.label}
											</button>
										);
									})}
								</nav>
							</div>
						</aside>

						<section className="min-w-0 flex-1 xl:min-h-0">
							{shownCategory !== 'general' ? (
								<>
									<h1 className="text-2xl font-black tracking-tight text-white md:text-[1.65rem]">{shown.label}</h1>
									<p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-white/52">{shown.desc}</p>
								</>
							) : null}

							<div className={shownCategory === 'general' ? 'mt-0' : 'mt-6'}>
								<div
									key={shownCategory}
									className={[
										'vex-settings-swap will-change-transform',
										swapPhase === 'out' ? 'vex-settings-swap-out' : 'vex-settings-swap-in',
									].join(' ')}
								>
									{shownCategory === 'general' && (
										<div className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(280px,360px)] lg:items-start">
											<MockPanel title="General">
												<div className="divide-y divide-white/[0.07]">
													<SettingRow
														label="Language"
														description="Choose your preferred language."
														control={
															<div className="min-w-[200px]">
																<MenuSelect
																	aria-label="Language"
																	value={languageMenuValue}
																	onChange={(language) => setDraft({ ...d, language })}
																	options={[...LANGUAGE_OPTIONS]}
																	buttonClassName="h-11 min-w-[200px] rounded-xl border-white/[0.1] bg-[#0e0e16]/90 text-[13px]"
																/>
															</div>
														}
													/>
													<SettingRow
														label="Start on Boot"
														description="Launch VEX Client when your computer starts."
														control={<Switch checked={d.startOnBoot} onChange={(startOnBoot) => setDraft({ ...d, startOnBoot })} />}
													/>
													<SettingRow
														label="Minimize to System Tray"
														description="Keeps the launcher running in the background when you close the window (tray support varies by OS build)."
														control={<Switch checked={d.minimizeToTray} onChange={(minimizeToTray) => setDraft({ ...d, minimizeToTray })} />}
													/>
													<SettingRow
														label="Check for Updates"
														description="When enabled, the launcher may query for updates (used by future update UI)."
														control={<Switch checked={d.checkForUpdates} onChange={(checkForUpdates) => setDraft({ ...d, checkForUpdates })} />}
													/>
													<SettingRow
														label="Discord Rich Presence"
														description="Reserved for Discord activity integration."
														control={<Switch checked={d.discordRichPresence} onChange={(discordRichPresence) => setDraft({ ...d, discordRichPresence })} />}
													/>
												</div>
											</MockPanel>

											<div className="flex flex-col gap-5">
												<MockPanel title="Theme">
													<div className="divide-y divide-white/[0.07]">
														<SettingRow
															label="Theme"
															description="Theme marker for future styling; accent and motion apply immediately while you edit."
															control={
																<div className="min-w-[200px]">
																	<MenuSelect
																		aria-label="Theme"
																		value={themeMenuValue}
																		onChange={(theme) => setDraft({ ...d, theme })}
																		options={[...THEME_OPTIONS]}
																		buttonClassName="h-11 min-w-[200px] rounded-xl border-white/[0.1] bg-[#0e0e16]/90 text-[13px]"
																	/>
																</div>
															}
														/>
														<div className="px-1 py-4">
															<div className="text-[14px] font-semibold text-white">Accent Color</div>
															<div className="mt-0.5 text-[12px] text-white/50">Choose your accent color.</div>
															<div className="mt-4 flex flex-wrap gap-3">
																{(Object.keys(ACCENT_CSS) as AccentId[]).map((id) => {
																	const col = ACCENT_CSS[id];
																	const on = coerceAccentId(d.accent) === id;
																	return (
																		<button
																			key={id}
																			type="button"
																			onClick={() => setDraft({ ...d, accent: id })}
																			title={id}
																			className={[
																				'relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition',
																				on ? 'border-white shadow-[0_0_20px_rgba(255,255,255,0.35)]' : 'border-transparent hover:border-white/30',
																			].join(' ')}
																			style={{ backgroundColor: col.main }}
																		>
																			{on ? (
																				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" aria-hidden>
																					<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
																				</svg>
																			) : null}
																		</button>
																	);
																})}
															</div>
														</div>
													</div>
												</MockPanel>

												<MockPanel title="Performance">
													<div className="divide-y divide-white/[0.07]">
														<SettingRow
															label="Memory Allocation"
															description="Set the amount of RAM for Minecraft."
															control={
																<div className="min-w-[220px]">
																	<MenuSelect
																		aria-label="Memory allocation"
																		value={ramSelectOptions.some((o) => o.value === String(d.ramMb)) ? String(d.ramMb) : ramSelectOptions[0]?.value ?? '4096'}
																		onChange={(v) => setDraft({ ...d, ramMb: Number(v) })}
																		options={ramSelectOptions}
																		buttonClassName="h-11 min-w-[220px] rounded-xl border-white/[0.1] bg-[#0e0e16]/90 text-[13px]"
																	/>
																</div>
															}
														/>
														<SettingRow
															label="Java Executable"
															description="Select the Java version to use."
															control={
																<div className="flex max-w-[min(100vw-3rem,360px)] flex-wrap items-center justify-end gap-2">
																	<div className="min-w-0 flex-1">
																		<MenuSelect
																			aria-label="Java executable"
																			value={javaMenuValue}
																			onChange={(javaPath) => setDraft({ ...d, javaPath })}
																			options={javaSelectOptions}
																			buttonClassName="h-11 w-full max-w-[320px] rounded-xl border-white/[0.1] bg-[#0e0e16]/90 text-[13px]"
																		/>
																	</div>
																	<Button variant="secondary" className="h-9 shrink-0 px-3 text-[11px]" onClick={() => void detectJava()}>
																		Detect
																	</Button>
																</div>
															}
														/>
													</div>
												</MockPanel>
											</div>
										</div>
									)}

								{shownCategory === 'minecraft' && (
									<>
										<SettingsGroup title="Minecraft" description="Active profile: directory, loader, and display. Manage multiple setups on the Profiles page.">
											<div className="divide-y divide-white/[0.05]">
												<SettingRow
													label="Profiles"
													description="Create, duplicate, and switch saved setups (version + loader + paths)."
													control={
														<Button variant="secondary" className="h-9 px-4 text-[13px]" onClick={() => nav('/profiles')}>
															Open Profiles
														</Button>
													}
												/>
												<SettingRow
													label="Profile name"
													description="Shown on Home and in the Profiles list."
													control={
														<div className="w-[280px]">
															<TextInput value={d.profileName} onChange={(e) => setDraft({ ...d, profileName: e.target.value })} spellCheck={false} />
														</div>
													}
												/>
												<SettingRow
													label="Game directory"
													description="Where Minecraft files are installed."
													control={
														<div className="w-[320px]">
															<TextInput
																mono
																value={d.gameDirectory}
																onChange={(e) => setDraft({ ...d, gameDirectory: e.target.value })}
																spellCheck={false}
															/>
														</div>
													}
												/>

												<SettingRow
													label="Resolution"
													description="Window size passed to the game on launch."
													control={
														<div className="flex flex-col items-end gap-2">
															<div className="flex items-center gap-2">
																<div className="w-[92px]">
																	<TextInput
																		type="number"
																		value={d.resolutionWidth}
																		min={640}
																		max={7680}
																		onChange={(e) => setDraft({ ...d, resolutionWidth: Number(e.target.value) })}
																	/>
																</div>
																<span className="text-[#6F6F7C]">×</span>
																<div className="w-[92px]">
																	<TextInput
																		type="number"
																		value={d.resolutionHeight}
																		min={480}
																		max={4320}
																		onChange={(e) => setDraft({ ...d, resolutionHeight: Number(e.target.value) })}
																	/>
																</div>
															</div>
															<div className="flex flex-wrap justify-end gap-1.5">
																{(
																	[
																		[1280, 720],
																		[1600, 900],
																		[1920, 1080],
																		[2560, 1440],
																	] as const
																).map(([w, h]) => (
																	<button
																		key={`${w}x${h}`}
																		type="button"
																		className="vex-no-drag rounded-full bg-[#1B1B23] px-2.5 py-1 text-[11px] font-semibold text-[#A6A6B3] ring-1 ring-white/10 transition hover:bg-white/[0.06] hover:text-white"
																		onClick={() => setDraft({ ...d, resolutionWidth: w, resolutionHeight: h })}
																	>
																		{w}×{h}
																	</button>
																))}
															</div>
														</div>
													}
												/>

												<SettingRow
													label="Fullscreen"
													description="Launch Minecraft in fullscreen mode."
													control={<Switch checked={d.fullscreen} onChange={(fullscreen) => setDraft({ ...d, fullscreen })} />}
												/>

												<SettingRow
													label="Mod loader"
													description="Used with the Mods page and when launching (Fabric/Quilt use extra classpath; Forge copies into game/mods)."
													control={
														<div className="min-w-[200px]">
															<MenuSelect
																aria-label="Mod loader"
																value={d.selectedModLoader}
																onChange={(v) =>
																	setDraft({
																		...d,
																		selectedModLoader: v,
																	})
																}
																options={LOADER_OPTIONS_ALL}
																buttonClassName="h-[36px] min-w-[160px] rounded-[10px] border-white/[0.06] text-[13px]"
															/>
														</div>
													}
												/>
												<SettingRow
													label="Loader version"
													description="Optional hint for installers (often left empty)."
													control={
														<div className="w-[280px]">
															<TextInput
																mono
																value={d.loaderVersion}
																onChange={(e) => setDraft({ ...d, loaderVersion: e.target.value })}
																placeholder="e.g. 0.15.11"
																spellCheck={false}
															/>
														</div>
													}
												/>
												<SettingRow
													label="Mods folder override"
													description="Absolute path, or empty for the default per-profile folder."
													control={
														<div className="w-[320px]">
															<TextInput
																mono
																value={d.modsDirectory}
																onChange={(e) => setDraft({ ...d, modsDirectory: e.target.value })}
																spellCheck={false}
															/>
														</div>
													}
												/>
											</div>
										</SettingsGroup>
									</>
								)}

								{shownCategory === 'account' && (
									<SettingsGroup title="Account" description="Microsoft sign-in, tokens, and profile (same as the menu top-right).">
										<div className="divide-y divide-white/[0.06]">
											<SettingRow
												label="Status"
												description={accountProfile?.signedIn ? 'Session is active. Tokens refresh automatically when possible.' : 'Not signed in.'}
												control={
													<span className="text-[12px] font-semibold text-[#A6A6B3]">
														{accountProfile?.signedIn ? 'Signed in' : accountProfile?.stale ? 'Session expired' : 'Signed out'}
													</span>
												}
											/>
											<SettingRow
												label="Sign in"
												description="Opens the Microsoft login window."
												control={
													<Button
														variant="primary"
														className="h-[36px] px-4 text-[13px]"
														loading={accountBusy}
														disabled={accountBusy}
														onClick={() => {
															void (async () => {
																setAccountBusy(true);
																const r = await AccountService.signInWithMicrosoft();
																setAccountBusy(false);
																if (!r.ok) {
																	ToastService.push({ type: 'error', title: 'Sign-in failed', message: r.message });
																	return;
																}
																const p = await AccountService.getProfile();
																setAccountProfile(p);
																void useLauncherStore.getState().hydrate();
																ToastService.push({ type: 'success', title: 'Signed in' });
															})();
														}}
													>
														Continue with Microsoft
													</Button>
												}
											/>
											<SettingRow
												label="Account page"
												description="Skin preview and more account tools."
												control={
													<Button variant="secondary" className="h-[36px] px-4 text-[13px]" onClick={() => nav('/account')}>
														Open
													</Button>
												}
											/>
										</div>
									</SettingsGroup>
								)}

								{shownCategory === 'launcher' && (
									<SettingsGroup title="Launcher" description="Downloads, cache, and what happens when you start the game.">
										<div className="divide-y divide-white/[0.06]">
											<SettingRow
												label="Close launcher after game starts"
												description="Hide the launcher window once Minecraft is running (you can reopen from the tray when available)."
												control={
													<Switch
														checked={d.closeLauncherAfterGameStart}
														onChange={(closeLauncherAfterGameStart) => setDraft({ ...d, closeLauncherAfterGameStart })}
													/>
												}
											/>
											<SettingRow
												label="Cache folder"
												description="Stores downloaded libraries and version files."
												control={<span className="text-[12px] font-semibold text-[#6F6F7C]">Default</span>}
											/>
											<SettingRow
												label="Clear cache"
												description="Clears the embedded browser HTTP cache (icons, web assets). Version files stay on disk until removed separately."
												control={
													<Button
														variant="secondary"
														className="h-[36px] px-4 text-[13px]"
														loading={cacheClearBusy}
														disabled={cacheClearBusy}
														onClick={() => {
															void (async () => {
																setCacheClearBusy(true);
																setError(null);
																try {
																	const r = await SettingsService.clearHttpCache();
																	if (r.ok) ToastService.push({ type: 'success', title: 'Cache cleared' });
																	else ToastService.push({ type: 'error', title: 'Clear cache failed', message: r.message });
																} catch (e) {
																	setError({ title: 'Clear cache failed', detail: e instanceof Error ? e.message : String(e) });
																} finally {
																	setCacheClearBusy(false);
																}
															})();
														}}
													>
														Clear
													</Button>
												}
											/>
											<SettingRow
												label="Parallel downloads"
												description="Preference stored for a future faster downloader pipeline."
												control={
													<Switch checked={d.parallelDownloads} onChange={(parallelDownloads) => setDraft({ ...d, parallelDownloads })} />
												}
											/>
										</div>
									</SettingsGroup>
								)}

								{shownCategory === 'appearance' && (
									<SettingsGroup title="Appearance" description="Animations and motion preferences.">
										<div className="divide-y divide-white/[0.06]">
											<SettingRow
												label="Animations"
												description="Disable for a more static UI."
												control={
													<Switch checked={d.animationsEnabled} onChange={(animationsEnabled) => setDraft({ ...d, animationsEnabled })} />
												}
											/>
											<SettingRow
												label="Reduce motion"
												description="Shortens or disables decorative motion (stack with “Animations” off for a fully static feel)."
												control={<Switch checked={d.reduceMotion} onChange={(reduceMotion) => setDraft({ ...d, reduceMotion })} />}
											/>
											<SettingRow
												label="Accent intensity"
												description="Controls accent glow multiplier on the root theme."
												control={
													<div className="min-w-[180px]">
														<MenuSelect
															aria-label="Accent intensity"
															value={d.accentIntensity}
															onChange={(accentIntensity) => setDraft({ ...d, accentIntensity })}
															options={ACCENT_INTENSITY_OPTIONS}
															buttonClassName="h-11 min-w-[180px] rounded-xl border-white/[0.1] bg-[#0e0e16]/90 text-[13px]"
														/>
													</div>
												}
											/>
										</div>
									</SettingsGroup>
								)}

								{shownCategory === 'notifications' && (
									<SettingsGroup title="Notifications" description="Alerts, update prompts, and launcher toasts.">
										<div className="divide-y divide-white/[0.06]">
											<SettingRow
												label="In-app toasts"
												description="Corner notifications for saves, installs, and status (errors still log to the console)."
												control={
													<Switch
														checked={d.desktopNotifications}
														onChange={(desktopNotifications) => setDraft({ ...d, desktopNotifications })}
													/>
												}
											/>
											<SettingRow
												label="Update prompts"
												description="Reserved for future “new build available” prompts."
												control={<Switch checked={d.updatePrompts} onChange={(updatePrompts) => setDraft({ ...d, updatePrompts })} />}
											/>
											<SettingRow
												label="News highlights"
												description="Shows the “Latest update” card on the Home library column."
												control={<Switch checked={d.newsHighlights} onChange={(newsHighlights) => setDraft({ ...d, newsHighlights })} />}
											/>
										</div>
									</SettingsGroup>
								)}

								{shownCategory === 'about' && (
									<SettingsGroup title="About" description="Version, JVM flags, and diagnostics.">
										<div className="divide-y divide-white/[0.06]">
											<SettingRow
												label="VEX Client version"
												description="Current launcher build."
												control={<span className="text-[12px] font-semibold text-white/80">v{LAUNCHER_VERSION_LABEL}</span>}
											/>
											<SettingRow
												label="Report a bug"
												description="Open an issue with logs (link opens in your browser)."
												control={
													<Button
														variant="secondary"
														className="h-[36px] gap-2 px-4 text-[13px]"
														onClick={() => {
															void window.open('https://github.com', '_blank', 'noopener,noreferrer');
														}}
													>
														<IconBug size={16} strokeWidth={1.75} />
														Report
													</Button>
												}
											/>
											<div className="px-[18px] py-4">
												<div className="text-[14px] font-semibold text-vex-text">Profile JVM arguments</div>
												<div className="mt-1 text-[12px] text-white/80">Applied to the active profile only, before global flags.</div>
												<textarea
													className="vex-no-drag mt-3 min-h-[88px] w-full resize-y rounded-[12px] border border-white/[0.06] bg-[#1B1B23] p-3 font-mono text-[12px] text-vex-text placeholder:text-white/30 focus:border-vex-accent/40 focus:outline-none focus:ring-2 focus:ring-vex-accent/20"
													spellCheck={false}
													placeholder={'-Dexample.profile=1'}
													value={d.profileExtraJvmArgs}
													onChange={(e) => setDraft({ ...d, profileExtraJvmArgs: e.target.value })}
												/>
											</div>
											<div className="px-[18px] py-4">
												<div className="text-[14px] font-semibold text-vex-text">Global extra JVM arguments</div>
												<div className="mt-1 text-[12px] text-white/80">
													All profiles: injected before Mojang classpath flags. One flag per line or space-separated (quotes supported).
												</div>
												<textarea
													className="vex-no-drag mt-3 min-h-[120px] w-full resize-y rounded-[12px] border border-white/[0.06] bg-[#1B1B23] p-3 font-mono text-[12px] text-vex-text placeholder:text-white/30 focus:border-vex-accent/40 focus:outline-none focus:ring-2 focus:ring-vex-accent/20"
													spellCheck={false}
													placeholder={'-XX:+UnlockExperimentalVMOptions\n-Dexample=value'}
													value={d.extraJvmArgs}
													onChange={(e) => setDraft({ ...d, extraJvmArgs: e.target.value })}
												/>
											</div>
											<SettingRow
												label="Debug mode"
												description="Stored for future verbose logging in the launcher and game pipeline."
												control={<Switch checked={d.debugMode} onChange={(debugMode) => setDraft({ ...d, debugMode })} />}
											/>
											<SettingRow
												label="Show console"
												description="Opens the in-app log viewer (same entries as during launch)."
												control={
													<Button variant="secondary" className="h-[36px] px-4 text-[13px]" onClick={() => setShowConsoleModal(true)}>
														Open
													</Button>
												}
											/>
											<SettingRow
												label="Reset settings"
												description="Restores global launcher preferences and default launch fields for the active profile (worlds and game directory are kept)."
												control={
													<Button
														variant="danger"
														className="h-[36px] px-4 text-[13px]"
														disabled={saving}
														onClick={() => {
															if (
																!window.confirm(
																	'Reset launcher preferences and this profile’s launch defaults (RAM, Java path, resolution, etc.)? Your worlds and game folder path are not removed.',
																)
															) {
																return;
															}
															void (async () => {
																setSaving(true);
																setError(null);
																try {
																	const next = await SettingsService.resetToDefaults();
																	setSaved(next);
																	setDraft(next);
																	useLauncherStore.getState().applySettings(next);
																	ToastService.push({ type: 'success', title: 'Settings reset' });
																} catch (e) {
																	setError({ title: 'Reset failed', detail: e instanceof Error ? e.message : String(e) });
																} finally {
																	setSaving(false);
																}
															})();
														}}
													>
														Reset
													</Button>
												}
											/>
										</div>
									</SettingsGroup>
								)}
							</div>

							{/* Unsaved changes bar */}
							<div className="sticky bottom-6 z-20">
								<div
									className={[
										'rounded-[16px] bg-[#14141A] px-5 py-4 shadow-[0_12px_40px_rgba(0,0,0,0.55)]',
										'transition duration-200 vex-ease',
										dirty ? 'opacity-100' : 'pointer-events-none opacity-0',
									].join(' ')}
								>
									<div className="flex flex-wrap items-center justify-between gap-3">
										<div>
											<div className="text-[14px] font-semibold text-vex-text">You have unsaved changes</div>
											<div className="mt-0.5 text-[12px] text-[#A6A6B3]">Save to apply across the launcher.</div>
										</div>
										<div className="flex items-center gap-2">
											<Button variant="secondary" disabled={saving} className="h-[36px] px-4 text-[13px]" onClick={() => reset()}>
												Reset
											</Button>
											<Button
												variant="primary"
												loading={saving}
												disabled={!dirty || saving}
												className="h-[36px] px-4 text-[13px]"
												onClick={() => void saveAll()}
											>
												Save
											</Button>
										</div>
									</div>
								</div>
							</div>
						</div>
					</section>

						<div
							className="pointer-events-none relative hidden min-h-[min(460px,calc(100vh-9rem))] w-full shrink-0 overflow-hidden rounded-2xl border border-white/[0.09] shadow-[0_24px_80px_rgba(0,0,0,0.5)] xl:block xl:w-[200px] xl:flex-none"
							aria-hidden
						>
							<div className="absolute inset-0 min-h-[440px]">
								<HomeHeroSpaceBackdrop />
							</div>
							<div className="absolute inset-0 bg-gradient-to-l from-[#050505] via-[#050505]/50 to-transparent" />
						</div>
					</div>
				</div>
			</div>

			{showConsoleModal ? (
				<div
					className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
					role="dialog"
					aria-modal="true"
					aria-label="Launcher console"
				>
					<div className="relative max-h-[min(90vh,720px)] w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a12] shadow-2xl">
						<div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
							<div className="text-sm font-semibold text-white">Launcher console</div>
							<Button variant="secondary" className="h-8 px-3 text-xs" onClick={() => setShowConsoleModal(false)}>
								Close
							</Button>
						</div>
						<div className="vex-app-scroll max-h-[calc(min(90vh,720px)-3.25rem)] overflow-y-auto p-4">
							<ConsolePanel defaultOpen />
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
