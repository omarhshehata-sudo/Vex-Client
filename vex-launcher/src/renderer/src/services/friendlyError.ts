export function friendlyErrorMessage(raw: string): string | null {
	const msg = String(raw ?? '').toLowerCase();
	if (msg.includes('java') && (msg.includes('enoent') || msg.includes('not found'))) {
		return 'Java was not found. Install Java 21+, or set the Java path in Settings.';
	}
	if (msg.includes('eacces') || msg.includes('permission denied')) {
		return 'Permission denied. Try choosing a different game directory, or grant the app access to that folder.';
	}
	if (msg.includes('network') || msg.includes('fetch') || msg.includes('ecconnreset') || msg.includes('etimedout')) {
		return 'Network request failed. Check your connection and try again.';
	}
	if (msg.includes('redirect_uri')) {
		return 'Microsoft login redirect URL is misconfigured. Ensure the redirect URI matches what’s configured in Azure.';
	}
	if (msg.includes('invalid app registration')) {
		return 'Microsoft login isn’t approved for Minecraft Services yet. This is an app registration approval issue, not your fault.';
	}
	return null;
}

