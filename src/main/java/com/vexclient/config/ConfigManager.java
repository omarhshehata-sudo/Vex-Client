package com.vexclient.config;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import net.fabricmc.loader.api.FabricLoader;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Small JSON-backed config system. Gson keeps the {@code ~/.minecraft/config/*.json} file human-readable which helps users diff/review settings.
 *
 * Adding new modules later:
 * <ol>
 *   <li>extend {@link VexClientConfigData} with new fields;</li>
 *   <li>bump schemaVersion above if you ever need migrations;</li>
 *   <li>wire HUD toggles into {@link com.vexclient.client.mc.hud.VexHudRenderer}; and</li>
 *   <li>surface toggles in {@link com.vexclient.client.mc.gui.VexMenuScreen}.</li>
 * </ol>
 *
 * <p>TODO(multiversion):
 * If/when we add {@code mc-1.21.1} or {@code mc-1.20.1}, keep config classes stable and share them across all
 * version modules so settings are forward-compatible.
 */
public final class ConfigManager {
	public static final ConfigManager INSTANCE = new ConfigManager();

	private static final String FILE_NAME = "vex-client.json";

	private final Gson gson = new GsonBuilder().setPrettyPrinting().create();
	private VexClientConfigData data;

	private ConfigManager() {
	}

	public Path getConfigPath() {
		return FabricLoader.getInstance().getConfigDir().resolve(FILE_NAME);
	}

	public synchronized VexClientConfigData get() {
		ensureLoaded();
		return data;
	}

	public synchronized void ensureLoaded() {
		if (data != null) {
			return;
		}

		Path path = getConfigPath();
		if (Files.exists(path)) {
			try (BufferedReader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
				data = gson.fromJson(reader, VexClientConfigData.class);
			} catch (IOException ignored) {
				// fall through to defaults
			}
		}

		if (data == null) {
			data = new VexClientConfigData();
		}

		if (data.schemaVersion < 1) {
			data.schemaVersion = 1;
		}

		save();
	}

	public synchronized void save() {
		if (data == null) {
			return;
		}

		Path path = getConfigPath();
		try {
			Files.createDirectories(path.getParent());
			try (BufferedWriter writer = Files.newBufferedWriter(path, StandardCharsets.UTF_8)) {
				gson.toJson(data, writer);
				writer.flush();
			}
		} catch (IOException ignored) {
			// config IO failure should never crash Minecraft for a QoL mod
		}
	}

	public synchronized void update(Updater updater) {
		ensureLoaded();
		updater.apply(data);
		save();
	}

	@FunctionalInterface
	public interface Updater {
		void apply(VexClientConfigData data);
	}
}
