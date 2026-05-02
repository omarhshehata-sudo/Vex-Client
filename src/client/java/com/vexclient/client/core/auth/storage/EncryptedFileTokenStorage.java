package com.vexclient.client.core.auth.storage;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.vexclient.client.core.auth.model.StoredAuthState;

import net.fabricmc.loader.api.FabricLoader;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Optional;
import java.util.prefs.Preferences;

/**
 * Small encrypted-on-disk token cache.
 *
 * <p>Important: this is not perfect “hardware-backed” security. It is a practical improvement
 * over plaintext, and a clean seam for swapping in true OS keychains later.
 *
 * <p>TODO(multiversion): keep the storage interface/implementation in a shared module; only FabricLoader path
 * lookup is Fabric-specific, but can be injected.
 */
public final class EncryptedFileTokenStorage implements TokenStorage {
	private static final String FILE_NAME = "vex-client.tokens";
	private static final String PREF_KEY = "vexclient.tokenKey.v1";

	private final Gson gson = new GsonBuilder().setPrettyPrinting().create();
	private final SecureRandom random = new SecureRandom();

	private final Path path;
	private final Preferences prefs;

	public EncryptedFileTokenStorage() {
		this.path = FabricLoader.getInstance().getConfigDir().resolve(FILE_NAME);
		this.prefs = Preferences.userNodeForPackage(EncryptedFileTokenStorage.class);
	}

	@Override
	public Optional<StoredAuthState> load() {
		try {
			if (!Files.exists(path)) {
				return Optional.empty();
			}

			byte[] blob = Files.readAllBytes(path);
			if (blob.length < 12 + 16) {
				return Optional.empty();
			}

			byte[] iv = new byte[12];
			System.arraycopy(blob, 0, iv, 0, 12);
			byte[] ciphertext = new byte[blob.length - 12];
			System.arraycopy(blob, 12, ciphertext, 0, ciphertext.length);

			Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
			cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, iv));
			byte[] plain = cipher.doFinal(ciphertext);

			String json = new String(plain, StandardCharsets.UTF_8);
			StoredAuthState state = gson.fromJson(json, StoredAuthState.class);
			return Optional.ofNullable(state);
		} catch (Exception ignored) {
			return Optional.empty();
		}
	}

	@Override
	public void save(StoredAuthState state) {
		try {
			Files.createDirectories(path.getParent());

			byte[] iv = new byte[12];
			random.nextBytes(iv);

			byte[] plain = gson.toJson(state).getBytes(StandardCharsets.UTF_8);

			Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
			cipher.init(Cipher.ENCRYPT_MODE, key(), new GCMParameterSpec(128, iv));
			byte[] ciphertext = cipher.doFinal(plain);

			byte[] blob = new byte[iv.length + ciphertext.length];
			System.arraycopy(iv, 0, blob, 0, iv.length);
			System.arraycopy(ciphertext, 0, blob, iv.length, ciphertext.length);

			Files.write(path, blob);
		} catch (Exception ignored) {
			// never crash the client due to token cache IO
		}
	}

	@Override
	public void clear() {
		try {
			Files.deleteIfExists(path);
		} catch (Exception ignored) {
		}
	}

	private SecretKey key() {
		String b64 = prefs.get(PREF_KEY, null);
		if (b64 == null || b64.isBlank()) {
			byte[] key = new byte[32];
			random.nextBytes(key);
			b64 = Base64.getEncoder().encodeToString(key);
			prefs.put(PREF_KEY, b64);
		}
		byte[] bytes = Base64.getDecoder().decode(b64);
		return new SecretKeySpec(bytes, "AES");
	}
}

