import { iconBaseProps, type IconProps } from './Icon';

export function IconChip(props: IconProps) {
	return (
		<svg {...iconBaseProps(props)}>
			<path d="M9 3v3" />
			<path d="M15 3v3" />
			<path d="M9 18v3" />
			<path d="M15 18v3" />
			<path d="M3 9h3" />
			<path d="M3 15h3" />
			<path d="M18 9h3" />
			<path d="M18 15h3" />
			<path d="M7 7h10v10H7V7z" />
		</svg>
	);
}

export function IconCoffee(props: IconProps) {
	return (
		<svg {...iconBaseProps(props)}>
			<path d="M4 8h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8z" />
			<path d="M16 10h2a2 2 0 0 1 0 4h-2" />
			<path d="M6 3h0" />
			<path d="M9 3h0" />
			<path d="M12 3h0" />
		</svg>
	);
}

export function IconScreen(props: IconProps) {
	return (
		<svg {...iconBaseProps(props)}>
			<path d="M4 5h16v11H4V5z" />
			<path d="M8 19h8" />
			<path d="M12 16v3" />
		</svg>
	);
}

export function IconMoon(props: IconProps) {
	return (
		<svg {...iconBaseProps(props)}>
			<path d="M21 13.2A7.5 7.5 0 0 1 10.8 3a6.8 6.8 0 1 0 10.2 10.2z" />
		</svg>
	);
}

export function IconSpark(props: IconProps) {
	return (
		<svg {...iconBaseProps(props)}>
			<path d="M12 2l1.2 6.2L20 12l-6.8 3.8L12 22l-1.2-6.2L4 12l6.8-3.8L12 2z" />
		</svg>
	);
}

export function IconBug(props: IconProps) {
	return (
		<svg {...iconBaseProps(props)}>
			<path d="M9 9h6" />
			<path d="M10 14h4" />
			<path d="M12 7a4 4 0 0 0-4 4v3a4 4 0 0 0 8 0v-3a4 4 0 0 0-4-4z" />
			<path d="M8 6l-2-2" />
			<path d="M16 6l2-2" />
			<path d="M6 13H3" />
			<path d="M21 13h-3" />
			<path d="M7 17l-2 2" />
			<path d="M17 17l2 2" />
		</svg>
	);
}

