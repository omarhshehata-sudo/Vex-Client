/** Split one line respecting single/double quotes (no escapes). */
function splitQuotedLine(line: string): string[] {
	const t = line.trim();
	if (!t) return [];
	const out: string[] = [];
	let cur = '';
	let q: '"' | "'" | null = null;
	for (let i = 0; i < t.length; i += 1) {
		const c = t[i]!;
		if (q) {
			if (c === q) q = null;
			else cur += c;
			continue;
		}
		if (c === '"' || c === "'") {
			q = c;
			continue;
		}
		if (/\s/.test(c)) {
			if (cur) {
				out.push(cur);
				cur = '';
			}
			continue;
		}
		cur += c;
	}
	if (cur) out.push(cur);
	return out;
}

/** Parse multi-line JVM flags from settings (whitespace + quotes). */
export function parseExtraJvmArgs(raw: string | null | undefined): string[] {
	const text = String(raw ?? '').trim();
	if (!text) return [];
	const out: string[] = [];
	for (const line of text.split(/\r?\n/)) {
		out.push(...splitQuotedLine(line));
	}
	return out;
}
