package com.vexclient.client.mc.gui;

import com.vexclient.client.core.VexTheme;
import com.vexclient.config.ConfigManager;
import com.vexclient.config.VexClientConfigData;

import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.resources.language.I18n;
import net.minecraft.network.chat.Component;
import net.minecraft.util.FormattedCharSequence;

/**
 * Thin settings shell with category tabs — grows alongside future QoL modules.
 *
 * ESC closes while playing; reopen with Right Shift via {@link com.vexclient.client.VexClientClient}.
 */
public class VexMenuScreen extends Screen {
	private enum Tab {
		HUD,
		PERFORMANCE,
		SETTINGS
	}

	private static final int PANEL_W = 320;
	private static final int PANEL_H = 220;

	private Tab tab = Tab.HUD;

	private Button tabHudButton;
	private Button tabPerfButton;
	private Button tabSettingsButton;

	private Button fpsToggle;
	private Button cpsToggle;
	private Button coordsToggle;

	public VexMenuScreen() {
		super(Component.translatable("vexclient.screen.menu.title"));
	}

	private void applyTabLabels() {
		tabHudButton.setMessage(Tab.HUD.equals(tab)
				? Component.translatable("vexclient.screen.menu.tabs.hud_selected")
				: Component.translatable("vexclient.screen.menu.tabs.hud"));
		tabPerfButton.setMessage(Tab.PERFORMANCE.equals(tab)
				? Component.translatable("vexclient.screen.menu.tabs.performance_selected")
				: Component.translatable("vexclient.screen.menu.tabs.performance"));
		tabSettingsButton.setMessage(Tab.SETTINGS.equals(tab)
				? Component.translatable("vexclient.screen.menu.tabs.settings_selected")
				: Component.translatable("vexclient.screen.menu.tabs.settings"));
	}

	private void rebuildHudTexts() {
		VexClientConfigData cfg = ConfigManager.INSTANCE.get();
		this.fpsToggle.setMessage(Component.translatable(
				cfg.hudFpsCounter ? "vexclient.screen.menu.toggle.fps.on" : "vexclient.screen.menu.toggle.fps.off"));
		this.cpsToggle.setMessage(Component.translatable(
				cfg.hudCpsCounter ? "vexclient.screen.menu.toggle.cps.on" : "vexclient.screen.menu.toggle.cps.off"));
		this.coordsToggle.setMessage(Component.translatable(
				cfg.hudCoordinates ? "vexclient.screen.menu.toggle.coords.on" : "vexclient.screen.menu.toggle.coords.off"));
	}

	private void refreshVisibility() {
		boolean hudTab = Tab.HUD.equals(tab);
		this.fpsToggle.visible = hudTab;
		this.cpsToggle.visible = hudTab;
		this.coordsToggle.visible = hudTab;
		this.applyTabLabels();
	}

	@Override
	protected void init() {
		super.init();

		ConfigManager.INSTANCE.ensureLoaded();

		int px = this.width / 2 - PANEL_W / 2;
		int py = this.height / 2 - PANEL_H / 2;

		int btnH = 20;
		int tabGap = 6;
		int tabW = (PANEL_W - 16 - tabGap * 2) / 3;
		int tabY = py + 42;

		this.tabHudButton = Button.builder(Component.empty(), btn -> {
			tab = Tab.HUD;
			refreshVisibility();
		}).bounds(px + 12, tabY, tabW, btnH).build();

		this.tabPerfButton = Button.builder(Component.empty(), btn -> {
			tab = Tab.PERFORMANCE;
			refreshVisibility();
		}).bounds(px + 12 + tabW + tabGap, tabY, tabW, btnH).build();

		this.tabSettingsButton = Button.builder(Component.empty(), btn -> {
			tab = Tab.SETTINGS;
			refreshVisibility();
		}).bounds(px + 12 + (tabW + tabGap) * 2, tabY, tabW, btnH).build();

		int rowStartY = tabY + btnH + 18;
		int rowW = PANEL_W - 24;

		this.fpsToggle = Button.builder(Component.empty(), btn -> {
			ConfigManager.INSTANCE.update(cfg -> cfg.hudFpsCounter = !cfg.hudFpsCounter);
			rebuildHudTexts();
		}).bounds(px + 14, rowStartY + 2, rowW, btnH).build();

		this.cpsToggle = Button.builder(Component.empty(), btn -> {
			ConfigManager.INSTANCE.update(cfg -> cfg.hudCpsCounter = !cfg.hudCpsCounter);
			rebuildHudTexts();
		}).bounds(px + 14, rowStartY + 2 + (btnH + 6), rowW, btnH).build();

		this.coordsToggle = Button.builder(Component.empty(), btn -> {
			ConfigManager.INSTANCE.update(cfg -> cfg.hudCoordinates = !cfg.hudCoordinates);
			rebuildHudTexts();
		}).bounds(px + 14, rowStartY + 2 + (btnH + 6) * 2, rowW, btnH).build();

		this.addRenderableWidget(this.tabHudButton);
		this.addRenderableWidget(this.tabPerfButton);
		this.addRenderableWidget(this.tabSettingsButton);
		this.addRenderableWidget(this.fpsToggle);
		this.addRenderableWidget(this.cpsToggle);
		this.addRenderableWidget(this.coordsToggle);

		rebuildHudTexts();
		refreshVisibility();
	}

