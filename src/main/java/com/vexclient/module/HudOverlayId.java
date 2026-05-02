package com.vexclient.module;

/**
 * Stable identifiers used by HUD toggles/menu wiring. Prefer fixed keys so JSON persists cleanly across upgrades.
 */
public enum HudOverlayId {
	FPS_COUNTER("fps"),
	CPS_COUNTER("cps"),
	COORDINATES("coords");

	private final String key;

	HudOverlayId(String key) {
		this.key = key;
	}

	public String key() {
		return key;
	}
}
