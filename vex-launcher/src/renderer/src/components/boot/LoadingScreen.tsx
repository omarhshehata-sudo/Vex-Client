import { useMemo } from 'react';

import { HomeHeroSpaceBackdrop } from '../home/HomeHeroSpaceBackdrop';
import { VexMark } from '../ui/VexMark';

export type BootPhase = 'loading' | 'ready';

/** Inline icons for footer timeline — match mock glyphs. */
function IconInitiating({ className }: { className?: string }) {
	return (
		<svg className={className} width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
			<path
				d="M14 2.5 L24.76 9.05 V18.96 L14 25.51 L3.24 18.96 V9.05 Z"
				stroke="currentColor"
				strokeWidth="1.65"
				strokeLinejoin="round"
				opacity="0.95"
			/>
			<path
				d="M17.95 17.82 L14 19.93 L10.06 17.82 V13.61 L14 11.5 L17.95 13.61 Z"
				stroke="currentColor"
				strokeWidth="1.35"
				strokeLinejoin="round"
				opacity="0.9"
			/>
		</svg>
	);
}

function IconFiles({ className }: { className?: string }) {
	return (
		<svg className={className} width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
			{/* Isometric cube */}
			<path
				d="M14 8 L20.5 11.5 L14 15 L7.5 11.5 Z"
				stroke="currentColor"
				strokeWidth="1.35"
				strokeLinejoin="round"
				opacity="0.95"
			/>
			<path
				d="M7.5 11.5 L14 15 L14 21.5 L7.5 18 Z"
				stroke="currentColor"
				strokeWidth="1.35"
				strokeLinejoin="round"
				opacity="0.9"
			/>
			<path
				d="M20.5 11.5 L14 15 L14 21.5 L20.5 18 Z"
				stroke="currentColor"
				strokeWidth="1.35"
				strokeLinejoin="round"
				opacity="0.88"
			/>
		</svg>
	);
}

function IconPreparing({ className }: { className?: string }) {
	return (
		<svg className={className} width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
			<path
				d="M5 9.85 L13.93 13.93 L23 10.18 L14.05 7.17 Z"
				stroke="currentColor"
				strokeWidth="1.3"
				strokeLinejoin="round"
				opacity="0.9"
			/>
			<path
				d="M5 12.94 L13.93 17.02 L23 13.26 L23 10.18 L13.93 13.93 L5 9.84 Z"
				stroke="currentColor"
				strokeWidth="1.25"
				strokeLinejoin="round"
				opacity="0.85"
			/>
			<path
				d="M5 17.62 L13.93 21.71 L23 17.94 L23 13.95 L13.93 17.93 L5 13.93 Z"
				stroke="currentColor"
				strokeWidth="1.28"
				strokeLinejoin="round"
				opacity="0.92"
			/>
		</svg>
	);
}

function IconLaunching({ className }: { className?: string }) {
	return (
		<svg className={className} width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
			<path
				d="M14 7.2 L20.93 21.93 L17 17 H11 L7.07 21.93 Z"
				stroke="currentColor"
				strokeWidth="1.45"
				strokeLinejoin="round"
				fill="none"
				opacity="0.95"
			/>
			<ellipse cx="14" cy="12.4" rx="2.05" ry="2.85" stroke="currentColor" strokeWidth="1.05" opacity="0.55" fill="none" />
			<path
				d="M10.5 21.5 L14 17.5 L17.5 21.5"
				stroke="currentColor"
				strokeWidth="1.22"
				strokeLinecap="round"
				strokeLinejoin="round"
				opacity="0.82"
			/>
		</svg>
	);
}

const TIMELINE_ICONS = [IconInitiating, IconFiles, IconPreparing, IconLaunching] as const;

const TIP = 'TIP: You can customize your experience with mods and resource packs!';

