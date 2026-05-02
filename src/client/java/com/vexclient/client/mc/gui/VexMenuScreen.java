package com.vexclient.client.mc.gui;

import com.vexclient.client.core.VexRenderUtils;
import com.vexclient.client.core.VexTheme;
import com.vexclient.client.mc.gui.widget.VexButton;
import com.vexclient.config.ConfigManager;
import com.vexclient.config.VexClientConfigData;

import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.resources.language.I18n;
import net.minecraft.network.chat.Component;
import net.minecraft.util.FormattedCharSequence;

/**
 * Professional settings shell with category tabs and modern styling.
 *
 * ESC closes while playing; reopen with Right Shift via {@link com.vexclient.client.VexClientClient}.
 */
public class VexMenuScreen extends Screen {
	private enum Tab {
		HUD,
		PERFORMANCE,
		SETTINGS
	}

	private static final int PANEL_W = 340;
	private static final int PANEL_H = 240;
	private static final int CORNER_RADIUS = VexTheme.CORNER_RADIUS_LARGE;

	private Tab tab = Tab.HUD;

	private VexButton tabHudButton;
	private VexButton tabPerfButton;
	private VexButton tabSettingsButton;

	// Toggle states for smooth animations
	private boolean[] toggleStates = new boolean[3];
	private float[] toggleAnimations = new float[3];

	public VexMenuScreen() {
		super(Component.translatable("vexclient.screen.menu.title"));
	}

	private void applyTabStyle(VexButton button, boolean selected) {
		// Tab styling is handled in render
	}

	@Override
	protected void init() {
		super.init();

		ConfigManager.INSTANCE.ensureLoaded();
		VexClientConfigData cfg = ConfigManager.INSTANCE.get();

		// Initialize toggle states
		toggleStates[0] = cfg.hudFpsCounter;
		toggleStates[1] = cfg.hudCpsCounter;
		toggleStates[2] = cfg.hudCoordinates;

		int px = this.width / 2 - PANEL_W / 2;
		int py = this.height / 2 - PANEL_H / 2;

		int btnH = 24;
		int tabGap = 8;
		int tabW = (PANEL_W - 32 - tabGap * 2) / 3;
		int tabY = py + 50;

		this.tabHudButton = VexButton.builder(
				Component.translatable("vexclient.screen.menu.tabs.hud"),
				btn -> { tab = Tab.HUD; }
		).position(px + 16, tabY).size(tabW, btnH).style(VexButton.Style.SECONDARY).build();

		this.tabPerfButton = VexButton.builder(
				Component.translatable("vexclient.screen.menu.tabs.performance"),
				btn -> { tab = Tab.PERFORMANCE; }
		).position(px + 16 + tabW + tabGap, tabY).size(tabW, btnH).style(VexButton.Style.SECONDARY).build();

		this.tabSettingsButton = VexButton.builder(
				Component.translatable("vexclient.screen.menu.tabs.settings"),
				btn -> { tab = Tab.SETTINGS; }
		).position(px + 16 + (tabW + tabGap) * 2, tabY).size(tabW, btnH).style(VexButton.Style.SECONDARY).build();

		this.addRenderableWidget(this.tabHudButton);
		this.addRenderableWidget(this.tabPerfButton);
		this.addRenderableWidget(this.tabSettingsButton);
	}

	@Override
	public boolean isPauseScreen() {
		return false;
	}

	@Override
	public boolean mouseClicked(double mouseX, double mouseY, int button) {
		if (button == 0) {
			// Check toggle switch clicks
			int px = this.width / 2 - PANEL_W / 2;
			int py = this.height / 2 - PANEL_H / 2;
			int rowStartY = py + 50 + 24 + 20;

			if (Tab.HUD.equals(tab)) {
				for (int i = 0; i < 3; i++) {
					int toggleX = px + PANEL_W - 16 - 44;
					int toggleY = rowStartY + i * 36 + 4;
					
					if (mouseX >= toggleX && mouseX <= toggleX + 44 &&
						mouseY >= toggleY && mouseY <= toggleY + 22) {
						toggleStates[i] = !toggleStates[i];
						
						// Save to config
						ConfigManager.INSTANCE.update(cfg -> {
							switch (i) {
								case 0 -> cfg.hudFpsCounter = toggleStates[0];
								case 1 -> cfg.hudCpsCounter = toggleStates[1];
								case 2 -> cfg.hudCoordinates = toggleStates[2];
							}
						});
						return true;
					}
				}
			}
		}
		return super.mouseClicked(mouseX, mouseY, button);
	}

