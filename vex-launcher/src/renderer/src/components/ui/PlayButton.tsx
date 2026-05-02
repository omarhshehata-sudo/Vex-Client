import { useCallback, useRef, useState, type ButtonHTMLAttributes, type MouseEvent } from 'react';

import { IconPlay } from './icons';
import { Spinner } from './Spinner';

export type PlayButtonPhase = 'idle' | 'checking' | 'downloading' | 'launching';

function labelFor(phase: PlayButtonPhase): string {
	switch (phase) {
		case 'checking':
			return 'Checking…';
		case 'downloading':
			return 'Downloading…';
		case 'launching':
			return 'Launching…';
		default:
			return 'Play';
	}
}

export function PlayButton({
	phase = 'idle',
	disabled,
	onClick,
	className,
	...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & { phase?: PlayButtonPhase }) {
	const loading = phase !== 'idle';
	const hardBlock = phase === 'launching' || phase === 'downloading';
	const isDisabled = Boolean(disabled || rest.disabled || hardBlock);
	const isIdle = phase === 'idle' && !isDisabled;
	const showSpinner = loading;
	const showSweep = phase === 'launching' || phase === 'downloading';

	const [ripple, setRipple] = useState(0);
	const lastNavRef = useRef(0);

	const handleClick = useCallback(
		(e: MouseEvent<HTMLButtonElement>) => {
			if (isDisabled) return;
			const now = Date.now();
			if (now - lastNavRef.current < 420) return;
			lastNavRef.current = now;
			setRipple((n) => n + 1);
			onClick?.(e);
		},
		[isDisabled, onClick]
	);

	return (
		<div className={['relative inline-flex', isIdle ? 'vex-play-wrap-idle' : ''].filter(Boolean).join(' ')}>
			{/* Slow purple aura behind the button (idle) */}
			<div
				aria-hidden
				className={[
					'pointer-events-none absolute left-1/2 top-1/2 h-[140%] w-[118%] -translate-x-1/2 -translate-y-1/2 rounded-[28px]',
					'opacity-0 transition-opacity duration-320 vex-ease',
					isIdle ? 'opacity-100' : 'opacity-35',
				].join(' ')}
			>
				<div
					className={[
						'h-full w-full rounded-[28px] bg-[radial-gradient(ellipse_at_50%_45%,rgba(124,92,255,0.42),transparent_68%)]',
						isIdle ? 'vex-play-aura' : '',
					].join(' ')}
				/>
			</div>

			<button
				type="button"
				{...rest}
				disabled={isDisabled}
				onClick={handleClick}
				className={[
					'vex-no-drag vex-play-btn group relative inline-flex select-none items-center justify-center overflow-hidden',
					'min-h-[64px] min-w-[320px] rounded-[22px] border text-[18px] font-semibold tracking-tight',
					'duration-150 vex-ease transition-[transform,box-shadow,border-color,filter,opacity]',
					isDisabled
						? 'cursor-not-allowed border-white/10 bg-white/[0.06] text-white/38 shadow-none'
						: [
								'cursor-pointer border-white/18 text-white',
								'shadow-[0_14px_44px_rgba(124,92,255,0.38),0_0_48px_rgba(124,92,255,0.22)]',
								'hover:scale-[1.025] hover:border-white/28 hover:shadow-[0_18px_52px_rgba(124,92,255,0.48),0_0_60px_rgba(124,92,255,0.32)]',
								'active:scale-[0.985] active:duration-75',
						  ].join(' '),
					!isDisabled ? 'focus:outline-none focus-visible:ring-2 focus-visible:ring-vex-accent/30' : '',
					isIdle ? 'vex-play-btn-idle' : '',
					loading ? 'vex-play-btn-loading' : '',
					className ?? '',
				]
					.filter(Boolean)
					.join(' ')}
			>
				{/* Ripple / flash on click */}
				{ripple > 0 && <span key={ripple} className="vex-play-ripple pointer-events-none" aria-hidden />}

				{/* Gradient fill */}
				<div
					aria-hidden
					className={[
						'absolute inset-0 transition-opacity duration-300',
						isDisabled ? 'opacity-25' : 'opacity-100',
					].join(' ')}
				>
					<div className="absolute inset-0 bg-gradient-to-br from-[#8F73FF] via-[#7C5CFF] to-[#5A3FE6]" />
					<div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/[0.07]" />
					<div className="absolute -inset-[40%] bg-vex-accent/20 blur-3xl opacity-70 transition duration-300 group-hover:opacity-95" />
				</div>

				{/* Loading: moving highlight across the button */}
				{showSweep && (
					<div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[22px]">
						<div className="vex-play-loading-sweep absolute inset-y-0 w-[45%]" />
					</div>
				)}

				{/* Hover shine */}
				<div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[22px]">
					<div className="vex-play-shine absolute -left-1/2 top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/18 to-transparent" />
				</div>

				<span className="relative z-[1] inline-flex items-center justify-center gap-[12px] leading-none">
					{phase === 'idle' && !isDisabled ? (
						<IconPlay size={22} strokeWidth={1.85} className="opacity-95" />
					) : null}
					{showSpinner ? <Spinner size={18} className="shrink-0" /> : null}
					<span className="whitespace-nowrap">{labelFor(phase)}</span>
				</span>
			</button>
		</div>
	);
}