	@Override
	public boolean isPauseScreen() {
		return false;
	}

	@Override
	public void render(GuiGraphics context, int mouseX, int mouseY, float delta) {
		this.renderBackground(context, mouseX, mouseY, delta);

		int px = this.width / 2 - PANEL_W / 2;
		int py = this.height / 2 - PANEL_H / 2;

		fillOutline(context, px, py, PANEL_W, PANEL_H, VexTheme.PANEL_BACKGROUND, VexTheme.BORDER_PURPLE);

		context.drawCenteredString(
				this.font,
				Component.translatable("vexclient.screen.menu.title"),
				this.width / 2,
				py + 14,
				VexTheme.TEXT_WHITE);

		context.hLine(px + 10, px + PANEL_W - 10, py + 32, VexTheme.BORDER_PURPLE);

		super.render(context, mouseX, mouseY, delta);

		renderTabBodies(context, px, py);

		context.drawCenteredString(
				this.font,
				Component.translatable("vexclient.screen.menu.press_esc_close"),
				this.width / 2,
				py + PANEL_H - 18,
				0xFF9AA0B8);
	}

	private void renderTabBodies(GuiGraphics ctx, int px, int py) {
		int inset = 14;
		int textMaxW = PANEL_W - inset * 2;
		int bodyTop = py + 42 + 20 + 12;
		int left = px + inset;

		if (Tab.PERFORMANCE.equals(tab)) {
			String paragraph = I18n.get("vexclient.screen.performance.paragraph");
			drawWrappedPlain(ctx, left, bodyTop + 6, textMaxW, paragraph, VexTheme.TEXT_WHITE);

			ctx.drawString(
					this.font,
					Component.translatable("vexclient.screen.performance.placeholder_header"),
					left,
					py + PANEL_H - 110,
					VexTheme.ACCENT_PURPLE,
					false);

			String[] todos = new String[] {
					"* TODO(alpha+): optional FPS pacing hints (informational reminders only — no cheats).",
					"* TODO(alpha+): frame-time overlay hooks reserved for profiler-style debugging overlays.",
					"* TODO(alpha+): future render-distance / simulation-distance tips for low-memory installs."
			};
			int yTodo = py + PANEL_H - 92;
			for (String line : todos) {
				ctx.drawString(this.font, Component.literal(line), left, yTodo, 0xFF8492B5, false);
				yTodo += 12;
			}
			return;
		}

		if (Tab.SETTINGS.equals(tab)) {
			ctx.drawString(
					this.font,
					Component.translatable("vexclient.screen.settings.config_path.header"),
					left,
					bodyTop + 6,
					VexTheme.ACCENT_PURPLE,
					false);

			String pathShown = shorten(ConfigManager.INSTANCE.getConfigPath().toAbsolutePath().toString(), 58);
			ctx.drawString(this.font, Component.literal(pathShown), left, bodyTop + 22, VexTheme.TEXT_WHITE, false);

			String hint = I18n.get("vexclient.screen.settings.hint");
			drawWrappedPlain(ctx, left, bodyTop + 42, textMaxW, hint, 0xFFA8B5D6);
		}
	}

	/**
	 * Manual wrap for alpha: breaks on spaces and hard newlines. Good enough for short tutorial copy.
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
		return raw.substring(0, lhs) + " … " + raw.substring(raw.length() - rhs);
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
