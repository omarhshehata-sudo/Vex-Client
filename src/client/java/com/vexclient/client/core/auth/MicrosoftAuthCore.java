package com.vexclient.client.core.auth;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import com.vexclient.client.core.auth.model.MinecraftAccount;
import com.vexclient.client.core.auth.model.StoredAuthState;
import com.vexclient.client.core.auth.storage.EncryptedFileTokenStorage;
import com.vexclient.client.core.auth.storage.TokenStorage;

import java.awt.Desktop;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

/**
 * Version-agnostic Microsoft -> Xbox -> Minecraft authentication.
 *
 * <p>This class has zero direct dependencies on Minecraft code. It only returns a {@link MinecraftAccount}
 * (profile + Minecraft Services access token).
 *
 * <p>1.21.4 integration lives in {@code com.vexclient.client.mc.auth.MinecraftSessionApplier}.
 *
 * <p>TODO(multiversion): when adding {@code mc-1.21.1} or {@code mc-1.20.1}, reuse this class unchanged and
 * provide a different per-version session applier.
 */
public final class MicrosoftAuthCore {
	public static final MicrosoftAuthCore INSTANCE = new MicrosoftAuthCore();

	private static final String MS_AUTHORIZE = "https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize";
	private static final String MS_TOKEN = "https://login.microsoftonline.com/consumers/oauth2/v2.0/token";

	private static final String XBL_AUTH = "https://user.auth.xboxlive.com/user/authenticate";
	private static final String XSTS_AUTH = "https://xsts.auth.xboxlive.com/xsts/authorize";
	private static final String MC_LOGIN_WITH_XBOX = "https://api.minecraftservices.com/authentication/login_with_xbox";
	private static final String MC_ENTITLEMENTS = "https://api.minecraftservices.com/entitlements/mcstore";
	private static final String MC_PROFILE = "https://api.minecraftservices.com/minecraft/profile";

	/**
	 * Fixed loopback port so the Azure redirect URI is stable and easy to configure.
	 */
	public static final URI LOOPBACK_REDIRECT_URI = URI.create("http://127.0.0.1:25585/callback");

