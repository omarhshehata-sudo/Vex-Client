package com.vexclient;

import com.vexclient.config.ConfigManager;

import net.fabricmc.api.ModInitializer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Common (non-client) entrypoint. Keep this intentionally small — most gameplay-facing code lives under {@link com.vexclient.client.VexClientClient}.
 */
public class VexClient implements ModInitializer {
	public static final String MOD_ID = "vexclient";

	public static final Logger LOGGER = LoggerFactory.getLogger("VexClient");

	@Override
	public void onInitialize() {
		ConfigManager.INSTANCE.ensureLoaded();
		LOGGER.info("[Vex Client] Vex Client loaded.");
	}
}
