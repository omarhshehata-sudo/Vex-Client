package com.vexclient.client.mc.auth;

import com.vexclient.client.core.auth.model.MinecraftAccount;
import com.vexclient.client.mc.mixin.MinecraftAccessor;

import net.minecraft.client.Minecraft;
import net.minecraft.client.User;

/**
 * Minecraft 1.21.4 specific integration: apply an authenticated token into the in-memory {@link User}.
 */
public final class MinecraftSessionApplier {
	private MinecraftSessionApplier() {
	}

	public static void apply(MinecraftAccount account) {
		try {
			Minecraft client = Minecraft.getInstance();
			User user = new User(
					account.username(),
					account.uuid(),
					account.minecraftAccessToken(),
					java.util.Optional.empty(),
					java.util.Optional.empty(),
					User.Type.MSA
			);

			((MinecraftAccessor) client).setUser(user);
		} catch (Throwable ignored) {
			// Non-fatal: even if swapping fails, we still keep token cache for future launcher integration.
		}
	}
}
