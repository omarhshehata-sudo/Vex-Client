import { createHash, randomBytes } from 'node:crypto';
import http from 'node:http';
import { shell } from 'electron';

import type { AuthErrorCode, LauncherAuthState } from '../types';

const MS_AUTHORIZE = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize';
const MS_TOKEN = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token';
const XBL_AUTH = 'https://user.auth.xboxlive.com/user/authenticate';
const XSTS_AUTH = 'https://xsts.auth.xboxlive.com/xsts/authorize';
const MC_LOGIN_WITH_XBOX = 'https://api.minecraftservices.com/authentication/login_with_xbox';
const MC_ENTITLEMENTS = 'https://api.minecraftservices.com/entitlements/mcstore';
const MC_PROFILE = 'https://api.minecraftservices.com/minecraft/profile';

const DEFAULT_LOOPBACK_PORT = 25585;
// Allow overriding via env so your Azure redirect URI can match exactly.
// Example: `VEX_MS_REDIRECT_URI="http://127.0.0.1:25585/callback"`
const REDIRECT_URI =
	process.env.VEX_MS_REDIRECT_URI?.trim() ||
	`http://127.0.0.1:${DEFAULT_LOOPBACK_PORT}/callback`;

const redirectUrl = new URL(REDIRECT_URI);
const LOOPBACK_PORT = Number.isFinite(Number(redirectUrl.port)) && redirectUrl.port ? Number(redirectUrl.port) : DEFAULT_LOOPBACK_PORT;
const CALLBACK_PATH = redirectUrl.pathname && redirectUrl.pathname.length > 0 ? redirectUrl.pathname : '/callback';

export class AuthError extends Error {
	readonly code: AuthErrorCode;
	constructor(code: AuthErrorCode, message: string, cause?: unknown) {
		super(message, { cause });
		this.code = code;
		this.name = 'AuthError';
	}
}

function msClientId(): string | null {
	const env = process.env.VEX_MS_CLIENT_ID?.trim();
	if (env) return env;
	return null;
}

function b64url(buf: Buffer): string {
	return buf
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/g, '');
}

function createPkce(): { verifier: string; challenge: string; state: string } {
	const verifier = b64url(randomBytes(32));
	const challenge = b64url(createHash('sha256').update(verifier, 'ascii').digest());
	const state = b64url(randomBytes(16));
	return { verifier, challenge, state };
}

function buildAuthorizeUrl(clientId: string, pkce: ReturnType<typeof createPkce>): string {
	const scope = 'XboxLive.signin offline_access';
	const params = new URLSearchParams({
		client_id: clientId,
		response_type: 'code',
		redirect_uri: REDIRECT_URI,
		response_mode: 'query',
		scope,
		code_challenge: pkce.challenge,
		code_challenge_method: 'S256',
		state: pkce.state,
	});
	return `${MS_AUTHORIZE}?${params.toString()}`;
}