	@Override
	public void render(GuiGraphics context, int mouseX, int mouseY, float delta) {
		this.renderBackground(context, mouseX, mouseY, delta);

		int px = this.width / 2 - PANEL_W / 2;
		int py = this.height / 2 - PANEL_H / 2;

		// Draw drop shadow
		VexRenderUtils.drawDropShadow(context, px, py, PANEL_W, PANEL_H, 12, 4, 6);

		// Draw main panel with rounded corners
		VexRenderUtils.fillRoundedRect(context, px, py, PANEL_W, PANEL_H, CORNER_RADIUS, VexTheme.PANEL_BACKGROUND);

		// Draw header gradient
		VexRenderUtils.fillRoundedRect(context, px, py, PANEL_W, 44, CORNER_RADIUS, VexTheme.PANEL_HEADER);
		// Fix bottom corners of header (overlap with body)
		context.fill(px, py + 36, px + PANEL_W, py + 44, VexTheme.PANEL_HEADER);

		// Draw border with glow
		VexRenderUtils.drawGlow(context, px, py, PANEL_W, PANEL_H, 3, VexTheme.BORDER_PURPLE_GLOW);
		VexRenderUtils.drawRoundedRectOutline(context, px, py, PANEL_W, PANEL_H, CORNER_RADIUS, 1, VexTheme.BORDER_PURPLE);

		// Draw title with accent styling
		String title = Component.translatable("vexclient.screen.menu.title").getString();
		int titleWidth = this.font.width(title);
		int titleX = this.width / 2 - titleWidth / 2;
		int titleY = py + 16;

		// Title shadow
		context.drawString(this.font, title, titleX + 1, titleY + 1, VexTheme.SHADOW_DEEP_PURPLE, false);
		context.drawString(this.font, title, titleX, titleY, VexTheme.TEXT_WHITE, false);

		// Draw separator under header
		VexRenderUtils.drawSeparator(context, px + 16, py + 44, PANEL_W - 32, VexTheme.BORDER_PURPLE);

		// Render tab indicator
		renderTabIndicator(context, px, py);

		// Render widgets (tabs)
		super.render(context, mouseX, mouseY, delta);

		// Render tab content
		renderTabContent(context, px, py, mouseX, mouseY);

		// Footer hint
		String hint = Component.translatable("vexclient.screen.menu.press_esc_close").getString();
		int hintWidth = this.font.width(hint);
		context.drawString(
				this.font,
				hint,
				this.width / 2 - hintWidth / 2,
				py + PANEL_H - 16,
				VexTheme.TEXT_MUTED,
				false);
	}

	private void renderTabIndicator(GuiGraphics context, int px, int py) {
		int tabY = py + 50;
		int btnH = 24;
		int tabGap = 8;
		int tabW = (PANEL_W - 32 - tabGap * 2) / 3;

		int indicatorX = px + 16;
		if (Tab.PERFORMANCE.equals(tab)) {
			indicatorX += tabW + tabGap;
		} else if (Tab.SETTINGS.equals(tab)) {
			indicatorX += (tabW + tabGap) * 2;
		}

		// Draw glowing indicator line under selected tab
		int indicatorY = tabY + btnH + 2;
		VexRenderUtils.drawGlow(context, indicatorX, indicatorY, tabW, 2, 4, VexTheme.ACCENT_PURPLE);
		VexRenderUtils.fillRoundedRect(context, indicatorX, indicatorY, tabW, 2, 1, VexTheme.ACCENT_PURPLE);
	}

	private void renderTabContent(GuiGraphics context, int px, int py, int mouseX, int mouseY) {
		int inset = 16;
		int textMaxW = PANEL_W - inset * 2;
		int bodyTop = py + 50 + 24 + 20;
		int left = px + inset;

		if (Tab.HUD.equals(tab)) {
			renderHudTab(context, px, py, left, bodyTop, mouseX, mouseY);
		} else if (Tab.PERFORMANCE.equals(tab)) {
			renderPerformanceTab(context, left, bodyTop, textMaxW, py);
		} else if (Tab.SETTINGS.equals(tab)) {
			renderSettingsTab(context, left, bodyTop, textMaxW);
		}
	}

	private void renderHudTab(GuiGraphics context, int px, int py, int left, int bodyTop, int mouseX, int mouseY) {
		String[] labels = {
			I18n.get("vexclient.screen.menu.toggle.fps.label", "FPS Counter"),
			I18n.get("vexclient.screen.menu.toggle.cps.label", "CPS Counter"),
			I18n.get("vexclient.screen.menu.toggle.coords.label", "Coordinates")
		};

		String[] descriptions = {
			I18n.get("vexclient.screen.menu.toggle.fps.desc", "Show frames per second"),
			I18n.get("vexclient.screen.menu.toggle.cps.desc", "Show clicks per second"),
			I18n.get("vexclient.screen.menu.toggle.coords.desc", "Show player coordinates")
		};

		int toggleWidth = 44;
		int toggleHeight = 22;
		int rowHeight = 36;

		for (int i = 0; i < 3; i++) {
			int rowY = bodyTop + i * rowHeight;
			int toggleX = px + PANEL_W - 16 - toggleWidth;
			int toggleY = rowY + 4;

			// Update animation
			float target = toggleStates[i] ? 1f : 0f;
			toggleAnimations[i] += (target - toggleAnimations[i]) * 0.2f;

			// Check hover
			boolean hovered = mouseX >= toggleX && mouseX <= toggleX + toggleWidth &&
							  mouseY >= toggleY && mouseY <= toggleY + toggleHeight;

			// Draw row background on hover
			if (hovered) {
				VexRenderUtils.fillRoundedRect(context, left - 4, rowY - 2, PANEL_W - 32 + 8, rowHeight, 4, 
					VexTheme.withAlpha(VexTheme.PANEL_BACKGROUND_LIGHT, 100));
			}

			// Draw label
			context.drawString(this.font, labels[i], left, rowY + 4, VexTheme.TEXT_WHITE, false);

			// Draw description
			context.drawString(this.font, descriptions[i], left, rowY + 16, VexTheme.TEXT_DIM, false);

			// Draw toggle switch
			VexRenderUtils.drawToggleSwitch(context, toggleX, toggleY, toggleWidth, toggleHeight, 
				toggleStates[i], hovered ? 1f : 0f);
		}
	}

