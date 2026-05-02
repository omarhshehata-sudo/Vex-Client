import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const styles: Record<Variant, string> = {
	primary:
		'rounded-vex bg-vex-accent px-5 py-2.5 text-sm font-semibold text-white shadow-vex ring-1 ring-white/10 hover:-translate-y-0.5 hover:bg-vex-accentHover disabled:cursor-not-allowed disabled:opacity-40',
	secondary:
		'rounded-vex border border-vex-border/70 bg-vex-surface px-5 py-2.5 text-sm font-medium text-vex-text hover:-translate-y-0.5 hover:border-vex-accent/40 hover:bg-vex-raised disabled:cursor-not-allowed disabled:opacity-40',
	ghost:
		'rounded-vex px-3 py-2 text-sm font-medium text-vex-dim hover:-translate-y-0.5 hover:bg-white/5 hover:text-vex-text disabled:opacity-40',
	danger:
		'rounded-vex border border-vex-error/35 bg-vex-error/10 px-5 py-2.5 text-sm font-semibold text-red-100 hover:-translate-y-0.5 hover:bg-vex-error/20 disabled:cursor-not-allowed disabled:opacity-40',
};

export function Button({
	variant = 'secondary',
	className = '',
	children,
	loading = false,
	...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode; loading?: boolean }) {
	const disabled = Boolean(rest.disabled || loading);
	return (
		<button
			type="button"
			className={`vex-no-drag vex-press vex-glow-hover vex-ease inline-flex items-center justify-center leading-none ${styles[variant]} ${className}`.trim()}
			{...rest}
			disabled={disabled}
		>
			<span className="flex items-center justify-center gap-2 leading-none">
				{loading && <Spinner className={variant === 'secondary' || variant === 'ghost' ? 'border-t-vex-text' : ''} />}
				{children}
			</span>
		</button>
	);
}
