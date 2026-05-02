import type { InputHTMLAttributes } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & {
	className?: string;
	mono?: boolean;
};

export function Input({ className = '', mono, ...rest }: Props) {
	return (
		<input
			{...rest}
			className={[
				'vex-no-drag w-full rounded-vex border border-vex-border/60 bg-vex-bg/40 px-4 py-3 text-sm text-vex-text outline-none transition-[color,background-color,border-color,box-shadow,opacity] duration-[var(--vex-ui-ms)] vex-ease',
				'placeholder:text-vex-dim/70 focus:border-vex-accent/50 focus:ring-2 focus:ring-vex-accent/20',
				mono ? 'font-mono text-xs' : '',
				className,
			]
				.filter(Boolean)
				.join(' ')}
		/>
	);
}

