package com.vexclient.client.core.auth.model;

import java.time.Instant;

/**
 * Persisted token cache.
 *
 * <p>We store the Microsoft refresh token and a cached Minecraft access token.
 * The refresh token can mint a new Microsoft access token without ever handling a password.
 */
public final class StoredAuthState {
	public int schemaVersion = 1;

	public String msRefreshToken;

	public String mcAccessToken;
	public long mcExpiresAtEpochSeconds;

	public String username;
	public String uuid;

	public Instant mcExpiresAt() {
		return Instant.ofEpochSecond(mcExpiresAtEpochSeconds);
	}
}

