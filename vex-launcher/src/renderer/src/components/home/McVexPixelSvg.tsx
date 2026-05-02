/**
 * Minecraft-style Vex: hand-authored SVG pixel rects (Java palette, ~20×28 “skin” scale).
 * Original vector art for launcher use — not a Mojang texture file.
 */
export type McVexPose = 0 | 1 | 2;

/** x, y, w, h, fill */
type Pixel = readonly [number, number, number, number, string];

/** Front-facing Vex: tall side wings, iron sword raised to the right. */
const POSE_FRONT: Pixel[] = [
	[7, 0, 6, 1, '#9aa0b8'],
	[6, 1, 8, 5, '#7d8298'],
	[6, 3, 8, 1, '#3a3d4d'],
	[7, 4, 2, 1, '#1e2130'],
	[11, 4, 2, 1, '#1e2130'],
	[9, 5, 2, 1, '#4b5066'],
	[0, 3, 5, 17, '#6a6f86'],
	[1, 5, 2, 12, '#555a70'],
	[15, 3, 5, 17, '#6a6f86'],
	[17, 5, 2, 12, '#555a70'],
	[8, 6, 4, 9, '#73788f'],
	[9, 7, 2, 7, '#5c6078'],
	[7, 15, 6, 3, '#4e5268'],
	[8, 18, 2, 4, '#3d4155'],
	[10, 18, 2, 4, '#3d4155'],
	[12, 1, 2, 2, '#e4e6ef'],
	[13, 3, 2, 3, '#d1d4de'],
	[14, 6, 2, 4, '#b8bcc9'],
	[15, 10, 2, 5, '#9ca0b0'],
	[16, 15, 2, 3, '#7e8496'],
];

/** Charging lean: sword thrust forward, wings swept. */
const POSE_CHARGE: Pixel[] = [
	[6, 0, 6, 1, '#9aa0b8'],
	[5, 1, 8, 5, '#7d8298'],
	[5, 3, 8, 1, '#3a3d4d'],
	[6, 4, 2, 1, '#1e2130'],
	[10, 4, 2, 1, '#1e2130'],
	[0, 5, 4, 14, '#6a6f86'],
	[1, 7, 2, 9, '#555a70'],
	[16, 4, 4, 15, '#6a6f86'],
	[17, 6, 2, 10, '#555a70'],
	[7, 6, 5, 8, '#73788f'],
	[8, 7, 3, 6, '#5c6078'],
	[6, 14, 7, 3, '#4e5268'],
	[7, 17, 2, 4, '#3d4155'],
	[10, 17, 2, 4, '#3d4155'],
	[11, 8, 2, 2, '#e4e6ef'],
	[12, 10, 2, 2, '#d1d4de'],
	[13, 12, 2, 3, '#b8bcc9'],
	[14, 15, 2, 4, '#9ca0b0'],
	[15, 19, 2, 2, '#7e8496'],
];

/** Angled hover: asymmetric wings, sword low. */
const POSE_BANK: Pixel[] = [
	[8, 0, 5, 1, '#9aa0b8'],
	[7, 1, 7, 5, '#7d8298'],
	[7, 3, 7, 1, '#3a3d4d'],
	[8, 4, 2, 1, '#1e2130'],
	[12, 4, 1, 1, '#1e2130'],
	[0, 4, 5, 15, '#6a6f86'],
	[1, 6, 2, 9, '#555a70'],
	[14, 2, 6, 16, '#6a6f86'],
	[16, 4, 2, 11, '#555a70'],
	[8, 6, 4, 8, '#73788f'],
	[9, 7, 2, 6, '#5c6078'],
	[7, 14, 6, 3, '#4e5268'],
	[8, 17, 2, 4, '#3d4155'],
	[10, 17, 2, 4, '#3d4155'],
	[11, 16, 2, 2, '#e4e6ef'],
	[10, 18, 2, 2, '#d1d4de'],
	[9, 20, 2, 2, '#b8bcc9'],
	[8, 22, 2, 2, '#9ca0b0'],
];

const POSES: readonly Pixel[][] = [POSE_FRONT, POSE_CHARGE, POSE_BANK];

type Props = {
	className?: string;
	pose?: McVexPose;
	/** Horizontal flip (useful for variety in crowds). */
	mirror?: boolean;
};

export function McVexPixelSvg({ className, pose = 0, mirror }: Props) {
	const rects = POSES[pose] ?? POSES[0];
	return (
		<svg
			className={className}
			viewBox="0 0 20 28"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden
			shapeRendering="crispEdges"
		>
			<g transform={mirror ? 'translate(20 0) scale(-1 1)' : undefined}>
				{rects.map((r, i) => (
					<rect key={i} x={r[0]} y={r[1]} width={r[2]} height={r[3]} fill={r[4]} />
				))}
			</g>
		</svg>
	);
}
