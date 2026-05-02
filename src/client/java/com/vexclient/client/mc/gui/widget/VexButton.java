package com.vexclient.client.mc.gui.widget;

import com.vexclient.client.core.VexRenderUtils;
import com.vexclient.client.core.VexTheme;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.sounds.SoundManager;
import net.minecraft.network.chat.Component;

/**
 * A professionally styled button widget for the Vex Client.
 * Features rounded corners, gradient backgrounds, hover animations, and glow effects.
 */
public class VexButton extends Button {

	public enum Style {
		PRIMARY,    // Prominent purple button for main actions
		SECONDARY,  // Subtle gray button for secondary actions
		DANGER,     // Red button for destructive actions
		SUCCESS     // Green button for confirmations
	}

	private final Style style;
	private float hoverAnimation = 0f;
	private long lastRenderTime = 0;

	public VexButton(int x, int y, int width, int height, Component message, OnPress onPress, Style style) {
		super(x, y, width, height, message, onPress, DEFAULT_NARRATION);
		this.style = style;
	}

	public VexButton(int x, int y, int width, int height, Component message, OnPress onPress) {
		this(x, y, width, height, message, onPress, Style.SECONDARY);
	}

	/**
	 * Builder for creating VexButtons with a fluent API.
	 */
	public static VexButtonBuilder builder(Component message, OnPress onPress) {
		return new VexButtonBuilder(message, onPress);
	}

	@Override
	protected void renderWidget(GuiGraphics context, int mouseX, int mouseY, float delta) {
		Minecraft client = Minecraft.getInstance();
		Font font = client.font;

		// Update hover animation
		updateHoverAnimation();

		boolean hovered = this.isHovered();
		boolean pressed = hovered && client.mouseHandler.isLeftPressed();

		// Get colors based on style and state
		int bgColor = getBackgroundColor(hovered, pressed);
		int borderColor = getBorderColor(hovered);
		int textColor = getTextColor();

		int x = this.getX();
		int y = this.getY();
		int width = this.getWidth();
		int height = this.getHeight();
		int radius = VexTheme.CORNER_RADIUS_MEDIUM;

		// Draw drop shadow
		if (this.active) {
			VexRenderUtils.drawDropShadow(context, x, y, width, height, 4, 2, 2);
		}

		// Draw glow on hover
		if (hovered && this.active && style == Style.PRIMARY) {
			VexRenderUtils.drawGlow(context, x, y, width, height, 6, VexTheme.withAlpha(VexTheme.ACCENT_PURPLE, 80));
		}

		// Draw button background with gradient
		int gradientTop = bgColor;
		int gradientBottom = VexTheme.darken(bgColor, 0.15f);

		if (pressed && this.active) {
			// Invert gradient when pressed
			int temp = gradientTop;
			gradientTop = gradientBottom;
			gradientBottom = temp;
		}

		// Fill with gradient approximation
		VexRenderUtils.fillRoundedRect(context, x, y, width, height / 2, radius, gradientTop);
		VexRenderUtils.fillRoundedRect(context, x, y + height / 2, width, height / 2, radius, gradientBottom);
		// Fill the full shape to clean up the middle seam
		VexRenderUtils.fillRoundedRect(context, x, y, width, height, radius, VexTheme.withAlpha(bgColor, 200));

		// Draw border
		VexRenderUtils.drawRoundedRectOutline(context, x, y, width, height, radius, 1, borderColor);

		// Draw text
		String text = this.getMessage().getString();
		int textWidth = font.width(text);
		int textX = x + (width - textWidth) / 2;
		int textY = y + (height - 8) / 2;

		// Add slight vertical offset when pressed
		if (pressed && this.active) {
			textY += 1;
		}

		// Draw text shadow for depth
		if (this.active) {
			context.drawString(font, text, textX + 1, textY + 1, VexTheme.withAlpha(0xFF000000, 80), false);
		}
		context.drawString(font, text, textX, textY, this.active ? textColor : VexTheme.TEXT_MUTED, false);
	}

	private void updateHoverAnimation() {
		long currentTime = System.currentTimeMillis();
		if (lastRenderTime == 0) {
			lastRenderTime = currentTime;
		}

		float deltaTime = (currentTime - lastRenderTime) / 1000f;
		lastRenderTime = currentTime;

		float targetHover = isHovered() && this.active ? 1f : 0f;
		float animSpeed = 8f;

		if (hoverAnimation < targetHover) {
			hoverAnimation = Math.min(targetHover, hoverAnimation + deltaTime * animSpeed);
		} else if (hoverAnimation > targetHover) {
			hoverAnimation = Math.max(targetHover, hoverAnimation - deltaTime * animSpeed);
		}
	}

	private int getBackgroundColor(boolean hovered, boolean pressed) {
		if (!this.active) {
			return VexTheme.BUTTON_DISABLED;
		}

		return switch (style) {
			case PRIMARY -> pressed ? VexTheme.BUTTON_PRIMARY_PRESSED :
					hovered ? VexTheme.BUTTON_PRIMARY_HOVER : VexTheme.BUTTON_PRIMARY;
			case DANGER -> pressed ? VexTheme.ERROR_RED_DARK :
					hovered ? VexTheme.ERROR_RED : VexTheme.darken(VexTheme.ERROR_RED, 0.3f);
			case SUCCESS -> pressed ? VexTheme.SUCCESS_GREEN_DARK :
					hovered ? VexTheme.SUCCESS_GREEN : VexTheme.darken(VexTheme.SUCCESS_GREEN, 0.3f);
			default -> pressed ? VexTheme.BUTTON_PRESSED :
					hovered ? VexTheme.BUTTON_HOVER : VexTheme.BUTTON_NORMAL;
		};
	}

	private int getBorderColor(boolean hovered) {
		if (!this.active) {
			return VexTheme.withAlpha(VexTheme.TEXT_MUTED, 50);
		}

		return switch (style) {
			case PRIMARY -> hovered ? VexTheme.ACCENT_PURPLE_LIGHT : VexTheme.ACCENT_PURPLE;
			case DANGER -> hovered ? VexTheme.lighten(VexTheme.ERROR_RED, 0.2f) : VexTheme.ERROR_RED;
			case SUCCESS -> hovered ? VexTheme.lighten(VexTheme.SUCCESS_GREEN, 0.2f) : VexTheme.SUCCESS_GREEN;
			default -> hovered ? VexTheme.BORDER_PURPLE_HOVER : VexTheme.withAlpha(VexTheme.BORDER_PURPLE, 100);
		};
	}

	private int getTextColor() {
		return switch (style) {
			case PRIMARY, DANGER, SUCCESS -> VexTheme.TEXT_WHITE;
			default -> VexTheme.TEXT_WHITE;
		};
	}

	/**
	 * Fluent builder for VexButton.
	 */
	public static class VexButtonBuilder {
		private final Component message;
		private final OnPress onPress;
		private int x = 0;
		private int y = 0;
		private int width = 100;
		private int height = 20;
		private Style style = Style.SECONDARY;

		public VexButtonBuilder(Component message, OnPress onPress) {
			this.message = message;
			this.onPress = onPress;
		}

		public VexButtonBuilder position(int x, int y) {
			this.x = x;
			this.y = y;
			return this;
		}

		public VexButtonBuilder size(int width, int height) {
			this.width = width;
			this.height = height;
			return this;
		}

		public VexButtonBuilder width(int width) {
			this.width = width;
			return this;
		}

		public VexButtonBuilder style(Style style) {
			this.style = style;
			return this;
		}

		public VexButton build() {
			return new VexButton(x, y, width, height, message, onPress, style);
		}
	}
}
