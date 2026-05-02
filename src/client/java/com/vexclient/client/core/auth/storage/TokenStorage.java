package com.vexclient.client.core.auth.storage;

import com.vexclient.client.core.auth.model.StoredAuthState;

import java.util.Optional;

/**
 * Stores the Microsoft refresh token and cached Minecraft token.
 *
 * <p>This is intentionally abstract so you can later swap in OS-native secure storage:
 * Windows DPAPI, macOS Keychain, Linux Secret Service, etc.
 */
public interface TokenStorage {
	Optional<StoredAuthState> load();

	void save(StoredAuthState state);

	void clear();
}