async function waitForAuthCode(expectedState: string, onListening: () => void | Promise<void>): Promise<string> {
	return new Promise((resolve, reject) => {
		const server = http.createServer((req, res) => {
			try {
				if (!req.url?.startsWith(CALLBACK_PATH)) return;
				const url = new URL(req.url, `http://127.0.0.1:${LOOPBACK_PORT}`);
				const code = url.searchParams.get('code');
				const state = url.searchParams.get('state');
				const err = url.searchParams.get('error');
				const errDesc = url.searchParams.get('error_description');

				const escapeHtml = (s: string): string =>
					s.replace(/[&<>"']/g, (ch) => (ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '"' ? '&quot;' : '&#39;'));

				const html = (body: string, opts?: { autoClose?: boolean }) => {
					const msg = escapeHtml(body);
					const autoClose = opts?.autoClose ?? false;
					res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
					res.end(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Vex Launcher Login</title>
  ${
		autoClose
			? `<script>
  setTimeout(() => {
    try { window.close(); } catch (e) {}
    // If window.close() is blocked, at least clear the tab.
    try { window.location.replace('about:blank'); } catch (e) {}
  }, 800);
</script>`
			: ''
	}
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 16px; color: #eae9f2; background: #08060c;">
  <h3 style="margin: 0 0 8px 0; font-size: 16px;">Vex Launcher</h3>
  <pre style="white-space: pre-wrap; font-size: 13px; line-height: 1.35;">${msg}</pre>
  ${
		autoClose
			? `<p style="margin-top: 12px; font-size: 12px; color: #8b92a8;">If the tab doesn’t close automatically, you can close it manually.</p>`
			: ''
	}
</body>
</html>`);
				};

				if (err) {
					html(`Vex Launcher: login failed.\n\n${err}\n${errDesc ?? ''}`);
					reject(new AuthError('MICROSOFT_DENIED', `Microsoft returned: ${err}`));
					server.close();
					return;
				}

				if (!code || !state || state !== expectedState) {
					html('Vex Launcher: invalid redirect. Close this tab and try again.');
					reject(new AuthError('MICROSOFT_TOKEN', 'Invalid OAuth redirect (state or code).'));
					server.close();
					return;
				}

				html('Vex Launcher: login successful. You can close this tab and return to the launcher.', { autoClose: true });
				resolve(code);
				server.close();
			} catch (e) {
				reject(e);
				try {
					server.close();
				} catch {
					/* ignore */
				}
			}
		});

		server.on('error', (e: NodeJS.ErrnoException) => {
			if (e.code === 'EADDRINUSE') {
				reject(
					new AuthError(
						'PORT_IN_USE',
						`Port ${LOOPBACK_PORT} is in use. Close the other app (or another Vex login) and retry. Azure redirect must be ${REDIRECT_URI}.`,
					),
				);
			} else {
				reject(new AuthError('UNKNOWN', e.message ?? 'Auth server error', e));
			}
		});

		server.listen(LOOPBACK_PORT, '127.0.0.1', () => {
			void Promise.resolve(onListening()).catch((e) => {
				reject(e);
				try {
					server.close();
				} catch {
					/* ignore */
				}
			});
		});

		const t = setTimeout(() => {
			try {
				server.close();
			} catch {
				/* ignore */
			}
			reject(new AuthError('LOGIN_TIMEOUT', 'Microsoft login timed out after 3 minutes.'));
		}, 180_000);
		server.on('close', () => clearTimeout(t));
	});
}

async function postForm(url: string, body: URLSearchParams): Promise<Record<string, unknown>> {
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: body.toString(),
	});
	const text = await res.text();
	if (!res.ok) {
		throw new AuthError('MICROSOFT_TOKEN', `Token request failed (${res.status}).`);
	}
	return JSON.parse(text) as Record<string, unknown>;
}

async function postJson(url: string, payload: unknown, bearer?: string): Promise<Record<string, unknown>> {
	const headers: Record<string, string> = {
		Accept: 'application/json',
		'Content-Type': 'application/json',
	};
	if (bearer) headers.Authorization = `Bearer ${bearer}`;
	const res = await fetch(url, {
		method: 'POST',
		headers,
		body: JSON.stringify(payload),
	});
	const text = await res.text();
	if (!res.ok) {
		throw new AuthError('XBOX_AUTH', `Request failed (${res.status}): ${text.slice(0, 200)}`);
	}
	return JSON.parse(text) as Record<string, unknown>;
}

function str(obj: Record<string, unknown>, key: string): string | null {
	const v = obj[key];
	return typeof v === 'string' ? v : null;
}

function uuidFromUndashed(id: string): string {
	const s = id.replace(/-/g, '');
	if (s.length !== 32) return id;
	return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

async function exchangeCode(clientId: string, code: string, verifier: string): Promise<{ access: string; refresh: string }> {
	const body = new URLSearchParams({
		client_id: clientId,
		grant_type: 'authorization_code',
		code,
		redirect_uri: REDIRECT_URI,
		code_verifier: verifier,
	});
	const json = await postForm(MS_TOKEN, body);
	const access = str(json, 'access_token');
	const refresh = str(json, 'refresh_token');
	if (!access || !refresh) {
		throw new AuthError('MICROSOFT_TOKEN', 'Microsoft token response missing fields.');
	}
	return { access, refresh };
}

export async function refreshMicrosoftTokens(clientId: string, refreshToken: string): Promise<{ access: string; refresh: string }> {
	const body = new URLSearchParams({
		client_id: clientId,
		grant_type: 'refresh_token',
		refresh_token: refreshToken,
		scope: 'XboxLive.signin offline_access',
	});
	const json = await postForm(MS_TOKEN, body);
	const access = str(json, 'access_token');
	const newRefresh = str(json, 'refresh_token');
	if (!access) {
		throw new AuthError('TOKEN_EXPIRED', 'Could not refresh Microsoft session. Please sign in again.');
	}
	return { access, refresh: newRefresh ?? refreshToken };
}

async function xboxExchange(msAccess: string): Promise<{ uhs: string; xuid: string; xsts: string }> {
	const xblReq = {
		RelyingParty: 'http://auth.xboxlive.com',
		TokenType: 'JWT',
		Properties: {
			AuthMethod: 'RPS',
			SiteName: 'user.auth.xboxlive.com',
			RpsTicket: `d=${msAccess}`,
		},
	};
	const xbl = await postJson(XBL_AUTH, xblReq);
	const xblToken = str(xbl, 'Token');
	const dc = xbl['DisplayClaims'] as { xui?: Array<{ uhs?: string; xid?: string }> } | undefined;
	const uhs = dc?.xui?.[0]?.uhs;
	const xid = dc?.xui?.[0]?.xid;
	// Mojang uses `auth_xuid` as the Xbox user id; in most responses this is `xid`.
	// If it is missing for some reason, fall back to UHS so the launcher can still try.
	const xuid = xid ?? uhs ?? '';
	if (!xblToken || !uhs || !xuid) {
		throw new AuthError('XBOX_AUTH', 'Xbox Live token response incomplete.');
	}

	const xstsReq = {
		RelyingParty: 'rp://api.minecraftservices.com/',
		TokenType: 'JWT',
		Properties: {
			SandboxId: 'RETAIL',
			UserTokens: [xblToken],
		},
	};
	const xsts = await postJson(XSTS_AUTH, xstsReq);
	const xstsToken = str(xsts, 'Token');
	if (!xstsToken) {
		throw new AuthError('XBOX_AUTH', 'XSTS token missing.');
	}
	return { uhs, xuid, xsts: xstsToken };
}

async function minecraftLogin(uhs: string, xsts: string): Promise<string> {
	const res = await postJson(MC_LOGIN_WITH_XBOX, {
		identityToken: `XBL3.0 x=${uhs};${xsts}`,
	});
	const token = str(res, 'access_token');
	if (!token) throw new AuthError('XBOX_AUTH', 'Minecraft Services login failed.');
	return token;
}

async function ensureJavaOwned(mcAccess: string): Promise<void> {
	const res = await fetch(MC_ENTITLEMENTS, {
		headers: { Authorization: `Bearer ${mcAccess}` },
	});
	if (!res.ok) throw new AuthError('NOT_OWNED', 'Could not verify Minecraft ownership.');
	const json = (await res.json()) as { items?: { name?: string }[] };
	const items = json.items ?? [];
	let ok = false;
	for (const it of items) {
		const n = it.name;
		if (!n) continue;
		if (n === 'product_minecraft' || n === 'game_minecraft' || n.includes('game_pass')) {
			ok = true;
			break;
		}
	}
	if (!ok) throw new AuthError('NOT_OWNED', 'This Microsoft account does not own Minecraft Java.');
}

async function fetchProfile(mcAccess: string): Promise<{ name: string; uuid: string }> {
	const res = await fetch(MC_PROFILE, { headers: { Authorization: `Bearer ${mcAccess}` } });
	if (!res.ok) throw new AuthError('XBOX_AUTH', 'Could not load Minecraft profile.');
	const json = (await res.json()) as { id?: string; name?: string };
	const id = json.id;
	const name = json.name;
	if (!id || !name) throw new AuthError('XBOX_AUTH', 'Minecraft profile response incomplete.');
	return { name, uuid: uuidFromUndashed(id) };
}

export async function signInInteractive(): Promise<LauncherAuthState> {
	const clientId = msClientId();
	if (!clientId) {
		throw new AuthError('MISSING_CLIENT_ID', 'Set VEX_MS_CLIENT_ID to your Azure app (public client) with redirect ' + REDIRECT_URI);
	}

	const pkce = createPkce();
	const url = buildAuthorizeUrl(clientId, pkce);
	const code = await waitForAuthCode(pkce.state, () => shell.openExternal(url));

	const ms = await exchangeCode(clientId, code, pkce.verifier);
	const xbox = await xboxExchange(ms.access);
	const mcToken = await minecraftLogin(xbox.uhs, xbox.xsts);
	await ensureJavaOwned(mcToken);
	const profile = await fetchProfile(mcToken);

	const now = Math.floor(Date.now() / 1000);
	const mcExpiresAtEpochSec = now + 24 * 60 * 60;

	return {
		username: profile.name,
		uuid: profile.uuid,
		xuid: xbox.xuid,
		mcAccessToken: mcToken,
		mcExpiresAtEpochSec,
		msRefreshToken: ms.refresh,
	};
}

export async function refreshMinecraftSession(prev: LauncherAuthState): Promise<LauncherAuthState> {
	const clientId = msClientId();
	if (!clientId) throw new AuthError('MISSING_CLIENT_ID', 'Missing VEX_MS_CLIENT_ID.');
	const ms = await refreshMicrosoftTokens(clientId, prev.msRefreshToken);
	const xbox = await xboxExchange(ms.access);
	const mcToken = await minecraftLogin(xbox.uhs, xbox.xsts);
	await ensureJavaOwned(mcToken);
	const profile = await fetchProfile(mcToken);
	const now = Math.floor(Date.now() / 1000);
	return {
		username: profile.name,
		uuid: profile.uuid,
		xuid: xbox.xuid,
		mcAccessToken: mcToken,
		mcExpiresAtEpochSec: now + 24 * 60 * 60,
		msRefreshToken: ms.refresh,
	};
}
