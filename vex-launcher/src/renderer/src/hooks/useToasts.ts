import { useSyncExternalStore } from 'react';

import { ToastService } from '../services/ToastService';

export function useToasts() {
	return useSyncExternalStore(
		(cb) => ToastService.subscribe(cb),
		() => ToastService.get(),
		() => ToastService.get()
	);
}

