import type { SVGProps } from 'react';

export type IconProps = SVGProps<SVGSVGElement> & {
	size?: number;
	strokeWidth?: number;
};

export function iconBaseProps(props: IconProps) {
	const { size = 20, strokeWidth = 1.8, ...rest } = props;
	return {
		width: size,
		height: size,
		viewBox: '0 0 24 24',
		fill: 'none',
		xmlns: 'http://www.w3.org/2000/svg',
		stroke: 'currentColor',
		strokeWidth,
		strokeLinecap: 'round' as const,
		strokeLinejoin: 'round' as const,
		...rest,
	};
}

