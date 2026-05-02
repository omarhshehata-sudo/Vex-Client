package com.vexclient.config;

/**
 * Persisted HUD toggles written to {@link ConfigManager#getConfigPath()}.
 *
 * Extend this bean as you add HUD modules — keep booleans descriptive for readable JSON configs.
 */
public final class VexClientConfigData {
	public int schemaVersion = 1;

	public boolean hudFpsCounter = true;
	public boolean hudCpsCounter = true;
	public boolean hudCoordinates = true;
}
