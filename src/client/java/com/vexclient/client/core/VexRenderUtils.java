package com.vexclient.client.core;

import net.minecraft.client.gui.DrawContext;

/**
 * Professional rendering utilities for the Vex Client UI.
 * Provides rounded rectangles, gradients, glows, and other visual effects.
 */
public final class VexRenderUtils {

	private VexRenderUtils() {
	}

	// ──────────────────────────────────────────────────────────────
	// Rounded Rectangles
	// ──────────────────────────────────────────────────────────────

	/**
	 * Draws a filled rounded rectangle.
	 *
	 * @param context      The draw context
	 * @param x            Left position
	 * @param y            Top position
	 * @param width        Width of the rectangle
	 * @param height       Height of the rectangle
	 * @param radius       Corner radius
	 * @param color        Fill color (ARGB)
	 */
	public static void fillRoundedRect(DrawContext context, int x, int y, int width, int height, int radius, int color) {
		radius = Math.min(radius, Math.min(width, height) / 2);

		// Main center rectangle (without corners)
		context.fill(x + radius, y, x + width - radius, y + height, color);

		// Left and right strips
		context.fill(x, y + radius, x + radius, y + height - radius, color);
		context.fill(x + width - radius, y + radius, x + width, y + height - radius, color);

		// Draw corners using small filled rectangles (approximation)
		drawCorner(context, x, y, radius, color, Corner.TOP_LEFT);
		drawCorner(context, x + width - radius, y, radius, color, Corner.TOP_RIGHT);
		drawCorner(context, x, y + height - radius, radius, color, Corner.BOTTOM_LEFT);
		drawCorner(context, x + width - radius, y + height - radius, radius, color, Corner.BOTTOM_RIGHT);
	}

	/**
	 * Draws a rounded rectangle outline.
	 *
	 * @param context      The draw context
	 * @param x            Left position
	 * @param y            Top position
	 * @param width        Width of the rectangle
	 * @param height       Height of the rectangle
	 * @param radius       Corner radius
	 * @param borderWidth  Width of the border
	 * @param color        Border color (ARGB)
	 */
	public static void drawRoundedRectOutline(DrawContext context, int x, int y, int width, int height, int radius, int borderWidth, int color) {
		radius = Math.min(radius, Math.min(width, height) / 2);

		// Top edge
		context.fill(x + radius, y, x + width - radius, y + borderWidth, color);
		// Bottom edge
		context.fill(x + radius, y + height - borderWidth, x + width - radius, y + height, color);
		// Left edge
		context.fill(x, y + radius, x + borderWidth, y + height - radius, color);
		// Right edge
		context.fill(x + width - borderWidth, y + radius, x + width, y + height - radius, color);

		// Corner arcs (approximated)
		drawCornerOutline(context, x, y, radius, borderWidth, color, Corner.TOP_LEFT);
		drawCornerOutline(context, x + width - radius, y, radius, borderWidth, color, Corner.TOP_RIGHT);
		drawCornerOutline(context, x, y + height - radius, radius, borderWidth, color, Corner.BOTTOM_LEFT);
		drawCornerOutline(context, x + width - radius, y + height - radius, radius, borderWidth, color, Corner.BOTTOM_RIGHT);
	}

	/**
	 * Draws a filled rounded rectangle with a border.
	 */
	public static void fillRoundedRectWithBorder(DrawContext context, int x, int y, int width, int height, int radius, int fillColor, int borderColor) {
		fillRoundedRect(context, x, y, width, height, radius, fillColor);
		drawRoundedRectOutline(context, x, y, width, height, radius, 1, borderColor);
	}

	// ──────────────────────────────────────────────────────────────
	// Gradient Effects
	// ──────────────────────────────────────────────────────────────

	/**
	 * Draws a vertical gradient rectangle.
	 *
	 * @param context   The draw context
	 * @param x         Left position
	 * @param y         Top position
	 * @param width     Width
	 * @param height    Height
	 * @param colorTop  Color at the top (ARGB)
	 * @param colorBottom Color at the bottom (ARGB)
	 */
	public static void fillVerticalGradient(DrawContext context, int x, int y, int width, int height, int colorTop, int colorBottom) {
		int steps = Math.min(height, 32);
		int stepHeight = height / steps;

		for (int i = 0; i < steps; i++) {
			float t = (float) i / (steps - 1);
			int color = VexTheme.lerpColor(colorTop, colorBottom, t);
			int yPos = y + i * stepHeight;
			int h = (i == steps - 1) ? (y + height - yPos) : stepHeight;
			context.fill(x, yPos, x + width, yPos + h, color);
		}
	}

