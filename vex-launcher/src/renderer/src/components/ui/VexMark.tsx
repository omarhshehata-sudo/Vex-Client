import vexMarkSrc from '../../assets/Vex-mark.svg';

/**
 * Renders the canonical Vex mark from `src/renderer/src/assets/Vex-mark.svg`.
 * Uses an `<img>` so the file is used verbatim and multiple instances never clash on SVG `id`s.
 */
export function VexMark({
	size = 36,
	className,
	alt = '',
}: {
	size?: number;
	className?: string;
	/** When empty, the mark is treated as decorative (loading screen, sidebar icon, etc.). */
	alt?: string;
}) {
	const fillParent = Boolean(className);
	const style = fillParent
		? ({
				display: 'block',
				width: '100%',
				height: 'auto',
				objectFit: 'contain',
			} as const)
		: ({
				display: 'block',
				width: size,
				height: size,
				objectFit: 'contain',
			} as const);

	return (
		<img
			src={vexMarkSrc}
			alt={alt}
			{...(alt ? {} : { 'aria-hidden': true as const })}
			className={className}
			style={style}
			draggable={false}
			decoding="async"
		/>
	);
}
