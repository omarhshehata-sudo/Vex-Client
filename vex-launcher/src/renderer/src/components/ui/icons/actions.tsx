import { iconBaseProps, type IconProps } from './Icon';

export function IconFolder(props: IconProps) {
	return (
		<svg {...iconBaseProps(props)}>
			<path d="M3.5 6.5h6l2 2h9v10.5a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2V6.5z" />
		</svg>
	);
}

export function IconCopy(props: IconProps) {
	return (
		<svg {...iconBaseProps(props)}>
			<path d="M9 9h10v10H9V9z" />
			<path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
		</svg>
	);
}

export function IconTrash(props: IconProps) {
	return (
		<svg {...iconBaseProps(props)}>
			<path d="M4 7h16" />
			<path d="M10 11v6" />
			<path d="M14 11v6" />
			<path d="M6 7l1 14h10l1-14" />
			<path d="M9 7V4h6v3" />
		</svg>
	);
}

export function IconRefresh(props: IconProps) {
	return (
		<svg {...iconBaseProps(props)}>
			<path d="M20 12a8 8 0 0 1-14.8 4" />
			<path d="M4 12a8 8 0 0 1 14.8-4" />
			<path d="M20 4v5h-5" />
			<path d="M4 20v-5h5" />
		</svg>
	);
}

export function IconInfo(props: IconProps) {
	return (
		<svg {...iconBaseProps(props)}>
			<path d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10z" />
			<path d="M12 10v6" />
			<path d="M12 7h0" />
		</svg>
	);
}

export function IconWarning(props: IconProps) {
	return (
		<svg {...iconBaseProps(props)}>
			<path d="M12 3l10 18H2L12 3z" />
			<path d="M12 9v5" />
			<path d="M12 17h0" />
		</svg>
	);
}

export function IconCheck(props: IconProps) {
	return (
		<svg {...iconBaseProps(props)}>
			<path d="M20 6L9 17l-5-5" />
		</svg>
	);
}

