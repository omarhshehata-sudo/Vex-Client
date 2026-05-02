package com.vexclient.client.mc.hud;

import com.vexclient.VexClient;
import com.vexclient.client.core.VexRenderUtils;
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
 * Professional HUD overlay renderer with modern styling and visual polish.
 *
 * <p>Registered as a hud layer anchored after subtitles so overlays stay above vanilla HUD clutter.
 */
public final class VexHudRenderer {
	private static final ResourceLocation HUD_LAYER_ID = ResourceLocation.fromNamespaceAndPath(VexClient.MOD_ID, "hud_quality_of_life");

	// Smooth value transitions
	private static float smoothFps = 0;
	private static float smoothCps = 0;
	private static long lastRenderTime = 0;

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

		// Update smooth transitions
		long currentTime = System.currentTimeMillis();
		float deltaTime = lastRenderTime == 0 ? 0 : (currentTime - lastRenderTime) / 1000f;
		lastRenderTime = currentTime;

		float lerpSpeed = 8f;
		smoothFps += (client.getFps() - smoothFps) * Math.min(1f, deltaTime * lerpSpeed);
		smoothCps += (cpsTracker.clicksPerSecond() - smoothCps) * Math.min(1f, deltaTime * lerpSpeed);

		Font tr = client.font;

		java.util.ArrayList<HudLine> lines = new java.util.ArrayList<>();
		if (cfg.hudFpsCounter) {
			int fps = Math.round(smoothFps);
			int fpsColor = getFpsColor(fps);
			lines.add(new HudLine("FPS", Integer.toString(fps), VexTheme.ACCENT_PURPLE, fpsColor));
		}
		if (cfg.hudCpsCounter) {
			int cps = Math.round(smoothCps);
			lines.add(new HudLine("CPS", Integer.toString(cps), VexTheme.INFO_BLUE, VexTheme.TEXT_WHITE));
		}
		if (cfg.hudCoordinates) {
			var bp = client.player.blockPosition();
			lines.add(new HudLine(
					"XYZ",
					bp.getX() + " / " + bp.getY() + " / " + bp.getZ(),
					VexTheme.WARNING_YELLOW,
					VexTheme.TEXT_WHITE
			));
		}

		if (lines.isEmpty()) {
			return;
		}

		int lineHeight = 16;
		int padX = 10;
		int padY = 8;
		int lineGap = 4;

		int maxLabelWidth = 0;
		int maxValueWidth = 0;
		for (HudLine line : lines) {
			maxLabelWidth = Math.max(maxLabelWidth, tr.width(line.label()));
			maxValueWidth = Math.max(maxValueWidth, tr.width(line.value()));
		}

		int margin = 8;
		int boxW = padX * 2 + maxLabelWidth + 8 + maxValueWidth + 8;
		int boxH = padY * 2 + lineHeight * lines.size() + lineGap * (lines.size() - 1);
		int left = margin;
		int scaledHeight = client.getWindow().getGuiScaledHeight();
		int top = scaledHeight - margin - boxH;

		// Draw drop shadow
		VexRenderUtils.drawDropShadow(context, left, top, boxW, boxH, 6, 2, 2);

		// Draw subtle outer glow
		VexRenderUtils.drawGlow(context, left, top, boxW, boxH, 3, VexTheme.withAlpha(VexTheme.BORDER_PURPLE, 30));

		// Draw main panel
		VexRenderUtils.fillRoundedRect(context, left, top, boxW, boxH, VexTheme.CORNER_RADIUS_MEDIUM, VexTheme.PANEL_BACKGROUND);

		// Draw border
		VexRenderUtils.drawRoundedRectOutline(context, left, top, boxW, boxH, VexTheme.CORNER_RADIUS_MEDIUM, 1, VexTheme.BORDER_PURPLE);

		// Draw header accent line
		VexRenderUtils.fillHorizontalGradient(context, left + 2, top, boxW - 4, 2,
			VexTheme.withAlpha(VexTheme.ACCENT_PURPLE, 0),
			VexTheme.withAlpha(VexTheme.ACCENT_PURPLE, 150));

		// Render each line
		int ty = top + padY;
		for (int i = 0; i < lines.size(); i++) {
			renderLine(context, tr, left + padX, ty + i * (lineHeight + lineGap), lines.get(i), maxLabelWidth);
		}
	}

	private static int getFpsColor(int fps) {
		if (fps >= 60) {
			return VexTheme.SUCCESS_GREEN;
		} else if (fps >= 30) {
			return VexTheme.WARNING_YELLOW;
		} else {
			return VexTheme.ERROR_RED;
		}
	}

	private static void renderLine(GuiGraphics ctx, Font tr, int x, int y, HudLine line, int labelWidth) {
		// Draw label badge
		int labelBadgeW = labelWidth + 8;
		int labelBadgeH = 14;
		int labelBadgeY = y + 1;

		VexRenderUtils.fillRoundedRect(ctx, x - 4, labelBadgeY, labelBadgeW, labelBadgeH, 3,
			VexTheme.withAlpha(line.labelColor(), 30));

		// Draw label text
		int labelX = x;
		int textY = y + 3;
		ctx.drawString(tr, line.label(), labelX + 1, textY + 1, VexTheme.withAlpha(VexTheme.SHADOW_BLACK, 100), false);
		ctx.drawString(tr, line.label(), labelX, textY, line.labelColor(), false);

		// Draw separator dot
		int dotX = x + labelWidth + 6;
		int dotY = y + 6;
		VexRenderUtils.fillRoundedRect(ctx, dotX, dotY, 3, 3, 2, VexTheme.TEXT_MUTED);

		// Draw value
		int valueX = dotX + 8;
		ctx.drawString(tr, line.value(), valueX + 1, textY + 1, VexTheme.withAlpha(VexTheme.SHADOW_BLACK, 100), false);
		ctx.drawString(tr, line.value(), valueX, textY, line.valueColor(), false);
	}

	private record HudLine(String label, String value, int labelColor, int valueColor) {
	}
}
