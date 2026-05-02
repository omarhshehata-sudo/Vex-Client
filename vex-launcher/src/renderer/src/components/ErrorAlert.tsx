export function ErrorAlert({
	title,
	detail,
	friendly,
}: {
	title: string;
	detail: string;
	friendly?: string;
}) {
	return (
		<div
			className="rounded-vex border border-vex-error/35 bg-vex-error/10 px-4 py-3 text-sm text-red-100"
			role="alert"
		>
			<div className="font-semibold">{title}</div>
			{friendly && <div className="mt-1 text-xs leading-relaxed text-red-100/90">{friendly}</div>}
			<details className="mt-2">
				<summary className="cursor-pointer select-none text-[11px] text-red-100/80">Details</summary>
				<pre className="mt-2 whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-red-100/90">{detail}</pre>
			</details>
		</div>
	);
}
