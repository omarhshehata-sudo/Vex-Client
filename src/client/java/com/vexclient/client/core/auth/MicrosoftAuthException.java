package com.vexclient.client.core.auth;

/**
 * Exception carrying a user-facing auth error category.
 */
public final class MicrosoftAuthException extends Exception {
	private final MicrosoftAuthError error;

	public MicrosoftAuthException(MicrosoftAuthError error, String message) {
		super(message);
		this.error = error;
	}

	public MicrosoftAuthException(MicrosoftAuthError error, String message, Throwable cause) {
		super(message, cause);
		this.error = error;
	}

	public MicrosoftAuthError error() {
		return error;
	}
}

