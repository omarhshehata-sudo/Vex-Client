import type { SelectHTMLAttributes } from 'react';

type Props = SelectHTMLAttributes<HTMLSelectElement> & { className?: string };

export function Select({ className = '', ...rest }: Props) {
	return (
		<select
			{...rest}
			className={[
				'vex-no-drag w-full appearance-none rounded-vex border border-vex-border/60 bg-vex-bg/40 px-4 py-3 text-sm text-vex-text outline-none transition duration-200 ease-out',
				'focus:border-vex-accent/50 focus:ring-2 focus:ring-vex-accent/20',
				className,
			]
				.filter(Boolean)
				.join(' ')}
		/>
	);
}