	private void renderPerformanceTab(GuiGraphics context, int left, int bodyTop, int textMaxW, int py) {
		// Section header
		context.drawString(this.font, 
			Component.translatable("vexclient.screen.performance.header", "Performance Tips").getString(), 
			left, bodyTop, VexTheme.ACCENT_PURPLE, false);

		VexRenderUtils.drawSeparator(context, left, bodyTop + 14, textMaxW, VexTheme.withAlpha(VexTheme.ACCENT_PURPLE, 100));

		String paragraph = I18n.get("vexclient.screen.performance.paragraph");
		drawWrappedPlain(context, left, bodyTop + 22, textMaxW, paragraph, VexTheme.TEXT_WHITE);

		// Future features section
		int featuresY = py + PANEL_H - 100;
		context.drawString(this.font,
			Component.translatable("vexclient.screen.performance.placeholder_header").getString(),
			left, featuresY, VexTheme.ACCENT_PURPLE, false);

		VexRenderUtils.drawSeparator(context, left, featuresY + 14, textMaxW, VexTheme.withAlpha(VexTheme.ACCENT_PURPLE, 100));

		String[] todos = new String[] {
			"FPS pacing hints (informational only)",
			"Frame-time overlay for debugging",
			"Distance tips for low-memory systems"
		};

		int yTodo = featuresY + 22;
		for (String line : todos) {
			// Draw bullet point
			VexRenderUtils.fillRoundedRect(context, left, yTodo + 3, 4, 4, 2, VexTheme.TEXT_DIM);
			context.drawString(this.font, line, left + 10, yTodo, VexTheme.TEXT_DIM, false);
			yTodo += 14;
		}
	}

	private void renderSettingsTab(GuiGraphics context, int left, int bodyTop, int textMaxW) {
		// Config path section
		context.drawString(this.font,
			Component.translatable("vexclient.screen.settings.config_path.header").getString(),
			left, bodyTop, VexTheme.ACCENT_PURPLE, false);

		VexRenderUtils.drawSeparator(context, left, bodyTop + 14, textMaxW, VexTheme.withAlpha(VexTheme.ACCENT_PURPLE, 100));

		// Config path in a styled box
		String pathShown = shorten(ConfigManager.INSTANCE.getConfigPath().toAbsolutePath().toString(), 50);
		int pathBoxY = bodyTop + 22;
		VexRenderUtils.fillRoundedRect(context, left, pathBoxY, textMaxW, 20, 4, VexTheme.PANEL_BACKGROUND_LIGHT);
		VexRenderUtils.drawRoundedRectOutline(context, left, pathBoxY, textMaxW, 20, 4, 1, 
			VexTheme.withAlpha(VexTheme.BORDER_PURPLE, 80));
		context.drawString(this.font, pathShown, left + 6, pathBoxY + 6, VexTheme.TEXT_WHITE, false);

		// Hint text
		String hint = I18n.get("vexclient.screen.settings.hint");
		drawWrappedPlain(context, left, bodyTop + 52, textMaxW, hint, VexTheme.TEXT_DIM);
	}

	/**
	 * Manual wrap for alpha: breaks on spaces and hard newlines.
	 */
	private void drawWrappedPlain(GuiGraphics ctx, int left, int top, int maxWidth, String body, int color) {
		String normalized = body.replace("\r\n", "\n");
		int lineHeight = Math.max(this.font.lineHeight + 2, 12);
		int y = top;

		for (String paragraph : normalized.split("\n")) {
			String trimmed = paragraph.strip();
			if (trimmed.isEmpty()) {
				y += lineHeight;
				continue;
			}

			Component literal = Component.literal(trimmed);
			for (FormattedCharSequence line : this.font.split(literal, maxWidth)) {
				ctx.drawString(this.font, asPlainString(line), left, y, color, false);
				y += lineHeight;
			}
		}
	}

	private static String asPlainString(FormattedCharSequence ot) {
		StringBuilder sb = new StringBuilder();
		ot.accept((index, style, codePoint) -> {
			sb.appendCodePoint(codePoint);
			return true;
		});
		return sb.toString();
	}

	private static String shorten(String raw, int maxChars) {
		if (raw.length() <= maxChars) {
			return raw;
		}
		int keep = Math.max(16, maxChars - 6);
		int lhs = keep / 2;
		int rhs = keep - lhs;
		return raw.substring(0, lhs) + " ... " + raw.substring(raw.length() - rhs);
	}
}
