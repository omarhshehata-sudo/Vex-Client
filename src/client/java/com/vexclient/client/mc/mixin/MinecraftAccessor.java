package com.vexclient.client.mc.mixin;

import net.minecraft.client.Minecraft;
import net.minecraft.client.User;

import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Mutable;
import org.spongepowered.asm.mixin.gen.Accessor;

/**
 * Accessor used to apply a newly authenticated {@link User} after Microsoft sign-in.
 *
 * <p>TODO(multiversion): field name/type changes between MC versions — verify {@code user} mutability when adding mc-1.21.1 etc.
 */
@Mixin(Minecraft.class)
public interface MinecraftAccessor {
	@Accessor("user")
	User getUser();

	@Mutable
	@Accessor("user")
	void setUser(User user);
}
