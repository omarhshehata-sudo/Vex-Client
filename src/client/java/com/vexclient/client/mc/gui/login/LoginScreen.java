package com.vexclient.client.mc.gui.login;

import com.vexclient.client.core.VexRenderUtils;
import com.vexclient.client.core.VexTheme;
import com.vexclient.client.core.auth.MicrosoftAuthException;
import com.vexclient.client.mc.auth.MicrosoftAuthManager;
import com.vexclient.client.core.auth.model.MinecraftAccount;
import com.vexclient.client.mc.gui.widget.VexButton;

import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.resources.language.I18n;
import net.minecraft.network.chat.Component;

import java.util.Optional;
import java.util.concurrent.CompletableFuture;

/**
 * Professional Vex Client account screen with modern styling.
 *
 * <p>This uses official Microsoft OAuth in the user's browser (Authorization Code + PKCE).
 * No passwords are collected or stored.
 */
public final class LoginScreen extends Screen {
	private static final int PANEL_W = 380;
	private static final int PANEL_H = 260;
	private static final int CORNER_RADIUS = VexTheme.CORNER_RADIUS_LARGE;

	private VexButton signIn;
	private VexButton signOut;
	private VexButton back;

	private String statusLine = "";
	private int statusColor = VexTheme.TEXT_DIM;
	private CompletableFuture<?> inFlight;
	private float loadingAnimation = 0f;

	public LoginScreen(Screen parent) {
		super(Component.translatable("vexclient.screen.login.title"));
		this.parent = parent;
	}

	private final Screen parent;

	@Override
	protected void init() {
		super.init();

		int px = this.width / 2 - PANEL_W / 2;
		int py = this.height / 2 - PANEL_H / 2;

		int bw = PANEL_W - 48;
		int bh = 26;
		int buttonX = px + 24;

		this.signIn = VexButton.builder(
			Component.translatable("vexclient.screen.login.sign_in"),
			btn -> startLogin()
		).position(buttonX, py + 150).size(bw, bh).style(VexButton.Style.PRIMARY).build();

		this.signOut = VexButton.builder(
			Component.translatable("vexclient.screen.login.sign_out"),
			btn -> {
				MicrosoftAuthManager.INSTANCE.signOut();
				statusLine = I18n.get("vexclient.screen.login.signed_out");
				statusColor = VexTheme.INFO_BLUE;
				rebuild();
			}
		).position(buttonX, py + 150).size(bw, bh).style(VexButton.Style.DANGER).build();

		this.back = VexButton.builder(
			Component.translatable("gui.back"),
			btn -> this.onClose()
		).position(buttonX, py + PANEL_H - 42).size(bw, bh).style(VexButton.Style.SECONDARY).build();

		this.addRenderableWidget(this.signIn);
		this.addRenderableWidget(this.signOut);
		this.addRenderableWidget(this.back);

		rebuild();
	}

	private void rebuild() {
		Optional<MinecraftAccount> acc = MicrosoftAuthManager.INSTANCE.getActiveAccount();
		boolean signedIn = acc.isPresent();

		this.signIn.visible = !signedIn;
		this.signIn.active = inFlight == null;

		this.signOut.visible = signedIn;
		this.signOut.active = inFlight == null;
	}

	private void startLogin() {
		if (inFlight != null) {
			return;
		}

		statusLine = I18n.get("vexclient.screen.login.waiting_browser");
		statusColor = VexTheme.INFO_BLUE;
		rebuild();

		inFlight = MicrosoftAuthManager.INSTANCE.signInWithMicrosoftInteractive()
				.whenComplete((account, throwable) -> {
					inFlight = null;

					if (throwable == null && account != null) {
						statusLine = I18n.get("vexclient.screen.login.success", account.username());
						statusColor = VexTheme.SUCCESS_GREEN;
					} else {
						Throwable root = throwable;
						while (root.getCause() != null) {
							root = root.getCause();
						}

						statusColor = VexTheme.ERROR_RED;
						if (root instanceof MicrosoftAuthException mae) {
							switch (mae.error()) {
								case MICROSOFT_LOGIN_FAILED -> statusLine = I18n.get("vexclient.screen.login.error.microsoft");
								case XBOX_AUTH_FAILED -> statusLine = I18n.get("vexclient.screen.login.error.xbox");
								case MINECRAFT_JAVA_NOT_OWNED -> statusLine = I18n.get("vexclient.screen.login.error.not_owned");
								case TOKEN_EXPIRED -> statusLine = I18n.get("vexclient.screen.login.error.expired");
							}
						} else {
							statusLine = I18n.get("vexclient.screen.login.error.microsoft");
						}
					}

					if (this.minecraft != null) {
						this.minecraft.execute(this::rebuild);
					}
				});
	}

