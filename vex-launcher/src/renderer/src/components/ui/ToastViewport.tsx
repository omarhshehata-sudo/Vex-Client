import { useMemo } from 'react';

import { useToasts } from '../../hooks/useToasts';
import { ToastService, type Toast, type ToastType } from '../../services/ToastService';
import { IconCheck, IconInfo, IconWarning } from './icons';

function tone(t: ToastType) {
	switch (t) {
		case 'success':
			return {
				bg: 'bg-vex-success/10',
				border: 'border-vex-success/30',
				icon: <IconCheck size={18} />,
				color: 'text-vex-success',
			};
		case 'warn':
			return {
				bg: 'bg-vex-warning/10',
				border: 'border-vex-warning/30',
				icon: <IconWarning size={18} />,
				color: 'text-vex-warning',
			};
		case 'error':
			return {
				bg: 'bg-vex-error/10',
				border: 'border-vex-error/30',
				icon: <IconWarning size={18} />,
				color: 'text-vex-error',
			};
		default:
			return {
				bg: 'bg-white/5',
				border: 'border-vex-border',
				icon: <IconInfo size={18} />,
				color: 'text-vex-dim',
			};
	}
}

function ToastCard({ t }: { t: Toast }) {
	const s = useMemo(() => tone(t.type), [t.type]);
	return (
		<div
			className={[
				'pointer-events-auto rounded-[16px] border px-4 py-3 shadow-panel backdrop-blur-md',
				'transition duration-200',
				s.bg,
				s.border,
			].join(' ')}
			style={{
				animation: 'vexToastIn 240ms var(--vex-ease) both',
			}}
			onClick={() => ToastService.dismiss(t.id)}
			role="status"
		>
			<div className="flex items-start gap-3">
				<div className={['mt-0.5', s.color].join(' ')} aria-hidden>
					{s.icon}
				</div>
				<div className="min-w-0">
					<div className="text-[13px] font-semibold text-vex-text">{t.title}</div>
					{t.message && <div className="mt-0.5 text-[12px] leading-relaxed text-vex-dim">{t.message}</div>}
				</div>
			</div>
		</div>
	);
}

export function ToastViewport() {
	const toasts = useToasts();
	if (toasts.length === 0) return null;

	return (
		<div className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-[360px] max-w-[calc(100vw-24px)] flex-col gap-2">
			{toasts.map((t) => (
				<ToastCard key={t.id} t={t} />
			))}
		</div>
	);
}

