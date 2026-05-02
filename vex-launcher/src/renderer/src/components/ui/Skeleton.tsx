import type { HTMLAttributes } from 'react';

export function Skeleton({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
	return <div {...rest} className={['vex-skeleton rounded-vex', className].filter(Boolean).join(' ')} />;
}

