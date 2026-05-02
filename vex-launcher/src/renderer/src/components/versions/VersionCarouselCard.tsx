import { forwardRef } from 'react';

export type CarouselCardTone = 'center' | 'side';

export const VersionCarouselCard = forwardRef<
	HTMLButtonElement,
	{
		id: string;
		/** DOM id for `aria-activedescendant` on the parent listbox. */
		optionId?: string;
		subtitle?: string;
		badge?: string;
		tone: CarouselCardTone;
		scale: number;
		opacity: number;
		blurPx: number;
		onClick?: () => void;
	}
>(function VersionCarouselCard({ id, optionId, subtitle, badge, tone, scale, opacity, blurPx, onClick }, ref) {
	const isCenter = tone === 'center';

	return (
		<button
			ref={ref}
			type="button"
			id={optionId}
			role="option"
			tabIndex={-1}
			aria-selected={isCenter}
			onClick={onClick}
			className={[
				'vex-no-drag relative shrink-0 select-none',
				'h-[80px] w-[140px] rounded-[14px] p-3',
				'transition-[transform,opacity,filter,box-shadow,border-color] duration-[300ms] vex-ease',
				isCenter
					? [
							'z-[3] border-2 border-violet-400/70 bg-[#1E1E2A]',
							'shadow-[0_0_0_1px_rgba(167,139,250,0.35),0_0_28px_rgba(124,92,255,0.45),0_12px_40px_rgba(0,0,0,0.5)]',
							'ring-2 ring-violet-400/25',
					  ].join(' ')
					: 'z-[2] border border-white/[0.08] bg-[#17171F]',
				!isCenter ? 'hover:border-white/15 hover:bg-[#1B1B23]' : '',
			].join(' ')}
			style={{
				transform: `scale(${scale})`,
				opacity,
				filter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
			}}
		>
			{/* Badge */}
			{badge && (
				<div className="absolute right-2 top-2 rounded-full bg-vex-accent/14 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-vex-dim">
					{badge}
				</div>
			)}

			<div className="flex h-full flex-col justify-center text-center">
				{isCenter && (
					<div className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-violet-300/90">Selected</div>
				)}
				<div className={['font-mono text-[16px] font-bold', isCenter ? 'text-white' : 'text-vex-text'].join(' ')}>{id}</div>
				{subtitle && (
					<div className={['mt-1 text-[12px]', isCenter ? 'text-violet-200/75' : 'text-vex-dim'].join(' ')}>{subtitle}</div>
				)}
			</div>
		</button>
	);
});

