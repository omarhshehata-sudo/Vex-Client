package com.vexclient.client.core.auth.model;

import java.time.Instant;
import java.util.UUID;

/**
 * The authenticated Minecraft Java account (profile + access token).
 *
 * <p>The access token is the Minecraft Services JWT returned by
 * {@code POST https://api.minecraftservices.com/authentication/login_with_xbox}.
 *
 * <p>TODO(multiversion): keep this in a shared module (`common/`) and only keep
 * session application in the per-version layer (`mc-1.21.4`).
 */
public record MinecraftAccount(
		String username,
		UUID uuid,
		String minecraftAccessToken,
		Instant expiresAt
) {
	public boolean isExpired() {
		return Instant.now().isAfter(expiresAt.minusSeconds(30));
	}
}