	@Override
	public void onClose() {
		if (this.minecraft != null) {
			this.minecraft.setScreen(parent);
		}
	}

	@Override
	public boolean isPauseScreen() {
		return false;
	}

	@Override
	public void render(GuiGraphics context, int mouseX, int mouseY, float delta) {
		this.renderBackground(context, mouseX, mouseY, delta);

		// Update loading animation
		if (inFlight != null) {
			loadingAnimation += delta * 0.1f;
		}

		int px = this.width / 2 - PANEL_W / 2;
		int py = this.height / 2 - PANEL_H / 2;

		// Draw drop shadow
		VexRenderUtils.drawDropShadow(context, px, py, PANEL_W, PANEL_H, 12, 4, 6);

		// Draw main panel
		VexRenderUtils.fillRoundedRect(context, px, py, PANEL_W, PANEL_H, CORNER_RADIUS, VexTheme.PANEL_BACKGROUND);

		// Draw header
		VexRenderUtils.fillRoundedRect(context, px, py, PANEL_W, 50, CORNER_RADIUS, VexTheme.PANEL_HEADER);
		context.fill(px, py + 42, px + PANEL_W, py + 50, VexTheme.PANEL_HEADER);

		// Draw border with glow
		VexRenderUtils.drawGlow(context, px, py, PANEL_W, PANEL_H, 3, VexTheme.BORDER_PURPLE_GLOW);
		VexRenderUtils.drawRoundedRectOutline(context, px, py, PANEL_W, PANEL_H, CORNER_RADIUS, 1, VexTheme.BORDER_PURPLE);

		// Draw title
		String title = Component.translatable("vexclient.screen.login.title").getString();
		int titleWidth = this.font.width(title);
		context.drawString(this.font, title, this.width / 2 - titleWidth / 2 + 1, py + 19, VexTheme.SHADOW_DEEP_PURPLE, false);
		context.drawString(this.font, title, this.width / 2 - titleWidth / 2, py + 18, VexTheme.TEXT_WHITE, false);

		// Draw separator
		VexRenderUtils.drawSeparator(context, px + 20, py + 50, PANEL_W - 40, VexTheme.BORDER_PURPLE);

		// Draw account section
		renderAccountSection(context, px, py);

		// Draw status message
		renderStatusMessage(context, px, py);

		super.render(context, mouseX, mouseY, delta);
	}

