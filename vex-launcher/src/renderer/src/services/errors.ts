export function formatAuthError(code: string, message: string): string {
	switch (code) {
		case 'MISSING_CLIENT_ID':
			return 'Microsoft login is not configured. Set environment variable VEX_MS_CLIENT_ID to your Azure public client id (redirect http://127.0.0.1:25585/callback).';
		case 'PORT_IN_USE':
			return message;
		case 'LOGIN_TIMEOUT':
			return 'Login timed out. Close the browser tab and try again.';
		case 'MICROSOFT_DENIED':
			return `Microsoft sign-in was denied or failed.\n${message}`;
		case 'MICROSOFT_TOKEN':
			return `Microsoft token exchange failed.\n${message}`;
		case 'XBOX_AUTH':
			if ((message ?? '').toLowerCase().includes('invalid app registration')) {
				return (
					`Xbox / Minecraft Services step failed.\n` +
					`${message}\n\n` +
					`You must request access for your Azure App to use the Minecraft Services API (api.minecraftservices.com).\n` +
					`Submit: https://aka.ms/mce-reviewappid\n`
				);
			}
			return `Xbox / Minecraft Services step failed.\n${message}`;
		case 'NOT_OWNED':
			return 'This Microsoft account does not own Minecraft Java Edition.';
		case 'TOKEN_EXPIRED':
			return 'Session expired. Please sign in again.';
		default:
			return message || 'An unexpected error occurred.';
	}
}
