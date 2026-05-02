import { iconBaseProps, type IconProps } from './Icon';

export function IconHome(props: IconProps) {
	return (
		<svg {...iconBaseProps(props)}>
			<path d="M3 10.5L12 3l9 7.5" />
			<path d="M5.5 9.8V21h13V9.8" />
		</svg>
	);
}

export function IconNews(props: IconProps) {
	return (
		<svg {...iconBaseProps(props)}>
			<path d="M6 3h12a2 2 0 0 1 2 2v14l-4-3-4 3-4-3-4 3V5a2 2 0 0 1 2-2z" />
			<path d="M8.5 8.5h7" />
			<path d="M8.5 11.5h5.5" />
			<path d="M8.5 14.5h7" />
		</svg>
	);
}

export function IconPlay(props: IconProps) {
	return (
		<svg {...iconBaseProps(props)}>
			<path d="M9.2 7.4v9.2L17 12l-7.8-4.6z" />
		</svg>
	);
}

export function IconLayers(props: IconProps) {
	return (
		<svg {...iconBaseProps(props)}>
			<path d="M12 3l9 5-9 5-9-5 9-5z" />
			<path d="M3 12l9 5 9-5" />
			<path d="M3 16.5l9 5 9-5" />
		</svg>
	);
}

/** Launcher profiles (saved game setups). */
export function IconProfiles(props: IconProps) {
	return (
		<svg {...iconBaseProps(props)}>
			<rect x="4" y="4" width="16" height="10" rx="2" />
			<path d="M7 18h10M9 14v4M15 14v4" />
		</svg>
	);
}

export function IconCog(props: IconProps) {
	return (
		<svg {...iconBaseProps(props)}>
			<path d="M12 15.3a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6z" />
			<path d="M19.4 12a7.6 7.6 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7.8 7.8 0 0 0-1.7-1L15 3h-6l-.2 2.9a7.8 7.8 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a7.8 7.8 0 0 0 1.7 1L9 21h6l.2-2.9a7.8 7.8 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5c.1-.3.1-.7.1-1z" />
		</svg>
	);
}

export function IconUser(props: IconProps) {
	return (
		<svg {...iconBaseProps(props)}>
			<path d="M20 21a8 8 0 0 0-16 0" />
			<path d="M12 13a4 4 0 1 0-4-4 4 4 0 0 0 4 4z" />
		</svg>
	);
}

export function IconDownload(props: IconProps) {
	return (
		<svg {...iconBaseProps(props)}>
			<path d="M12 3v10" />
			<path d="M8 9l4 4 4-4" />
			<path d="M4 21h16" />
		</svg>
	);
}

export function IconMod(props: IconProps) {
	return (
		<svg {...iconBaseProps(props)}>
			<path d="M10 4h4v4h-4z" />
			<path d="M4 10h4v4H4z" />
			<path d="M16 10h4v4h-4z" />
			<path d="M10 16h4v4h-4z" />
		</svg>
	);
}

export function IconPalette(props: IconProps) {
	return (
		<svg {...iconBaseProps(props)}>
			<path d="M12 3a9 9 0 1 0 0 18h1.2a2.8 2.8 0 0 0 2.8-2.8c0-1.5-1.2-2.7-2.7-2.7H12a2 2 0 0 1 0-4h3.2A3.8 3.8 0 0 0 19 7.7 4.7 4.7 0 0 0 12 3z" />
			<path d="M7.5 10.5h0" />
			<path d="M9.5 7.5h0" />
			<path d="M14.5 7.5h0" />
			<path d="M16.5 10.5h0" />
		</svg>
	);
}