	private final Gson gson = new GsonBuilder().create();
	private final HttpClient http = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NORMAL).build();
	private final SecureRandom random = new SecureRandom();

	private final TokenStorage storage = new EncryptedFileTokenStorage();

	private volatile MinecraftAccount activeAccount;
	private volatile StoredAuthState cached;

	private MicrosoftAuthCore() {
		this.cached = storage.load().orElse(null);
		if (cached != null && cached.mcAccessToken != null && cached.username != null && cached.uuid != null) {
			try {
				this.activeAccount = new MinecraftAccount(
						cached.username,
						UUID.fromString(cached.uuid),
						cached.mcAccessToken,
						cached.mcExpiresAt()
				);
			} catch (Exception ignored) {
				this.activeAccount = null;
			}
		}
	}

	public Optional<MinecraftAccount> getActiveAccount() {
		return Optional.ofNullable(activeAccount);
	}

	public CompletableFuture<MinecraftAccount> signInWithMicrosoftInteractive() {
		String clientId = clientId();
		if (clientId == null || clientId.isBlank()) {
			return CompletableFuture.failedFuture(new MicrosoftAuthException(
					MicrosoftAuthError.MICROSOFT_LOGIN_FAILED,
					"Missing Microsoft OAuth client id. Set env VEX_MS_CLIENT_ID or JVM property vex.ms.clientId."
			));
		}

		return CompletableFuture.supplyAsync(() -> {
			try {
				Pkce pkce = Pkce.create(random);

				LoopbackLogin loopback = startLoopbackAuthServer(pkce.state);
				URI redirectUri = loopback.redirectUri();

				URI authUrl = buildAuthorizeUrl(clientId, redirectUri, pkce);
				openBrowser(authUrl);

				String code = loopback.codeFuture().get(180, TimeUnit.SECONDS);
				MicrosoftTokens ms = exchangeAuthCodeForTokens(clientId, redirectUri, code, pkce.verifier);

				XboxTokens xbox = xboxTokenExchange(ms.accessToken);

				String mcAccessToken = minecraftLoginWithXbox(xbox.uhs, xbox.xstsToken);
				ensureJavaOwned(mcAccessToken);
				MinecraftProfile profile = fetchMinecraftProfile(mcAccessToken);

				Instant expiresAt = Instant.now().plusSeconds(60L * 60L * 24L); // typically 24h
				MinecraftAccount account = new MinecraftAccount(profile.name, profile.uuid, mcAccessToken, expiresAt);

				StoredAuthState state = new StoredAuthState();
				state.msRefreshToken = ms.refreshToken;
				state.mcAccessToken = mcAccessToken;
				state.mcExpiresAtEpochSeconds = expiresAt.getEpochSecond();
				state.username = profile.name;
				state.uuid = profile.uuid.toString();

				storage.save(state);
				cached = state;
				activeAccount = account;

				return account;
			} catch (MicrosoftAuthException e) {
				throw new RuntimeException(e);
			} catch (Exception e) {
				throw new RuntimeException(new MicrosoftAuthException(
						MicrosoftAuthError.MICROSOFT_LOGIN_FAILED,
						"Microsoft login failed.",
						e
				));
			}
		});
	}

	public void signOut() {
		activeAccount = null;
		cached = null;
		storage.clear();
	}

	/**
	 * Attempts to refresh the cached Microsoft token and mint a new Minecraft token.
	 */
	public CompletableFuture<MinecraftAccount> refreshIfExpired() {
		MinecraftAccount current = activeAccount;
		StoredAuthState state = cached;
		if (current == null || state == null) {
			return CompletableFuture.failedFuture(new MicrosoftAuthException(MicrosoftAuthError.TOKEN_EXPIRED, "Token expired, please sign in again."));
		}
		if (!current.isExpired()) {
			return CompletableFuture.completedFuture(current);
		}

		return CompletableFuture.supplyAsync(() -> {
			try {
				MicrosoftTokens ms = refreshMicrosoftAccessToken(clientId(), state.msRefreshToken);
				XboxTokens xbox = xboxTokenExchange(ms.accessToken);
				String mcAccessToken = minecraftLoginWithXbox(xbox.uhs, xbox.xstsToken);

				Instant expiresAt = Instant.now().plusSeconds(60L * 60L * 24L);
				MinecraftAccount refreshed = new MinecraftAccount(current.username(), current.uuid(), mcAccessToken, expiresAt);

				state.msRefreshToken = ms.refreshToken != null ? ms.refreshToken : state.msRefreshToken;
				state.mcAccessToken = mcAccessToken;
				state.mcExpiresAtEpochSeconds = expiresAt.getEpochSecond();
				storage.save(state);
				cached = state;
				activeAccount = refreshed;

				return refreshed;
			} catch (MicrosoftAuthException e) {
				throw new RuntimeException(e);
			} catch (Exception e) {
				throw new RuntimeException(new MicrosoftAuthException(MicrosoftAuthError.TOKEN_EXPIRED, "Token expired, please sign in again.", e));
			}
		});
	}

	private URI buildAuthorizeUrl(String clientId, URI redirectUri, Pkce pkce) {
		String scope = "XboxLive.signin offline_access";

		String q = "client_id=" + enc(clientId)
				+ "&response_type=code"
				+ "&redirect_uri=" + enc(redirectUri.toString())
				+ "&response_mode=query"
				+ "&scope=" + enc(scope)
				+ "&code_challenge=" + enc(pkce.challenge)
				+ "&code_challenge_method=S256"
				+ "&state=" + enc(pkce.state);

		return URI.create(MS_AUTHORIZE + "?" + q);
	}

	private LoopbackLogin startLoopbackAuthServer(String expectedState) throws MicrosoftAuthException {
		HttpServer server;
		try {
			server = HttpServer.create(new InetSocketAddress("127.0.0.1", LOOPBACK_REDIRECT_URI.getPort()), 0);
		} catch (IOException e) {
			throw new MicrosoftAuthException(
					MicrosoftAuthError.MICROSOFT_LOGIN_FAILED,
					"Microsoft login failed: could not bind redirect server on " + LOOPBACK_REDIRECT_URI + ". Close other apps using that port and retry.",
					e
			);
		}

		CompletableFuture<String> codeFuture = new CompletableFuture<>();

		server.createContext("/callback", exchange -> {
			try {
				String query = exchange.getRequestURI().getRawQuery();
				QueryMap qm = QueryMap.parse(query);

				String code = qm.get("code");
				String state = qm.get("state");
				String error = qm.get("error");
				String errorDesc = qm.get("error_description");

				if (error != null) {
					respond(exchange, 200, "Vex Client: login failed. You can close this tab and return to Minecraft.\n\n" + error + "\n" + (errorDesc == null ? "" : errorDesc));
					codeFuture.completeExceptionally(new MicrosoftAuthException(MicrosoftAuthError.MICROSOFT_LOGIN_FAILED, "Microsoft login failed: " + error));
					return;
				}

				if (code == null || state == null || !state.equals(expectedState)) {
					respond(exchange, 200, "Vex Client: invalid redirect parameters. Please close this tab and retry.");
					codeFuture.completeExceptionally(new MicrosoftAuthException(MicrosoftAuthError.MICROSOFT_LOGIN_FAILED, "Microsoft login failed: invalid redirect."));
					return;
				}

				respond(exchange, 200, "Vex Client: login successful. You can close this tab and return to Minecraft.");
				codeFuture.complete(code);
			} catch (Exception e) {
				codeFuture.completeExceptionally(e);
			} finally {
				server.stop(0);
			}
		});

		server.start();
		return new LoopbackLogin(LOOPBACK_REDIRECT_URI, codeFuture);
	}

	private record LoopbackLogin(URI redirectUri, CompletableFuture<String> codeFuture) {
	}

	private MicrosoftTokens exchangeAuthCodeForTokens(String clientId, URI redirectUri, String code, String verifier) throws Exception {
		String body = "client_id=" + enc(clientId)
				+ "&grant_type=authorization_code"
				+ "&code=" + enc(code)
				+ "&redirect_uri=" + enc(redirectUri.toString())
				+ "&code_verifier=" + enc(verifier);

		HttpRequest req = HttpRequest.newBuilder(URI.create(MS_TOKEN))
				.header("Content-Type", "application/x-www-form-urlencoded")
				.POST(HttpRequest.BodyPublishers.ofString(body))
				.build();

		HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
		if (res.statusCode() / 100 != 2) {
			throw new MicrosoftAuthException(MicrosoftAuthError.MICROSOFT_LOGIN_FAILED, "Microsoft login failed.");
		}

		JsonObject json = gson.fromJson(res.body(), JsonObject.class);
		String accessToken = getString(json, "access_token");
		String refreshToken = getString(json, "refresh_token");
		if (accessToken == null || refreshToken == null) {
			throw new MicrosoftAuthException(MicrosoftAuthError.MICROSOFT_LOGIN_FAILED, "Microsoft login failed: missing tokens.");
		}
		return new MicrosoftTokens(accessToken, refreshToken);
	}

	private MicrosoftTokens refreshMicrosoftAccessToken(String clientId, String refreshToken) throws Exception {
		if (clientId == null || clientId.isBlank() || refreshToken == null || refreshToken.isBlank()) {
			throw new MicrosoftAuthException(MicrosoftAuthError.TOKEN_EXPIRED, "Token expired, please sign in again.");
		}

		String scope = "XboxLive.signin offline_access";
		String body = "client_id=" + enc(clientId)
				+ "&grant_type=refresh_token"
				+ "&refresh_token=" + enc(refreshToken)
				+ "&scope=" + enc(scope);

		HttpRequest req = HttpRequest.newBuilder(URI.create(MS_TOKEN))
				.header("Content-Type", "application/x-www-form-urlencoded")
				.POST(HttpRequest.BodyPublishers.ofString(body))
				.build();

		HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
		if (res.statusCode() / 100 != 2) {
			throw new MicrosoftAuthException(MicrosoftAuthError.TOKEN_EXPIRED, "Token expired, please sign in again.");
		}

		JsonObject json = gson.fromJson(res.body(), JsonObject.class);
		String accessToken = getString(json, "access_token");
		String newRefresh = getString(json, "refresh_token");
		if (accessToken == null) {
			throw new MicrosoftAuthException(MicrosoftAuthError.TOKEN_EXPIRED, "Token expired, please sign in again.");
		}
		return new MicrosoftTokens(accessToken, newRefresh);
	}

	private XboxTokens xboxTokenExchange(String msAccessToken) throws Exception {
		try {
			JsonObject xblReq = new JsonObject();
			xblReq.addProperty("RelyingParty", "http://auth.xboxlive.com");
			xblReq.addProperty("TokenType", "JWT");

			JsonObject props = new JsonObject();
			props.addProperty("AuthMethod", "RPS");
			props.addProperty("SiteName", "user.auth.xboxlive.com");
			props.addProperty("RpsTicket", "d=" + msAccessToken);

			xblReq.add("Properties", props);

			JsonObject xbl = postJson(XBL_AUTH, xblReq, null);
			String xblToken = getString(xbl, "Token");
			String uhs = xbl.getAsJsonObject("DisplayClaims")
					.getAsJsonArray("xui")
					.get(0).getAsJsonObject()
					.get("uhs").getAsString();

			JsonObject xstsReq = new JsonObject();
			xstsReq.addProperty("RelyingParty", "rp://api.minecraftservices.com/");
			xstsReq.addProperty("TokenType", "JWT");

			JsonObject xstsProps = new JsonObject();
			xstsProps.addProperty("SandboxId", "RETAIL");
			xstsProps.add("UserTokens", gson.toJsonTree(java.util.List.of(xblToken)));
			xstsReq.add("Properties", xstsProps);

			JsonObject xsts = postJson(XSTS_AUTH, xstsReq, null);
			String xstsToken = getString(xsts, "Token");

			if (xstsToken == null || uhs == null) {
				throw new MicrosoftAuthException(MicrosoftAuthError.XBOX_AUTH_FAILED, "Xbox authentication failed.");
			}

			return new XboxTokens(uhs, xstsToken);
		} catch (MicrosoftAuthException e) {
			throw e;
		} catch (Exception e) {
			throw new MicrosoftAuthException(MicrosoftAuthError.XBOX_AUTH_FAILED, "Xbox authentication failed.", e);
		}
	}

	private String minecraftLoginWithXbox(String uhs, String xstsToken) throws Exception {
		JsonObject req = new JsonObject();
		req.addProperty("identityToken", "XBL3.0 x=" + uhs + ";" + xstsToken);
		JsonObject res = postJson(MC_LOGIN_WITH_XBOX, req, null);
		String token = getString(res, "access_token");
		if (token == null) {
			throw new MicrosoftAuthException(MicrosoftAuthError.XBOX_AUTH_FAILED, "Xbox authentication failed.");
		}
		return token;
	}

	private void ensureJavaOwned(String mcAccessToken) throws Exception {
		HttpRequest req = HttpRequest.newBuilder(URI.create(MC_ENTITLEMENTS))
				.header("Authorization", "Bearer " + mcAccessToken)
				.GET()
				.build();

		HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
		if (res.statusCode() / 100 != 2) {
			throw new MicrosoftAuthException(MicrosoftAuthError.XBOX_AUTH_FAILED, "Xbox authentication failed.");
		}

		JsonObject json = gson.fromJson(res.body(), JsonObject.class);
		var items = json.getAsJsonArray("items");
		if (items == null || items.isEmpty()) {
			throw new MicrosoftAuthException(MicrosoftAuthError.MINECRAFT_JAVA_NOT_OWNED, "Minecraft Java not owned.");
		}

		boolean ok = false;
		for (var el : items) {
			JsonObject obj = el.getAsJsonObject();
			String name = getString(obj, "name");
			if (name == null) {
				continue;
			}
			if (name.equals("product_minecraft") || name.equals("game_minecraft") || name.contains("game_pass")) {
				ok = true;
				break;
			}
		}

		if (!ok) {
			throw new MicrosoftAuthException(MicrosoftAuthError.MINECRAFT_JAVA_NOT_OWNED, "Minecraft Java not owned.");
		}
	}

	private MinecraftProfile fetchMinecraftProfile(String mcAccessToken) throws Exception {
		HttpRequest req = HttpRequest.newBuilder(URI.create(MC_PROFILE))
				.header("Authorization", "Bearer " + mcAccessToken)
				.GET()
				.build();

		HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
		if (res.statusCode() / 100 != 2) {
			throw new MicrosoftAuthException(MicrosoftAuthError.XBOX_AUTH_FAILED, "Xbox authentication failed.");
		}

		JsonObject json = gson.fromJson(res.body(), JsonObject.class);
		String id = getString(json, "id");
		String name = getString(json, "name");
		if (id == null || name == null) {
			throw new MicrosoftAuthException(MicrosoftAuthError.XBOX_AUTH_FAILED, "Xbox authentication failed.");
		}

		UUID uuid = uuidFromUndashed(id);
		return new MinecraftProfile(uuid, name);
	}

	private JsonObject postJson(String url, JsonObject payload, String bearer) throws Exception {
		HttpRequest.Builder b = HttpRequest.newBuilder(URI.create(url))
				.header("Accept", "application/json")
				.header("Content-Type", "application/json")
				.POST(HttpRequest.BodyPublishers.ofString(gson.toJson(payload)));
		if (bearer != null) {
			b.header("Authorization", "Bearer " + bearer);
		}
		HttpResponse<String> res = http.send(b.build(), HttpResponse.BodyHandlers.ofString());
		if (res.statusCode() / 100 != 2) {
			throw new MicrosoftAuthException(MicrosoftAuthError.XBOX_AUTH_FAILED, "Xbox authentication failed.");
		}
		return gson.fromJson(res.body(), JsonObject.class);
	}

	private void openBrowser(URI uri) throws MicrosoftAuthException {
		try {
			if (!Desktop.isDesktopSupported()) {
				throw new MicrosoftAuthException(MicrosoftAuthError.MICROSOFT_LOGIN_FAILED, "Microsoft login failed: Desktop browsing not supported.");
			}
			Desktop.getDesktop().browse(uri);
		} catch (Exception e) {
			throw new MicrosoftAuthException(MicrosoftAuthError.MICROSOFT_LOGIN_FAILED, "Microsoft login failed: unable to open browser.", e);
		}
	}

	private static void respond(HttpExchange ex, int code, String body) throws IOException {
		byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
		ex.getResponseHeaders().add("Content-Type", "text/plain; charset=utf-8");
		ex.sendResponseHeaders(code, bytes.length);
		try (OutputStream os = ex.getResponseBody()) {
			os.write(bytes);
		}
	}

	private static String clientId() {
		String env = System.getenv("VEX_MS_CLIENT_ID");
		if (env != null && !env.isBlank()) {
			return env.trim();
		}
		return System.getProperty("vex.ms.clientId");
	}

	private static String enc(String s) {
		return URLEncoder.encode(s, StandardCharsets.UTF_8);
	}

	private static String getString(JsonObject obj, String key) {
		if (obj == null || !obj.has(key) || obj.get(key).isJsonNull()) {
			return null;
		}
		return obj.get(key).getAsString();
	}

	private static UUID uuidFromUndashed(String undashed) {
		String s = undashed.replace("-", "");
		if (s.length() != 32) {
			return UUID.randomUUID();
		}
		String dashed = s.substring(0, 8) + "-" + s.substring(8, 12) + "-" + s.substring(12, 16) + "-" + s.substring(16, 20) + "-" + s.substring(20);
		return UUID.fromString(dashed);
	}

	private record MicrosoftTokens(String accessToken, String refreshToken) {
	}

	private record XboxTokens(String uhs, String xstsToken) {
	}

	private record MinecraftProfile(UUID uuid, String name) {
	}

	private record Pkce(String verifier, String challenge, String state) {
		static Pkce create(SecureRandom random) {
			String verifier = base64Url(randomBytes(random, 32));
			String challenge = base64Url(sha256(verifier.getBytes(StandardCharsets.US_ASCII)));
			String state = base64Url(randomBytes(random, 16));
			return new Pkce(verifier, challenge, state);
		}
	}

	private static byte[] randomBytes(SecureRandom random, int n) {
		byte[] b = new byte[n];
		random.nextBytes(b);
		return b;
	}

	private static byte[] sha256(byte[] bytes) {
		try {
			MessageDigest md = MessageDigest.getInstance("SHA-256");
			return md.digest(bytes);
		} catch (Exception e) {
			return new byte[32];
		}
	}

	private static String base64Url(byte[] bytes) {
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}

	private static final class QueryMap {
		private final java.util.Map<String, String> map;

		private QueryMap(java.util.Map<String, String> map) {
			this.map = map;
		}

		static QueryMap parse(String query) {
			java.util.HashMap<String, String> m = new java.util.HashMap<>();
			if (query == null || query.isBlank()) {
				return new QueryMap(m);
			}
			for (String part : query.split("&")) {
				int idx = part.indexOf('=');
				if (idx <= 0) {
					continue;
				}
				String k = java.net.URLDecoder.decode(part.substring(0, idx), StandardCharsets.UTF_8);
				String v = java.net.URLDecoder.decode(part.substring(idx + 1), StandardCharsets.UTF_8);
				m.put(k, v);
			}
			return new QueryMap(m);
		}

		String get(String key) {
			return map.get(key);
		}
	}
}

