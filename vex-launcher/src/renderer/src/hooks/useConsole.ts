import { useMemo, useSyncExternalStore } from 'react';

import { ConsoleService, type ConsoleLogEntry, type ConsoleLogType } from '../services/ConsoleService';

export function useConsole(filter?: Set<ConsoleLogType>): ConsoleLogEntry[] {
	const entries = useSyncExternalStore(
		(listener) => ConsoleService.subscribe(listener),
		() => ConsoleService.getEntries(),
		() => ConsoleService.getEntries(),
	);

	return useMemo(() => {
		if (!filter || filter.size === 0) return entries;
		return entries.filter((e) => filter.has(e.type));
	}, [entries, filter]);
}

