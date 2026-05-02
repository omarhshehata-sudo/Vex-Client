package com.vexclient.client.mc.input;

import org.lwjgl.glfw.GLFW;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.screens.ChatScreen;

import java.util.ArrayDeque;

/**
 * Tracks physical left-clicks over a rolling 1-second window to estimate CPS.
 *
 * <p>Intentionally scoped to in-world gameplay (no world / pause / hidden HUD) so menu clicking does not spike CPS.
 */
public final class CpsTracker {
	private final ArrayDeque<Long> recentClicksMs = new ArrayDeque<>();
	private boolean leftDown;

	public void tick(Minecraft client) {
		if (client.level == null || client.isPaused()) {
			return;
		}
		if (client.options.hideGui) {
			return;
		}
		if (client.screen != null && !(client.screen instanceof ChatScreen)) {
			return;
		}

		long window = client.getWindow().getWindow();
		boolean down = GLFW.glfwGetMouseButton(window, GLFW.GLFW_MOUSE_BUTTON_LEFT) == GLFW.GLFW_PRESS;

		if (down && !leftDown) {
			long now = System.currentTimeMillis();
			recentClicksMs.addLast(now);

			long cutoff = now - 1_000L;
			while (!recentClicksMs.isEmpty() && recentClicksMs.peekFirst() < cutoff) {
				recentClicksMs.removeFirst();
			}
		}

		leftDown = down;
	}

	public int clicksPerSecond() {
		long now = System.currentTimeMillis();
		long cutoff = now - 1_000L;
		while (!recentClicksMs.isEmpty() && recentClicksMs.peekFirst() < cutoff) {
			recentClicksMs.removeFirst();
		}
		return recentClicksMs.size();
	}
}
