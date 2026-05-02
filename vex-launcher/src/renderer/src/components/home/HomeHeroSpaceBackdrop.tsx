import type { CSSProperties } from 'react';
import { useId } from 'react';

import type { McVexPose } from './McVexPixelSvg';
import { McVexPixelSvg } from './McVexPixelSvg';

/**
 * Full-bleed cosmic hero: starfield, nebula, optional reference art blend,
 * procedural planets / vortex, Minecraft-style pixel Vexes (SVG), and animated flyers.
 */
type Props = {
	/** Bundled PNG for extra depth; when omitted, CSS-only scene + vector Vexes are used. */
	heroImageUrl?: string | null;
	/** Animated flyers (default true). Boot screen uses false for a calmer read. */
	showFlyers?: boolean;
};

const FLYERS: Array<{
	className: string;
	size: string;
	pose: McVexPose;
	mirror: boolean;
	style?: CSSProperties;
}> = [
	{ className: 'vex-home-flyer vex-home-flyer--a', size: 'w-[76px] md:w-[100px]', pose: 0, mirror: true },
	{ className: 'vex-home-flyer vex-home-flyer--b', size: 'w-[60px] md:w-[80px]', pose: 1, mirror: false, style: { animationDelay: '-8s' } },
	{ className: 'vex-home-flyer vex-home-flyer--c', size: 'w-[68px] md:w-[90px]', pose: 2, mirror: true, style: { animationDelay: '-18s' } },
	{ className: 'vex-home-flyer vex-home-flyer--d', size: 'w-[52px] md:w-[70px]', pose: 0, mirror: false, style: { animationDelay: '-4s' } },
	{ className: 'vex-home-flyer vex-home-flyer--e', size: 'w-[62px] md:w-[84px]', pose: 1, mirror: true, style: { animationDelay: '-22s' } },
	{ className: 'vex-home-flyer vex-home-flyer--f', size: 'w-[46px] md:w-[62px]', pose: 2, mirror: false, style: { animationDelay: '-12s' } },
	{ className: 'vex-home-flyer vex-home-flyer--g', size: 'w-[56px] md:w-[74px]', pose: 0, mirror: true, style: { animationDelay: '-28s' } },
];

/** Planets, rings, vortex — no center dim (dim + tableau sit above). */
function ProceduralCosmicLayers() {
	return (
		<>
			<div
				className="absolute -left-[12%] top-[3%] h-[min(52vmin,56vh)] w-[min(52vmin,56vh)] max-h-[620px] max-w-[620px] rounded-full opacity-[0.88] shadow-[inset_-10px_-14px_48px_rgba(0,0,0,0.58)]"
				style={{
					background:
						'radial-gradient(circle at 32% 26%, rgba(237,233,254,0.42) 0%, rgba(167,139,250,0.28) 8%, rgba(109,40,217,0.5) 24%, rgba(55,48,163,0.82) 48%, rgba(15,10,32,0.96) 100%)',
				}}
				aria-hidden
			/>
			<div
				className="absolute left-[2%] top-[24%] h-[min(34vmin,38vh)] w-[min(54vmin,58vh)] max-h-[480px] max-w-[640px] origin-center rounded-full border border-white/[0.08] border-t-white/[0.2] opacity-90 shadow-[0_0_80px_rgba(139,92,246,0.18)] [transform:rotate(16deg)_scaleY(0.32)]"
				aria-hidden
			/>
			<div
				className="absolute -right-[5%] top-[12%] h-[min(30vmin,34vh)] w-[min(30vmin,34vh)] max-h-[400px] max-w-[400px] rounded-full opacity-[0.9] shadow-[inset_-8px_-10px_32px_rgba(0,0,0,0.52)]"
				style={{
					background:
						'radial-gradient(circle at 38% 32%, rgba(221,214,254,0.45) 0%, rgba(139,92,246,0.42) 28%, rgba(76,29,149,0.88) 58%, rgba(12,8,28,0.98) 100%)',
				}}
				aria-hidden
			/>
			<div
				className="absolute -right-[2%] top-[22%] h-[min(40vmin,44vh)] w-[min(52vmin,56vh)] max-h-[520px] max-w-[680px] origin-center rounded-full border border-violet-200/[0.12] border-b-fuchsia-300/25 opacity-80 [transform:rotate(-10deg)_scaleY(0.34)]"
				aria-hidden
			/>
			<div
				className="absolute right-[14%] top-[9%] h-[min(3.5vmin,28px)] w-[min(3.5vmin,28px)] rounded-full bg-violet-200/50 blur-[0.5px]"
				aria-hidden
			/>
			<div
				className="absolute left-[38%] top-[42%] h-[min(2vmin,18px)] w-[min(2vmin,18px)] rounded-full bg-fuchsia-200/35 blur-[1px]"
				aria-hidden
			/>
			<div
				className="pointer-events-none absolute left-1/2 top-[34%] h-[min(120vmin,140vh)] w-[min(120vmin,140vh)] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.14] blur-[1px] [background:conic-gradient(from_200deg_at_50%_50%,transparent_0deg,rgba(167,139,250,0.5)_52deg,transparent_104deg,rgba(192,132,252,0.35)_200deg,transparent_280deg)] mix-blend-screen"
				aria-hidden
			/>
		</>
	);
}

function ProceduralCosmicCenterDim() {
	return (
		<div
			className="absolute inset-0 bg-[radial-gradient(ellipse_58%_48%_at_50%_30%,rgba(5,5,5,0.4),transparent_72%)]"
			aria-hidden
		/>
	);
}

