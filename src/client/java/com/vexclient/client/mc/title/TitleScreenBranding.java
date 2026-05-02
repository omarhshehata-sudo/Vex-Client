package com.vexclient.client.mc.title;

import com.vexclient.client.core.VexTheme;
import com.vexclient.client.mc.gui.login.LoginScreen;

import net.fabricmc.fabric.api.client.screen.v1.ScreenEvents;
import net.fabricmc.fabric.api.client.screen.v1.Screens;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.screens.TitleScreen;
import net.minecraft.network.chat.Component;

/**
 * Lightweight title-screen overlay for Vex branding. Purely cosmetic; safe for multiplayer.
 */
public final class TitleScreenBranding {
	private TitleScreenBranding() {
	}

	public static void register() {
		ScreenEvents.AFTER_INIT.register((client, screen, scaledWidth, scaledHeight) -> {
			if (!(screen instanceof TitleScreen)) {
				return;
			}

			// Add a small Vex "Account" entry point on the title screen.
			int w = 110;
			int h = 20;
			int x = scaledWidth - w - 8;
			int y = 8;
			Screens.getButtons(screen).add(
					Button.builder(Component.translatable("vexclient.title.account_button"), btn -> client.setScreen(new LoginScreen(screen)))
							.bounds(x, y, w, h)
							.build()
			);

			ScreenEvents.afterRender(screen).register((scr, context, mx, my, tickDelta) -> {
				if (!(scr instanceof TitleScreen ts)) {
					return;
				}
				renderTitleOverlay(Minecraft.getInstance(), ts, context);
			});
		});
	}

	private static void renderTitleOverlay(Minecraft client, TitleScreen screen, GuiGraphics ctx) {
		var font = client.font;

		Component headline = Component.translatable("vexclient.title.overlay.headline");
		Component subtitle = Component.translatable("vexclient.title.overlay.subtitle");

		int headlineW = font.width(headline);
		int subW = font.width(subtitle);
		int lineHeight = Math.max(font.lineHeight, 9);

		int cx = screen.width / 2;
		int headlineY = (int) (screen.height * 0.78f);
		int subtitleY = headlineY + lineHeight + 3;

		int padX = 10;
		int padY = 6;
		int boxW = Math.max(headlineW, subW) + padX * 2;
		int boxH = padY * 2 + lineHeight * 2 + 3;

		int left = cx - boxW / 2;
		int top = headlineY - padY;

		fillOutline(ctx, left, top, boxW, boxH, VexTheme.PANEL_BACKGROUND, VexTheme.BORDER_PURPLE);

		int hx = cx - headlineW / 2;
		drawShadowTwoTone(ctx, font, headline.getString(), hx, headlineY, VexTheme.ACCENT_PURPLE, VexTheme.SHADOW_DEEP_PURPLE);

		int sx = cx - subW / 2;
		drawShadowTwoTone(ctx, font, subtitle.getString(), sx, subtitleY, VexTheme.TEXT_WHITE, VexTheme.SHADOW_DEEP_PURPLE);
	}

	private static void drawShadowTwoTone(GuiGraphics ctx, net.minecraft.client.gui.Font font, String txt, int x, int y, int argbFore, int argbShadow) {
		ctx.drawString(font, txt, x + 1, y + 1, argbShadow, false);
		ctx.drawString(font, txt, x, y, argbFore, false);
	}

	private static void fillOutline(GuiGraphics context, int x, int y, int w, int h, int fill, int border) {
		context.fill(x, y, x + w, y + h, fill);
		int t = 1;
		context.fill(x, y, x + w, y + t, border);
		context.fill(x, y + h - t, x + w, y + h, border);
		context.fill(x, y, x + t, y + h, border);
		context.fill(x + w - t, y, x + w, y + h, border);
	}
}