	/**
	 * Draws a horizontal gradient rectangle.
	 */
	public static void fillHorizontalGradient(DrawContext context, int x, int y, int width, int height, int colorLeft, int colorRight) {
		int steps = Math.min(width, 32);
		int stepWidth = width / steps;

		for (int i = 0; i < steps; i++) {
			float t = (float) i / (steps - 1);
			int color = VexTheme.lerpColor(colorLeft, colorRight, t);
			int xPos = x + i * stepWidth;
			int w = (i == steps - 1) ? (x + width - xPos) : stepWidth;
			context.fill(xPos, y, xPos + w, y + height, color);
		}
	}

	// ──────────────────────────────────────────────────────────────
	// Glow & Shadow Effects
	// ──────────────────────────────────────────────────────────────

	/**
	 * Draws a soft glow around a rectangle.
	 *
	 * @param context    The draw context
	 * @param x          Left position
	 * @param y          Top position
	 * @param width      Width
	 * @param height     Height
	 * @param glowSize   Size of the glow effect
	 * @param glowColor  Base glow color (alpha will be modulated)
	 */
	public static void drawGlow(DrawContext context, int x, int y, int width, int height, int glowSize, int glowColor) {
		int baseAlpha = VexTheme.getAlpha(glowColor);

		for (int i = glowSize; i > 0; i--) {
			float t = (float) i / glowSize;
			int alpha = (int) (baseAlpha * t * t * 0.5f);
			int color = VexTheme.withAlpha(glowColor, alpha);

			// Draw glow layer
			context.fill(x - i, y - i, x + width + i, y - i + 1, color); // Top
			context.fill(x - i, y + height + i - 1, x + width + i, y + height + i, color); // Bottom
			context.fill(x - i, y - i, x - i + 1, y + height + i, color); // Left
			context.fill(x + width + i - 1, y - i, x + width + i, y + height + i, color); // Right
		}
	}

	/**
	 * Draws a drop shadow under a rectangle.
	 *
	 * @param context     The draw context
	 * @param x           Left position
	 * @param y           Top position
	 * @param width       Width
	 * @param height      Height
	 * @param shadowSize  Size of the shadow
	 * @param offsetX     Horizontal offset
	 * @param offsetY     Vertical offset
	 */
	public static void drawDropShadow(DrawContext context, int x, int y, int width, int height, int shadowSize, int offsetX, int offsetY) {
		int shadowX = x + offsetX;
		int shadowY = y + offsetY;

		for (int i = shadowSize; i > 0; i--) {
			float t = (float) i / shadowSize;
			int alpha = (int) (80 * t * t);
			int color = VexTheme.argb(alpha, 0, 0, 0);

			context.fill(shadowX - i + shadowSize, shadowY - i + shadowSize,
					shadowX + width + i, shadowY + height + i, color);
		}
	}

	// ──────────────────────────────────────────────────────────────
	// Special UI Elements
	// ──────────────────────────────────────────────────────────────

	/**
	 * Draws a toggle switch.
	 *
	 * @param context  The draw context
	 * @param x        Left position
	 * @param y        Top position
	 * @param width    Width of the toggle track
	 * @param height   Height of the toggle
	 * @param isOn     Current toggle state
	 * @param hoverProgress Animation progress for hover (0.0 - 1.0)
	 */
	public static void drawToggleSwitch(DrawContext context, int x, int y, int width, int height, boolean isOn, float hoverProgress) {
		int trackRadius = height / 2;
		int knobSize = height - 4;
		int knobRadius = knobSize / 2;

		// Track
		int trackColor = isOn ? VexTheme.TOGGLE_ON_BG : VexTheme.TOGGLE_OFF_BG;
		if (hoverProgress > 0) {
			trackColor = VexTheme.lighten(trackColor, hoverProgress * 0.1f);
		}
		fillRoundedRect(context, x, y, width, height, trackRadius, trackColor);

		// Knob position
		int knobX = isOn ? (x + width - knobSize - 2) : (x + 2);
		int knobY = y + 2;
		int knobColor = isOn ? VexTheme.TOGGLE_ON_KNOB : VexTheme.TOGGLE_OFF_KNOB;

		// Knob shadow
		if (isOn) {
			drawGlow(context, knobX, knobY, knobSize, knobSize, 3, VexTheme.withAlpha(VexTheme.TOGGLE_ON_BG, 100));
		}

		// Knob
		fillRoundedRect(context, knobX, knobY, knobSize, knobSize, knobRadius, knobColor);
	}