export function LoadingScreen({
	progress,
	steps,
	activeStepIndex,
	exiting,
	phase,
}: {
	progress: number; // 0..100
	steps: readonly string[];
	activeStepIndex: number; // timeline index during load
	exiting: boolean;
	phase: BootPhase;
}) {
	const pct = useMemo(() => Math.max(0, Math.min(100, Math.round(progress))), [progress]);

	return (
		<div className={['vex-boot-root select-none', exiting ? 'vex-boot-exit' : ''].filter(Boolean).join(' ')}>
			<div className="vex-boot-cosmicRoot" aria-hidden>
				<HomeHeroSpaceBackdrop showFlyers={false} />
			</div>

			<div aria-hidden className="vex-boot-cosmicVignette" />
			<div aria-hidden className="vex-boot-vortexBloom" />

			<div className="relative z-[1] flex flex-1 flex-col">
				<main className="flex flex-1 flex-col items-center justify-center px-6 pb-[min(26vh,200px)] pt-[min(8vh,80px)] text-center">
					<div className="vex-boot-brandStack relative flex flex-col items-center">
						<div className="vex-boot-markGlow mb-6 flex h-[52px] w-[52px] items-center justify-center md:mb-7 md:h-[58px] md:w-[58px]">
							<VexMark className="vex-boot-markSteel max-h-full w-full" aria-hidden />
						</div>

						<h1 className="vex-boot-titleMetal m-0 text-[clamp(2.35rem,9.5vw,3.45rem)] font-black leading-none tracking-[0.06em]">
							VEX
						</h1>
						<p className="vex-boot-clientSub m-0 mt-2.5 font-semibold uppercase text-[0.7rem] md:text-[0.76rem]">
							CLIENT
						</p>
					</div>

					<p className="vex-boot-loadingLabel m-0 mt-8 font-semibold uppercase tracking-[0.48em] text-[0.68rem] text-white md:mt-9 md:text-[0.74rem]">
						LOADING
					</p>

					<div className="mt-6 w-[min(100%,440px)] max-w-xl md:mt-7">
						<div className="vex-boot-track vex-boot-trackShell relative h-12 overflow-hidden rounded-full md:h-[3.125rem]">
							<div
								className="vex-boot-fill absolute inset-y-0 left-0 overflow-hidden rounded-full"
								style={{ width: `${pct}%` }}
							>
								<div aria-hidden className="vex-boot-barSheen pointer-events-none absolute inset-0" />
							</div>
							<div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center">
								<span className="vex-boot-pct font-semibold tabular-nums tracking-[0.06em] text-[1rem] md:text-[1.05rem]">
									{pct}%
								</span>
							</div>
						</div>
						<p className="vex-boot-tip mx-auto mt-5 flex max-w-[30rem] items-start justify-center gap-2.5 px-2 text-left text-[0.8125rem] font-medium leading-relaxed md:mt-6 md:text-[0.875rem]">
							<span className="vex-boot-tipIcon mt-0.5 grid h-[1.125rem] w-[1.125rem] shrink-0 place-items-center rounded-full border text-[0.5625rem] font-bold" aria-hidden>
								i
							</span>
							<span>{TIP}</span>
						</p>
					</div>
				</main>

				<footer className="relative z-[1] px-5 pb-[min(5.5vh,44px)] pt-2 md:px-8">
					<nav aria-label="Launch stages" className="mx-auto w-full max-w-3xl">
						<ul className="vex-boot-timeRow m-0 flex list-none items-start justify-between gap-0 p-0">
							{steps.slice(0, TIMELINE_ICONS.length).map((label, i) => {
								const n = TIMELINE_ICONS.length;
								const Icon = TIMELINE_ICONS[i] ?? IconInitiating;
								const litLeft = i === 0 ? false : phase === 'ready' || activeStepIndex >= i;
								const litRight = i >= n - 1 ? false : phase === 'ready' || activeStepIndex > i;
								const pulseRight = phase === 'loading' && activeStepIndex === i && i < n - 1;

								const nodeTone =
									phase === 'ready'
										? 'done'
										: i < activeStepIndex
											? 'done'
											: i === activeStepIndex
												? 'current'
												: 'idle';

								const iconSize =
									nodeTone === 'current' ? 'h-8 w-8 md:h-[2.125rem] md:w-[2.125rem]' : 'h-7 w-7 md:h-8 md:w-8';

								return (
									<li key={label} className="vex-boot-timeStep flex min-w-0 flex-1 flex-col items-center">
										<div className="flex w-full items-center">
											{i > 0 ? (
												<div
													className={[
														'vex-boot-rail flex-1',
														litLeft ? 'vex-boot-rail--on' : 'vex-boot-rail--off',
													].join(' ')}
													aria-hidden
												/>
											) : (
												<div className="vex-boot-railSpacer flex-1" aria-hidden />
											)}
											<span
												className={[
													'vex-boot-node flex h-[3.75rem] w-[3.75rem] shrink-0 items-center justify-center rounded-[0.85rem] border backdrop-blur-sm transition-[border-color,color,filter,opacity,box-shadow] md:h-[4.125rem] md:w-[4.125rem]',
													nodeTone === 'current'
														? 'vex-boot-node--current'
														: nodeTone === 'done'
															? 'vex-boot-node--done'
															: 'vex-boot-node--idle',
												].join(' ')}
											>
												<Icon className={iconSize} />
											</span>
											{i < n - 1 ? (
												<div
													className={[
														'vex-boot-rail flex-1',
														litRight ? 'vex-boot-rail--on' : 'vex-boot-rail--off',
														pulseRight ? 'vex-boot-rail--pulse' : '',
													]
														.filter(Boolean)
														.join(' ')}
													aria-hidden
												/>
											) : (
												<div className="vex-boot-railSpacer flex-1" aria-hidden />
											)}
										</div>
										<span
											className={[
												'mt-3 max-w-[8rem] text-center text-[0.6rem] font-semibold uppercase leading-snug tracking-wide md:max-w-[8.5rem] md:text-[0.65rem]',
												nodeTone === 'current' ? 'vex-boot-label--current' : '',
												nodeTone === 'done' ? 'vex-boot-label--done' : '',
												nodeTone === 'idle' ? 'vex-boot-label--idle' : '',
											]
												.filter(Boolean)
												.join(' ')}
										>
											{label}
										</span>
									</li>
								);
							})}
						</ul>
					</nav>
				</footer>
			</div>
		</div>
	);
}
