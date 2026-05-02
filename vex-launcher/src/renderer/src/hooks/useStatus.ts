import { useSyncExternalStore } from 'react';

import { StatusService, type StatusSnapshot } from '../services/StatusService';

export function useStatus(): StatusSnapshot {
	return useSyncExternalStore(
		(listener) => StatusService.subscribe(listener),
		() => StatusService.getSnapshot(),
		() => StatusService.getSnapshot(),
	);
}
