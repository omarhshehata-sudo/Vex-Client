package com.vexclient.client.core;

/**
 * Centralized UI colors and utilities for consistent "premium purple" styling.
 *
 * <p>TODO(multiversion): keep this file in a shared `common/` module when we split by MC versions.
 */
public final class VexTheme {
	// ──────────────────────────────────────────────────────────────
	// Panel & Background Colors
	// ──────────────────────────────────────────────────────────────
	public static final int PANEL_BACKGROUND = 0xE0101018;
	public static final int PANEL_BACKGROUND_LIGHT = 0xC81A1A24;
	public static final int PANEL_HEADER = 0xF0151520;

	// ──────────────────────────────────────────────────────────────
	// Purple Palette - Primary Brand Colors
	// ──────────────────────────────────────────────────────────────
	public static final int BORDER_PURPLE = 0xFF9B5CFF;
	public static final int BORDER_PURPLE_GLOW = 0x409B5CFF;
	public static final int BORDER_PURPLE_HOVER = 0xFFB07FFF;

	public static final int ACCENT_PURPLE = 0xFFB983FF;
	public static final int ACCENT_PURPLE_DARK = 0xFF8B4FE0;
	public static final int ACCENT_PURPLE_LIGHT = 0xFFD4AAFF;

	// ──────────────────────────────────────────────────────────────
	// Text Colors
	// ──────────────────────────────────────────────────────────────
	public static final int TEXT_WHITE = 0xFFEAE9F2;
	public static final int TEXT_DIM = 0xFF8892AC;
	public static final int TEXT_MUTED = 0xFF5A6078;

	// ──────────────────────────────────────────────────────────────
	// Status Colors
	// ──────────────────────────────────────────────────────────────
	public static final int SUCCESS_GREEN = 0xFF4ADE80;
	public static final int SUCCESS_GREEN_DARK = 0xFF22C55E;
	public static final int ERROR_RED = 0xFFEF4444;
	public static final int ERROR_RED_DARK = 0xFFDC2626;
	public static final int WARNING_YELLOW = 0xFFFBBF24;
	public static final int INFO_BLUE = 0xFF60A5FA;

	// ──────────────────────────────────────────────────────────────
	// Shadow & Depth
	// ──────────────────────────────────────────────────────────────
	public static final int SHADOW_DEEP_PURPLE = 0xFF29143E;
	public static final int SHADOW_BLACK = 0x80000000;
	public static final int SHADOW_SOFT = 0x40000000;

	// ──────────────────────────────────────────────────────────────
	// Button States
	// ──────────────────────────────────────────────────────────────
	public static final int BUTTON_NORMAL = 0xFF2A2A3E;
	public static final int BUTTON_HOVER = 0xFF3A3A52;
	public static final int BUTTON_PRESSED = 0xFF1E1E2E;
	public static final int BUTTON_DISABLED = 0xFF1A1A26;

	public static final int BUTTON_PRIMARY = 0xFF7C3AED;
	public static final int BUTTON_PRIMARY_HOVER = 0xFF8B5CF6;
	public static final int BUTTON_PRIMARY_PRESSED = 0xFF6D28D9;

	// ──────────────────────────────────────────────────────────────
	// Toggle Switch Colors
	// ──────────────────────────────────────────────────────────────
	public static final int TOGGLE_OFF_BG = 0xFF3A3A4E;
	public static final int TOGGLE_OFF_KNOB = 0xFF6A6A7E;
	public static final int TOGGLE_ON_BG = 0xFF7C3AED;
	public static final int TOGGLE_ON_KNOB = 0xFFFFFFFF;

	// ──────────────────────────────────────────────────────────────
	// Dimensions
	// ──────────────────────────────────────────────────────────────
	public static final int CORNER_RADIUS_SMALL = 4;
	public static final int CORNER_RADIUS_MEDIUM = 6;
	public static final int CORNER_RADIUS_LARGE = 8;

	private VexTheme() {
	}

	// ──────────────────────────────────────────────────────────────
	// Color Utility Methods
	// ──────────────────────────────────────────────────────────────

	/**
	 * Extracts the alpha component from an ARGB color.
	 */
	public static int getAlpha(int color) {
		return (color >> 24) & 0xFF;
	}

	/**
	 * Extracts the red component from an ARGB color.
	 */
	public static int getRed(int color) {
		return (color >> 16) & 0xFF;
	}

	/**
	 * Extracts the green component from an ARGB color.
	 */
	public static int getGreen(int color) {
		return (color >> 8) & 0xFF;
	}

	/**
	 * Extracts the blue component from an ARGB color.
	 */
	public static int getBlue(int color) {
		return color & 0xFF;
	}

	/**
	 * Creates an ARGB color from individual components.
	 */
	public static int argb(int alpha, int red, int green, int blue) {
		return (alpha << 24) | (red << 16) | (green << 8) | blue;
	}

	/**
	 * Modifies the alpha of an existing color.
	 */
	public static int withAlpha(int color, int alpha) {
		return (color & 0x00FFFFFF) | (alpha << 24);
	}

	/**
	 * Linearly interpolates between two colors.
	 *
	 * @param color1 Start color
	 * @param color2 End color
	 * @param t      Interpolation factor (0.0 = color1, 1.0 = color2)
	 * @return The interpolated color
	 */
	public static int lerpColor(int color1, int color2, float t) {
		t = Math.max(0f, Math.min(1f, t));
		int a = (int) (getAlpha(color1) + (getAlpha(color2) - getAlpha(color1)) * t);
		int r = (int) (getRed(color1) + (getRed(color2) - getRed(color1)) * t);
		int g = (int) (getGreen(color1) + (getGreen(color2) - getGreen(color1)) * t);
		int b = (int) (getBlue(color1) + (getBlue(color2) - getBlue(color1)) * t);
		return argb(a, r, g, b);
	}

	/**
	 * Lightens a color by the specified amount.
	 *
	 * @param color  The color to lighten
	 * @param amount Amount to lighten (0.0 - 1.0)
	 * @return The lightened color
	 */
	public static int lighten(int color, float amount) {
		int a = getAlpha(color);
		int r = Math.min(255, (int) (getRed(color) + (255 - getRed(color)) * amount));
		int g = Math.min(255, (int) (getGreen(color) + (255 - getGreen(color)) * amount));
		int b = Math.min(255, (int) (getBlue(color) + (255 - getBlue(color)) * amount));
		return argb(a, r, g, b);
	}

	/**
	 * Darkens a color by the specified amount.
	 *
	 * @param color  The color to darken
	 * @param amount Amount to darken (0.0 - 1.0)
	 * @return The darkened color
	 */
	public static int darken(int color, float amount) {
		int a = getAlpha(color);
		int r = (int) (getRed(color) * (1f - amount));
		int g = (int) (getGreen(color) * (1f - amount));
		int b = (int) (getBlue(color) * (1f - amount));
		return argb(a, r, g, b);
	}

	/**
	 * Creates a pulsing effect based on time.
	 *
	 * @param baseColor   The base color
	 * @param pulseColor  The color to pulse towards
	 * @param timeMs      Current time in milliseconds
	 * @param periodMs    Period of the pulse in milliseconds
	 * @return The pulsing color
	 */
	public static int pulseColor(int baseColor, int pulseColor, long timeMs, long periodMs) {
		float t = (float) (Math.sin(2 * Math.PI * timeMs / periodMs) * 0.5 + 0.5);
		return lerpColor(baseColor, pulseColor, t * 0.3f);
	}
}

