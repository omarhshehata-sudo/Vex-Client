package com.vexclient.client;

import com.vexclient.config.ConfigManager;
import com.vexclient.client.mc.gui.VexMenuScreen;
import com.vexclient.client.mc.hud.VexHudRenderer;
import com.vexclient.client.mc.input.CpsTracker;
import com.vexclient.client.mc.title.TitleScreenBranding;

import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;

import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import com.mojang.blaze3d.platform.InputConstants;

import org.lwjgl.glfw.GLFW;

/**
 * Client entrypoint — HUD hooks, menus, branding, and input sampling belong here (never on dedicated servers).
 *
 * <p>TODO(multiversion): when we add mc-1.21.1/mc-1.20.1, this class will likely become version-specific
 * entrypoint wiring that delegates to shared core systems.
 */
public class VexClientClient implements ClientModInitializer {
	private KeyMapping menuKey;

	private final CpsTracker cpsTracker = new CpsTracker();

	@Override
	public void onInitializeClient() {
		ConfigManager.INSTANCE.ensureLoaded();

		this.menuKey = KeyBindingHelper.registerKeyBinding(new KeyMapping(
				"key.vexclient.open_menu",
				InputConstants.Type.KEYSYM,
				GLFW.GLFW_KEY_RIGHT_SHIFT,
				"key.categories.vex.client"
		));

		ClientTickEvents.END_CLIENT_TICK.register(this::tickClient);

		TitleScreenBranding.register();
		VexHudRenderer.registerHudLayer(this.cpsTracker);
	}

	private void tickClient(Minecraft client) {
		this.cpsTracker.tick(client);

		while (this.menuKey.consumeClick()) {
			if (client.level == null || client.player == null) {
				continue;
			}

			if (client.screen == null) {
				client.setScreen(new VexMenuScreen());
				continue;
			}

			if (client.screen instanceof VexMenuScreen) {
				client.setScreen(null);
			}
		}
	}
}