	private void renderAccountSection(GuiGraphics context, int px, int py) {
		int contentX = px + 24;
		int contentY = py + 64;

		Optional<MinecraftAccount> acc = MicrosoftAuthManager.INSTANCE.getActiveAccount();

		if (acc.isPresent()) {
			MinecraftAccount a = acc.get();

			// Account card background
			int cardW = PANEL_W - 48;
			int cardH = 70;
			VexRenderUtils.fillRoundedRect(context, contentX, contentY, cardW, cardH, 6, VexTheme.PANEL_BACKGROUND_LIGHT);
			VexRenderUtils.drawRoundedRectOutline(context, contentX, contentY, cardW, cardH, 6, 1, 
				VexTheme.withAlpha(VexTheme.SUCCESS_GREEN, 100));

			// Status indicator
			VexRenderUtils.fillRoundedRect(context, contentX + 12, contentY + 12, 8, 8, 4, VexTheme.SUCCESS_GREEN);
			VexRenderUtils.drawGlow(context, contentX + 12, contentY + 12, 8, 8, 4, VexTheme.withAlpha(VexTheme.SUCCESS_GREEN, 80));

			// Signed in label
			context.drawString(this.font, 
				Component.translatable("vexclient.screen.login.signed_in_as").getString(), 
				contentX + 28, contentY + 10, VexTheme.SUCCESS_GREEN, false);

			// Username (larger, prominent)
			context.drawString(this.font, a.username(), contentX + 12, contentY + 28, VexTheme.TEXT_WHITE, false);

			// UUID (dimmed)
			String shortUuid = a.uuid().toString().substring(0, 8) + "...";
			context.drawString(this.font, "UUID: " + shortUuid, contentX + 12, contentY + 44, VexTheme.TEXT_MUTED, false);

			// Avatar placeholder
			int avatarSize = 48;
			int avatarX = contentX + cardW - avatarSize - 12;
			int avatarY = contentY + (cardH - avatarSize) / 2;
			VexRenderUtils.fillRoundedRect(context, avatarX, avatarY, avatarSize, avatarSize, 6, VexTheme.PANEL_BACKGROUND);
			VexRenderUtils.drawRoundedRectOutline(context, avatarX, avatarY, avatarSize, avatarSize, 6, 1, 
				VexTheme.withAlpha(VexTheme.BORDER_PURPLE, 60));

			// Avatar initial
			String initial = a.username().substring(0, 1).toUpperCase();
			int initialW = this.font.width(initial);
			context.drawString(this.font, initial, avatarX + (avatarSize - initialW) / 2, avatarY + 20, VexTheme.ACCENT_PURPLE, false);

		} else {
			// Not signed in card
			int cardW = PANEL_W - 48;
			int cardH = 70;
			VexRenderUtils.fillRoundedRect(context, contentX, contentY, cardW, cardH, 6, VexTheme.PANEL_BACKGROUND_LIGHT);
			VexRenderUtils.drawRoundedRectOutline(context, contentX, contentY, cardW, cardH, 6, 1, 
				VexTheme.withAlpha(VexTheme.TEXT_MUTED, 60));

			// Icon placeholder
			int iconSize = 32;
			int iconX = contentX + (cardW - iconSize) / 2;
			int iconY = contentY + 10;
			VexRenderUtils.fillRoundedRect(context, iconX, iconY, iconSize, iconSize, 6, VexTheme.PANEL_BACKGROUND);

			// Question mark
			context.drawString(this.font, "?", iconX + 12, iconY + 12, VexTheme.TEXT_MUTED, false);

			// Not signed in text
			String notSignedIn = Component.translatable("vexclient.screen.login.not_signed_in").getString();
			int textW = this.font.width(notSignedIn);
			context.drawString(this.font, notSignedIn, contentX + (cardW - textW) / 2, contentY + 50, VexTheme.TEXT_DIM, false);
		}
	}

	private void renderStatusMessage(GuiGraphics context, int px, int py) {
		if (statusLine == null || statusLine.isBlank()) {
			return;
		}

		int statusY = py + 185;
		int statusX = px + 24;
		int statusW = PANEL_W - 48;

		// Status background
		VexRenderUtils.fillRoundedRect(context, statusX, statusY, statusW, 22, 4, 
			VexTheme.withAlpha(statusColor, 20));
		VexRenderUtils.drawRoundedRectOutline(context, statusX, statusY, statusW, 22, 4, 1, 
			VexTheme.withAlpha(statusColor, 60));

		// Status indicator dot
		VexRenderUtils.fillRoundedRect(context, statusX + 8, statusY + 8, 6, 6, 3, statusColor);

		// Loading animation
		if (inFlight != null) {
			float pulse = (float)(Math.sin(loadingAnimation * Math.PI * 2) * 0.5 + 0.5);
			int pulseAlpha = (int)(pulse * 100) + 50;
			VexRenderUtils.drawGlow(context, statusX + 8, statusY + 8, 6, 6, 3, VexTheme.withAlpha(statusColor, pulseAlpha));
		}

		// Status text
		context.drawString(this.font, statusLine, statusX + 20, statusY + 7, statusColor, false);
	}
}
