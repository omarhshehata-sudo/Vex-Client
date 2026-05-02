package com.vexclient.client.mc.auth;

import com.vexclient.client.core.auth.MicrosoftAuthCore;
import com.vexclient.client.core.auth.model.MinecraftAccount;

import java.util.Optional;
import java.util.concurrent.CompletableFuture;

/**
 * Minecraft 1.21.4 wrapper around the version-agnostic {@link MicrosoftAuthCore}.
 *
 * <p>All network OAuth/Xbox/Minecraft services logic lives in {@link MicrosoftAuthCore}.
 * This class only:
 * - exposes the same API to UI code, and
 * - applies the token to the running client session after login/refresh.
 *
 * <p>TODO(multiversion): keep this file inside each version module (e.g. {@code mc-1.21.1}) and adapt the
 * {@link MinecraftSessionApplier} as needed per version.
 */
public final class MicrosoftAuthManager {
	public static final MicrosoftAuthManager INSTANCE = new MicrosoftAuthManager();

	private MicrosoftAuthManager() {
	}

	public Optional<MinecraftAccount> getActiveAccount() {
		return MicrosoftAuthCore.INSTANCE.getActiveAccount();
	}

	public CompletableFuture<MinecraftAccount> signInWithMicrosoftInteractive() {
		return MicrosoftAuthCore.INSTANCE.signInWithMicrosoftInteractive()
				.thenApply(acc -> {
					MinecraftSessionApplier.apply(acc);
					return acc;
				});
	}

	public CompletableFuture<MinecraftAccount> refreshIfExpired() {
		return MicrosoftAuthCore.INSTANCE.refreshIfExpired()
				.thenApply(acc -> {
					MinecraftSessionApplier.apply(acc);
					return acc;
				});
	}

	public void signOut() {
		MicrosoftAuthCore.INSTANCE.signOut();
	}
}

