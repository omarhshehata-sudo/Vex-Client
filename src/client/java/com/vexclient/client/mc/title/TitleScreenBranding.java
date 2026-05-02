package com.vexclient.client.mc.title;

import com.vexclient.client.core.VexRenderUtils;
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
 * Professional title-screen overlay for Vex branding with modern visual effects.
 * Purely cosmetic; safe for multiplayer.
 */
public final class TitleScreenBranding {
	private static long startTime = 0;

	private TitleScreenBranding() {
	}

	public static void register() {
		ScreenEvents.AFTER_INIT.register((client, screen, scaledWidth, scaledHeight) -> {
			if (!(screen instanceof TitleScreen)) {
				return;
			}

			// Reset animation timer when title screen opens
			startTime = System.currentTimeMillis();

			// Add a styled Vex "Account" button on the title screen.
			int w = 100;
			int h = 22;
			int x = scaledWidth - w - 12;
			int y = 12;

			// Custom styled button
			Button accountButton = new Button.Builder(
				Component.translatable("vexclient.title.account_button"),
				btn -> client.setScreen(new LoginScreen(screen))
			).bounds(x, y, w, h).build();

			Screens.getButtons(screen).add(accountButton);

			ScreenEvents.afterRender(screen).register((scr, context, mx, my, tickDelta) -> {
				if (!(scr instanceof TitleScreen ts)) {
					return;
				}
				renderTitleOverlay(Minecraft.getInstance(), ts, context, mx, my);
			});
		});
	}

	private static void renderTitleOverlay(Minecraft client, TitleScreen screen, GuiGraphics ctx, int mouseX, int mouseY) {
		var font = client.font;
		long elapsed = System.currentTimeMillis() - startTime;

		Component headline = Component.translatable("vexclient.title.overlay.headline");
		Component subtitle = Component.translatable("vexclient.title.overlay.subtitle");

		int headlineW = font.width(headline);
		int subW = font.width(subtitle);
		int lineHeight = Math.max(font.lineHeight, 9);

		int cx = screen.width / 2;
		int headlineY = (int) (screen.height * 0.78f);
		int subtitleY = headlineY + lineHeight + 6;

		int padX = 16;
		int padY = 10;
		int boxW = Math.max(headlineW, subW) + padX * 2;
		int boxH = padY * 2 + lineHeight * 2 + 6;

		int left = cx - boxW / 2;
		int top = headlineY - padY;

		// Calculate fade-in animation (first 500ms)
		float fadeIn = Math.min(1f, elapsed / 500f);
		int baseAlpha = (int)(fadeIn * 224);

		// Breathing glow effect
		float breathe = (float)(Math.sin(elapsed / 1500.0 * Math.PI * 2) * 0.5 + 0.5);
		int glowAlpha = (int)(40 + breathe * 30);

		// Draw drop shadow
		VexRenderUtils.drawDropShadow(ctx, left, top, boxW, boxH, 8, 2, 3);

		// Draw outer glow
		int glowColor = VexTheme.withAlpha(VexTheme.ACCENT_PURPLE, glowAlpha);
		VexRenderUtils.drawGlow(ctx, left, top, boxW, boxH, 6, glowColor);

		// Draw main panel with rounded corners
		int panelColor = VexTheme.withAlpha(VexTheme.PANEL_BACKGROUND, baseAlpha);
		VexRenderUtils.fillRoundedRect(ctx, left, top, boxW, boxH, VexTheme.CORNER_RADIUS_MEDIUM, panelColor);

		// Draw gradient header accent
		int headerHeight = 3;
		VexRenderUtils.fillHorizontalGradient(ctx, left, top, boxW / 2, headerHeight, 
			VexTheme.withAlpha(VexTheme.ACCENT_PURPLE_DARK, 0), 
			VexTheme.withAlpha(VexTheme.ACCENT_PURPLE, (int)(baseAlpha * 0.8f)));
		VexRenderUtils.fillHorizontalGradient(ctx, left + boxW / 2, top, boxW / 2, headerHeight, 
			VexTheme.withAlpha(VexTheme.ACCENT_PURPLE, (int)(baseAlpha * 0.8f)),
			VexTheme.withAlpha(VexTheme.ACCENT_PURPLE_DARK, 0));

		// Draw border
		int borderColor = VexTheme.withAlpha(VexTheme.BORDER_PURPLE, (int)(baseAlpha * 0.9f));
		VexRenderUtils.drawRoundedRectOutline(ctx, left, top, boxW, boxH, VexTheme.CORNER_RADIUS_MEDIUM, 1, borderColor);

		// Draw headline with pulsing effect
		int hx = cx - headlineW / 2;
		int headlineColor = VexTheme.pulseColor(VexTheme.ACCENT_PURPLE, VexTheme.ACCENT_PURPLE_LIGHT, elapsed, 2000);
		headlineColor = VexTheme.withAlpha(headlineColor, (int)(fadeIn * 255));

		// Headline shadow
		ctx.drawString(font, headline.getString(), hx + 1, headlineY + 1, 
			VexTheme.withAlpha(VexTheme.SHADOW_DEEP_PURPLE, (int)(fadeIn * 200)), false);
		ctx.drawString(font, headline.getString(), hx, headlineY, headlineColor, false);

		// Draw subtitle
		int sx = cx - subW / 2;
		int subtitleColor = VexTheme.withAlpha(VexTheme.TEXT_WHITE, (int)(fadeIn * 220));

		ctx.drawString(font, subtitle.getString(), sx + 1, subtitleY + 1, 
			VexTheme.withAlpha(VexTheme.SHADOW_DEEP_PURPLE, (int)(fadeIn * 150)), false);
		ctx.drawString(font, subtitle.getString(), sx, subtitleY, subtitleColor, false);

		// Draw version badge
		String version = "v0.1.0-alpha";
		int versionW = font.width(version);
		int badgeX = left + boxW - versionW - 12;
		int badgeY = top + boxH - 14;

		VexRenderUtils.fillRoundedRect(ctx, badgeX - 4, badgeY - 2, versionW + 8, 12, 4, 
			VexTheme.withAlpha(VexTheme.PANEL_BACKGROUND_LIGHT, (int)(baseAlpha * 0.7f)));
		ctx.drawString(font, version, badgeX, badgeY, 
			VexTheme.withAlpha(VexTheme.TEXT_MUTED, (int)(fadeIn * 180)), false);
	}
}
