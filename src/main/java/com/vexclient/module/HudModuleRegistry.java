package com.vexclient.module;

/**
 * Lightweight hook-point for HUD modules once you outgrow booleans on {@link com.vexclient.config.VexClientConfigData}.
 *
 * <p>Add new modules by:
 *
 * <ol>
 *   <li>declaring an id in {@link HudOverlayId} (persisted naming);</li>
 *   <li>adding a persisted boolean plus JSON migration if needed;</li>
 *   <li>rendering inside {@link com.vexclient.client.mc.hud.VexHudRenderer}; and</li>
 *   <li>exposing a toggle in {@link com.vexclient.client.mc.gui.VexMenuScreen}.</li>
 * </ol>
 *
 * Later you can migrate to a {@code HudModule} interface registry as sketched below.
 *
 * <p>TODO(multiversion):
 * Once we split into {@code mc-1.21.4} / {@code mc-1.21.1} / {@code mc-1.20.1} modules, keep this registry
 * (and config) in a shared module and only keep rendering hooks per version.
 *
 * <pre>{@code
 * public interface HudModule {
 *     HudOverlayId id();
 *     void render(net.minecraft.client.gui.GuiGraphics ctx, net.minecraft.client.Minecraft client);
 * }
 * }</pre>
 */
public final class HudModuleRegistry {
	private HudModuleRegistry() {
	}
}
