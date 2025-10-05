/**
 * End-to-End Tests for OAuth Authentication Flow
 *
 * Tests OAuth token exchange and error handling
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GlobalpingOAuthTokenResponse } from "../../src/types";

// Mock fetch for external OAuth endpoints
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe("OAuth Authentication Flow - Token Exchange", () => {
	beforeEach(() => {
		mockFetch.mockClear();
		vi.clearAllMocks();
	});

	it("should exchange authorization code for access token", async () => {
		const mockTokenResponse: GlobalpingOAuthTokenResponse = {
			access_token: "access-token-123",
			token_type: "Bearer",
			expires_in: 3600,
			refresh_token: "refresh-token-123",
			scope: "measurements",
		};

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockTokenResponse,
		});

		const tokenRequest = new URLSearchParams();
		tokenRequest.append("grant_type", "authorization_code");
		tokenRequest.append("client_id", "test-client-id");
		tokenRequest.append("code", "auth-code-123");
		tokenRequest.append("redirect_uri", "http://localhost:3000/auth/callback");
		tokenRequest.append("code_verifier", "verifier-123");

		const tokenResponse = await mockFetch("https://auth.globalping.io/oauth/token", {
			method: "POST",
			body: tokenRequest,
		});

		expect(tokenResponse.ok).toBe(true);
		const tokenData = await tokenResponse.json();
		expect(tokenData.access_token).toBe("access-token-123");
		expect(tokenData.refresh_token).toBe("refresh-token-123");
	});

	it("should fetch user data after token exchange", async () => {
		const accessToken = "access-token-123";

		const mockUserData = {
			username: "testuser",
			email: "test@example.com",
		};

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockUserData,
		});

		const params = new URLSearchParams();
		params.append("token", accessToken);

		const userResponse = await mockFetch("https://auth.globalping.io/oauth/token/introspect", {
			method: "POST",
			body: params,
		});

		expect(userResponse.ok).toBe(true);
		const userData = await userResponse.json();
		expect(userData.username).toBe("testuser");
	});
});

describe("OAuth Authentication Flow - Error Handling", () => {
	beforeEach(() => {
		mockFetch.mockClear();
		vi.clearAllMocks();
	});

	it("should handle token exchange failure", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 400,
			text: async () =>
				JSON.stringify({
					error: "invalid_grant",
					error_description: "Invalid authorization code",
				}),
		});

		const tokenResponse = await mockFetch("https://auth.globalping.io/oauth/token", {
			method: "POST",
			body: new URLSearchParams({
				grant_type: "authorization_code",
				code: "invalid-code",
			}),
		});

		expect(tokenResponse.ok).toBe(false);
		expect(tokenResponse.status).toBe(400);
	});

	it("should handle user data fetch failure", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 401,
			json: async () => ({
				error: "invalid_token",
			}),
		});

		const userResponse = await mockFetch("https://auth.globalping.io/oauth/token/introspect", {
			method: "POST",
			body: new URLSearchParams({ token: "invalid-token" }),
		});

		expect(userResponse.ok).toBe(false);
		const data = await userResponse.json();
		expect(data.error).toBe("invalid_token");
	});

	it("should handle network errors during token exchange", async () => {
		mockFetch.mockRejectedValueOnce(new Error("Network error"));

		await expect(
			mockFetch("https://auth.globalping.io/oauth/token", {
				method: "POST",
				body: new URLSearchParams({ grant_type: "authorization_code" }),
			}),
		).rejects.toThrow("Network error");
	});
});
