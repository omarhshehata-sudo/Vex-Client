export function Spinner({ className = '', size = 16 }: { className?: string; size?: number }) {
	return (
		<span
			aria-hidden
			className={['inline-block animate-spin rounded-full border-2 border-white/25 border-t-white', className]
				.filter(Boolean)
				.join(' ')}
			style={{ width: size, height: size }}
		/>
	);
}