/** Large background Vexes (poster-style cluster) — procedural stand-in for hero reference art. */
function HeroMcVexTableau({ instanceId }: { instanceId: string }) {
	const items: Array<{
		itemKey: string;
		className: string;
		pose: McVexPose;
		mirror: boolean;
		opacity: string;
	}> = [
		{
			itemKey: `${instanceId}-h0`,
			className: 'absolute bottom-[5%] left-[1%] w-[min(28vmin,300px)] -rotate-[7deg]',
			pose: 0,
			mirror: true,
			opacity: 'opacity-[0.52]',
		},
		{
			itemKey: `${instanceId}-h1`,
			className: 'absolute bottom-[9%] left-[19%] w-[min(19vmin,200px)] rotate-[5deg]',
			pose: 1,
			mirror: false,
			opacity: 'opacity-[0.46]',
		},
		{
			itemKey: `${instanceId}-h2`,
			className: 'absolute bottom-[12%] right-[6%] w-[min(24vmin,260px)] rotate-[11deg]',
			pose: 2,
			mirror: true,
			opacity: 'opacity-[0.5]',
		},
		{
			itemKey: `${instanceId}-h3`,
			className: 'absolute bottom-[20%] right-[26%] w-[min(14vmin,150px)] -rotate-[3deg]',
			pose: 0,
			mirror: false,
			opacity: 'opacity-[0.34]',
		},
		{
			itemKey: `${instanceId}-h4`,
			className: 'absolute bottom-[3%] right-[1%] w-[min(17vmin,180px)] -rotate-[9deg]',
			pose: 1,
			mirror: true,
			opacity: 'opacity-[0.4]',
		},
		{
			itemKey: `${instanceId}-h5`,
			className: 'absolute bottom-[26%] left-[36%] w-[min(11vmin,118px)] rotate-[15deg]',
			pose: 2,
			mirror: false,
			opacity: 'opacity-[0.28]',
		},
	];

	return (
		<div className="pointer-events-none absolute inset-0" aria-hidden>
			{items.map((it) => (
				<div
					key={it.itemKey}
					className={`${it.className} ${it.opacity} saturate-[1.12] contrast-[1.05]`}
					style={{ filter: 'drop-shadow(0 0 22px rgba(139,92,246,0.42)) drop-shadow(0 0 6px rgba(0,0,0,0.85))' }}
				>
					<McVexPixelSvg className="h-auto w-full [image-rendering:pixelated]" pose={it.pose} mirror={it.mirror} />
				</div>
			))}
		</div>
	);
}

export function HomeHeroSpaceBackdrop({ heroImageUrl, showFlyers = true }: Props) {
	const useImage = Boolean(heroImageUrl);
	const instanceId = useId().replace(/:/g, '');

	return (
		<div className="pointer-events-none absolute inset-0 overflow-hidden">
			{/* Deep space */}
			<div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_20%,#1e0b3a_0%,#0a0514_45%,#030208_100%)]" />

			{/* Twinkling starfield */}
			<div className="vex-home-starfield absolute inset-0" />

			{/* Slow nebula clouds */}
			<div
				className="vex-home-nebula-a absolute -left-[20%] top-[10%] h-[55%] w-[70%] rounded-full bg-violet-600/25 blur-[100px]"
				aria-hidden
			/>
			<div
				className="vex-home-nebula-b absolute -right-[15%] top-[25%] h-[45%] w-[55%] rounded-full bg-fuchsia-500/20 blur-[90px]"
				aria-hidden
			/>
			<div
				className="vex-home-nebula-c absolute left-[20%] bottom-[-10%] h-[40%] w-[60%] rounded-full bg-indigo-600/18 blur-[110px]"
				aria-hidden
			/>

			{useImage ? (
				<>
					<div
						className="absolute inset-0 bg-cover bg-[center_28%] opacity-[0.62] mix-blend-soft-light"
						style={{ backgroundImage: `url(${heroImageUrl})` }}
					/>
					<div
						className="absolute inset-0 bg-cover bg-[center_28%] opacity-[0.22] mix-blend-overlay"
						style={{ backgroundImage: `url(${heroImageUrl})` }}
					/>
					<div
						className="absolute inset-0 bg-[radial-gradient(ellipse_58%_48%_at_50%_30%,rgba(5,5,5,0.78),transparent_72%)]"
						aria-hidden
					/>
				</>
			) : (
				<>
					<ProceduralCosmicLayers />
					<div className="absolute inset-0 mix-blend-soft-light">
						<HeroMcVexTableau instanceId={instanceId} />
					</div>
					<ProceduralCosmicCenterDim />
				</>
			)}

			{/* Violet atmosphere */}
			<div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_32%,rgba(139,92,246,0.22),transparent_62%)]" />

			{/* Flying Vexes */}
			{showFlyers ? (
				<div className="absolute inset-0">
					{FLYERS.map((f, i) => (
						<div
							key={i}
							className={`absolute left-0 top-0 will-change-transform ${f.className} ${f.size}`}
							style={f.style}
						>
							<McVexPixelSvg
								className="h-full w-full [image-rendering:pixelated] opacity-[0.9] drop-shadow-[0_0_20px_rgba(167,139,250,0.55)]"
								pose={f.pose}
								mirror={f.mirror}
							/>
						</div>
					))}
				</div>
			) : null}

			{/* Bottom fade into app chrome */}
			<div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/55 via-35% to-transparent to-72%" />
			<div className="absolute inset-0 bg-gradient-to-b from-[#050505]/50 from-0% via-transparent via-15% to-transparent" />
		</div>
	);
}
