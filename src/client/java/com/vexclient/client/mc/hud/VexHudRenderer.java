package com.vexclient.client.mc.hud;

import com.vexclient.VexClient;
import com.vexclient.client.core.VexTheme;
import com.vexclient.client.mc.input.CpsTracker;
import com.vexclient.config.ConfigManager;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.resources.ResourceLocation;

import net.fabricmc.fabric.api.client.rendering.v1.HudLayerRegistrationCallback;
import net.fabricmc.fabric.api.client.rendering.v1.IdentifiedLayer;

/**
 * Lightweight overlay renderer for QoL HUD lines (FPS/CPS/coordinates).
 *
 * <p>Registered as a hud layer anchored after subtitles so overlays stay above vanilla HUD clutter.
 *
 * TODO: Split each HUD line into its own tiny class once overlays grow (graphs / draggable HUD stacks ...).
 * TODO: If you introduce many overlays, consolidate behind a registry that maps {@link com.vexclient.module.HudOverlayId} -> renderer.
 */
public final class VexHudRenderer {
	private static final ResourceLocation HUD_LAYER_ID = ResourceLocation.fromNamespaceAndPath(VexClient.MOD_ID, "hud_quality_of_life");

	private VexHudRenderer() {
	}

	public static void registerHudLayer(CpsTracker cpsTracker) {
		HudLayerRegistrationCallback.EVENT.register(drawerWrapper -> drawerWrapper.attachLayerAfter(
				IdentifiedLayer.SUBTITLES,
				HUD_LAYER_ID,
				(context, tickCounter) -> render(context, cpsTracker)
		));
	}

	private static void render(GuiGraphics context, CpsTracker cpsTracker) {
		Minecraft client = Minecraft.getInstance();
		if (client.player == null || client.options.hideGui) {
			return;
		}

		var cfg = ConfigManager.INSTANCE.get();
		if (!cfg.hudFpsCounter && !cfg.hudCpsCounter && !cfg.hudCoordinates) {
			return;
		}

		Font tr = client.font;

		java.util.ArrayList<HudLine> lines = new java.util.ArrayList<>();
		if (cfg.hudFpsCounter) {
			lines.add(new HudLine("FPS", Integer.toString(client.getFps())));
		}
		if (cfg.hudCpsCounter) {
			lines.add(new HudLine("CPS", Integer.toString(cpsTracker.clicksPerSecond())));
		}
		if (cfg.hudCoordinates) {
			var bp = client.player.blockPosition();
			lines.add(new HudLine(
					"XYZ",
					bp.getX() + " / " + bp.getY() + " / " + bp.getZ()
			));
		}

		if (lines.isEmpty()) {
			return;
		}

		int lineHeight = Math.max(tr.lineHeight + 1, 10);
		int padX = 6;
		int padY = 4;

		int maxWidth = 0;
		for (HudLine line : lines) {
			int w = tr.width(line.label());
			if (!line.value().isEmpty()) {
				w += tr.width(" " + line.value());
			}
			maxWidth = Math.max(maxWidth, w);
		}

		int margin = 6;
		int boxW = maxWidth + padX * 2;
		int boxH = padY * 2 + lineHeight * lines.size();
		int left = margin;
		int scaledHeight = client.getWindow().getGuiScaledHeight();

		int top = scaledHeight - margin - boxH;

		fillOutline(context, left, top, boxW, boxH, VexTheme.PANEL_BACKGROUND, VexTheme.BORDER_PURPLE);

		int ty = top + padY + 1;
		for (int i = 0; i < lines.size(); i++) {
			renderLine(context, tr, left + padX, ty + i * lineHeight, lines.get(i));
		}
	}

	private static void renderLine(GuiGraphics ctx, Font tr, int x, int y, HudLine line) {
		int cursor = x;

		ctx.drawString(tr, line.label(), cursor + 1, y + 1, VexTheme.SHADOW_DEEP_PURPLE, false);
		ctx.drawString(tr, line.label(), cursor, y, VexTheme.ACCENT_PURPLE, false);
		cursor += tr.width(line.label());

		if (!line.value().isEmpty()) {
			String gapPlusValue = " " + line.value();
			ctx.drawString(tr, gapPlusValue, cursor + 1, y + 1, VexTheme.SHADOW_DEEP_PURPLE, false);
			ctx.drawString(tr, gapPlusValue, cursor, y, VexTheme.TEXT_WHITE, false);
		}
	}

	private record HudLine(String label, String value) {
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
