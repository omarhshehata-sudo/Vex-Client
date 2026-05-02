import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type MenuSelectOption<T extends string = string> = { value: T; label: string; description?: string };

type Props<T extends string> = {
	value: T;
	onChange: (value: T) => void;
	options: MenuSelectOption<T>[];
	className?: string;
	buttonClassName?: string;
	disabled?: boolean;
	'aria-label'?: string;
};

/**
 * Custom listbox: list is portaled to `document.body` so it clears `overflow-hidden` parents
 * and stacks above page controls (e.g. profile “Select” buttons). Optional `description` per row.
 */
export function MenuSelect<T extends string>({
	value,
	onChange,
	options,
	className = '',
	buttonClassName = '',
	disabled,
	'aria-label': ariaLabel,
}: Props<T>) {
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const portalRef = useRef<HTMLDivElement>(null);
	const listId = useId();
	const selected = options.find((o) => o.value === value);

	const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number; maxH: number } | null>(null);

	const measure = useCallback(() => {
		const el = triggerRef.current;
		if (!el) return;
		const r = el.getBoundingClientRect();
		const gap = 6;
		const wantWide = options.some((o) => o.description);
		const width = Math.min(Math.max(r.width, wantWide ? 288 : r.width), window.innerWidth - 16);
		let left = r.left;
		left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
		const maxH = Math.max(140, Math.min(340, window.innerHeight - r.bottom - gap - 16));
		setMenuRect({ top: r.bottom + gap, left, width, maxH });
	}, [options]);

	useLayoutEffect(() => {
		if (!open) {
			setMenuRect(null);
			return;
		}
		measure();
		const onWin = () => measure();
		window.addEventListener('resize', onWin);
		window.addEventListener('scroll', onWin, true);
		return () => {
			window.removeEventListener('resize', onWin);
			window.removeEventListener('scroll', onWin, true);
		};
	}, [open, measure]);

	useEffect(() => {
		if (!open) return;
		const onDoc = (e: MouseEvent) => {
			const t = e.target as Node;
			if (rootRef.current?.contains(t) || portalRef.current?.contains(t)) return;
			setOpen(false);
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setOpen(false);
		};
		document.addEventListener('mousedown', onDoc, true);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDoc, true);
			document.removeEventListener('keydown', onKey);
		};
	}, [open]);

	const dropdown =
		open && menuRect ? (
			<div
				ref={portalRef}
				className="pointer-events-auto fixed z-[20000]"
				style={{ top: menuRect.top, left: menuRect.left, width: menuRect.width }}
			>
				<ul
					id={listId}
					role="listbox"
					tabIndex={-1}
					style={{ maxHeight: menuRect.maxH }}
					className={[
						'vex-app-scroll overflow-y-auto overflow-x-hidden rounded-[14px]',
						'border border-white/[0.12] bg-[#12121a]/95 py-1.5 shadow-[0_24px_80px_rgba(0,0,0,0.85),0_0_0_1px_rgba(139,92,246,0.22)]',
						'backdrop-blur-xl ring-1 ring-violet-500/25',
					].join(' ')}
				>
					{options.map((opt) => {
						const isSel = opt.value === value;
						const rowAlign = opt.description ? 'items-start' : 'items-center';
						return (
							<li key={String(opt.value)} role="none">
								<button
									type="button"
									role="option"
									aria-selected={isSel}
									className={[
										'vex-no-drag flex w-full gap-2.5 px-3 py-2.5 text-left transition duration-150',
										rowAlign,
										isSel
											? 'bg-gradient-to-r from-violet-600/45 via-violet-600/25 to-fuchsia-600/20 text-white shadow-[inset_3px_0_0_#c4b5fd]'
											: 'text-white/80 hover:bg-white/[0.08] hover:text-white',
									].join(' ')}
									onClick={() => {
										onChange(opt.value);
										setOpen(false);
									}}
								>
									<span
										className={['flex h-3.5 w-3.5 shrink-0 items-center justify-center', opt.description ? 'mt-0.5' : ''].join(' ')}
										aria-hidden
									>
										{isSel ? (
											<svg className="h-3 w-3 text-violet-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
												<polyline points="20 6 9 17 4 12" />
											</svg>
										) : null}
									</span>
									<span className="flex min-w-0 flex-1 flex-col gap-0.5">
										<span className="text-[13px] font-semibold tracking-tight">{opt.label}</span>
										{opt.description ? (
											<span className="text-[11px] font-normal leading-snug text-white/48">{opt.description}</span>
										) : null}
									</span>
								</button>
							</li>
						);
					})}
				</ul>
			</div>
		) : null;

	return (
		<div ref={rootRef} className={['relative', className].filter(Boolean).join(' ')}>
			<button
				ref={triggerRef}
				type="button"
				disabled={disabled}
				aria-label={ariaLabel}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={open ? listId : undefined}
				onClick={() => {
					if (!disabled) setOpen((o) => !o);
				}}
				className={[
					'vex-no-drag flex h-10 w-full items-center justify-between gap-2 rounded-[12px] border border-white/10 bg-[#1B1B23] px-3 text-left text-[13px] font-medium text-vex-text transition',
					'hover:border-[#A78BFA]/40 hover:bg-[#22222c] focus:outline-none focus:ring-2 focus:ring-violet-500/35',
					disabled ? 'cursor-not-allowed opacity-45' : '',
					buttonClassName,
				]
					.filter(Boolean)
					.join(' ')}
			>
				<span className="truncate">{selected?.label ?? value}</span>
				<svg
					className={['h-4 w-4 shrink-0 text-white/45 transition duration-200', open ? '-rotate-180' : ''].join(' ')}
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					aria-hidden
				>
					<path d="M6 9l6 6 6-6" />
				</svg>
			</button>
			{typeof document !== 'undefined' && dropdown ? createPortal(dropdown, document.body) : null}
		</div>
	);
}