	/**
	 * Draws a progress bar.
	 *
	 * @param context    The draw context
	 * @param x          Left position
	 * @param y          Top position
	 * @param width      Width
	 * @param height     Height
	 * @param progress   Progress value (0.0 - 1.0)
	 * @param bgColor    Background color
	 * @param fillColor  Fill color
	 */
	public static void drawProgressBar(DrawContext context, int x, int y, int width, int height, float progress, int bgColor, int fillColor) {
		int radius = height / 2;

		// Background
		fillRoundedRect(context, x, y, width, height, radius, bgColor);

		// Progress fill
		int fillWidth = (int) (width * Math.max(0, Math.min(1, progress)));
		if (fillWidth > radius * 2) {
			fillRoundedRect(context, x, y, fillWidth, height, radius, fillColor);
		}
	}

	/**
	 * Draws a separator line.
	 */
	public static void drawSeparator(DrawContext context, int x, int y, int width, int color) {
		fillHorizontalGradient(context, x, y, width / 2, 1, VexTheme.withAlpha(color, 0), color);
		fillHorizontalGradient(context, x + width / 2, y, width / 2, 1, color, VexTheme.withAlpha(color, 0));
	}

	/**
	 * Draws a badge/pill shape.
	 */
	public static void drawBadge(DrawContext context, int x, int y, int width, int height, int bgColor, int textColor, String text, net.minecraft.client.font.TextRenderer textRenderer) {
		int radius = height / 2;
		fillRoundedRect(context, x, y, width, height, radius, bgColor);

		int textX = x + (width - textRenderer.getWidth(text)) / 2;
		int textY = y + (height - 8) / 2;
		context.drawText(textRenderer, text, textX, textY, textColor, false);
	}

	// ──────────────────────────────────────────────────────────────
	// Corner Helpers
	// ──────────────────────────────────────────────────────────────

	private enum Corner {
		TOP_LEFT, TOP_RIGHT, BOTTOM_LEFT, BOTTOM_RIGHT
	}

	private static void drawCorner(DrawContext context, int x, int y, int radius, int color, Corner corner) {
		for (int i = 0; i < radius; i++) {
			for (int j = 0; j < radius; j++) {
				float dx = 0, dy = 0;

				switch (corner) {
					case TOP_LEFT -> { dx = radius - i - 0.5f; dy = radius - j - 0.5f; }
					case TOP_RIGHT -> { dx = i + 0.5f; dy = radius - j - 0.5f; }
					case BOTTOM_LEFT -> { dx = radius - i - 0.5f; dy = j + 0.5f; }
					case BOTTOM_RIGHT -> { dx = i + 0.5f; dy = j + 0.5f; }
				}

				if (dx * dx + dy * dy <= radius * radius) {
					context.fill(x + i, y + j, x + i + 1, y + j + 1, color);
				}
			}
		}
	}

	private static void drawCornerOutline(DrawContext context, int x, int y, int radius, int borderWidth, int color, Corner corner) {
		for (int i = 0; i < radius; i++) {
			for (int j = 0; j < radius; j++) {
				float dx = 0, dy = 0;

				switch (corner) {
					case TOP_LEFT -> { dx = radius - i - 0.5f; dy = radius - j - 0.5f; }
					case TOP_RIGHT -> { dx = i + 0.5f; dy = radius - j - 0.5f; }
					case BOTTOM_LEFT -> { dx = radius - i - 0.5f; dy = j + 0.5f; }
					case BOTTOM_RIGHT -> { dx = i + 0.5f; dy = j + 0.5f; }
				}

				float dist = (float) Math.sqrt(dx * dx + dy * dy);
				if (dist <= radius && dist >= radius - borderWidth) {
					context.fill(x + i, y + j, x + i + 1, y + j + 1, color);
				}
			}
		}
	}
}
