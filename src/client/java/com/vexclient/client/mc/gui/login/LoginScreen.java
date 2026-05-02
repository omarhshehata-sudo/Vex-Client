package com.vexclient.client.mc.gui.login;

import com.vexclient.client.core.VexTheme;
import com.vexclient.client.core.auth.MicrosoftAuthException;
import com.vexclient.client.mc.auth.MicrosoftAuthManager;
import com.vexclient.client.core.auth.model.MinecraftAccount;

import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.resources.language.I18n;
import net.minecraft.network.chat.Component;

import java.util.Optional;
import java.util.concurrent.CompletableFuture;

/**
 * Vex Client account screen.
 *
 * <p>This uses official Microsoft OAuth in the user's browser (Authorization Code + PKCE).
 * No passwords are collected or stored.
 */
public final class LoginScreen extends Screen {
	private static final int PANEL_W = 360;
	private static final int PANEL_H = 210;

	private Button signIn;
	private Button signOut;
	private Button back;

	private String statusLine = "";
	private CompletableFuture<?> inFlight;

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

		int bw = PANEL_W - 24;
		int bh = 20;

		this.signIn = Button.builder(Component.translatable("vexclient.screen.login.sign_in"), btn -> {
			startLogin();
		}).bounds(px + 12, py + 92, bw, bh).build();

		this.signOut = Button.builder(Component.translatable("vexclient.screen.login.sign_out"), btn -> {
			MicrosoftAuthManager.INSTANCE.signOut();
			statusLine = I18n.get("vexclient.screen.login.signed_out");
			rebuild();
		}).bounds(px + 12, py + 92, bw, bh).build();

		this.back = Button.builder(Component.translatable("gui.back"), btn -> {
			this.onClose();
		}).bounds(px + 12, py + PANEL_H - 34, bw, bh).build();

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
		rebuild();

		inFlight = MicrosoftAuthManager.INSTANCE.signInWithMicrosoftInteractive()
				.whenComplete((account, throwable) -> {
					inFlight = null;

					if (throwable == null && account != null) {
						statusLine = I18n.get("vexclient.screen.login.success", account.username());
					} else {
						Throwable root = throwable;
						while (root.getCause() != null) {
							root = root.getCause();
						}

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

		int px = this.width / 2 - PANEL_W / 2;
		int py = this.height / 2 - PANEL_H / 2;

		fillOutline(context, px, py, PANEL_W, PANEL_H, VexTheme.PANEL_BACKGROUND, VexTheme.BORDER_PURPLE);

		context.drawCenteredString(
				this.font,
				Component.translatable("vexclient.screen.login.title"),
				this.width / 2,
				py + 14,
				VexTheme.TEXT_WHITE);

		Optional<MinecraftAccount> acc = MicrosoftAuthManager.INSTANCE.getActiveAccount();
		if (acc.isPresent()) {
			MinecraftAccount a = acc.get();
			context.drawString(this.font, Component.translatable("vexclient.screen.login.signed_in_as"), px + 14, py + 44, VexTheme.ACCENT_PURPLE, false);
			context.drawString(this.font, Component.literal(a.username()), px + 14, py + 58, VexTheme.TEXT_WHITE, false);
			context.drawString(this.font, Component.literal(a.uuid().toString()), px + 14, py + 72, 0xFF9AA0B8, false);
		} else {
			context.drawString(this.font, Component.translatable("vexclient.screen.login.not_signed_in"), px + 14, py + 52, 0xFF9AA0B8, false);
		}

		if (statusLine != null && !statusLine.isBlank()) {
			context.drawString(this.font, Component.literal(statusLine), px + 14, py + 118, 0xFFB2B8CE, false);
		}

		super.render(context, mouseX, mouseY, delta);
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
