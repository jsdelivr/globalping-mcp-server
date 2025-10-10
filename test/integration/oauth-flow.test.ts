/**
 * Integration Tests for OAuth Routes
 *
 * These tests verify OAuth route handling using SELF fetcher
 * to test the complete request/response cycle through the Worker.
 */
import { SELF, env } from "cloudflare:test";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";

// Extend ProvidedEnv type to include OAUTH_KV
declare module "cloudflare:test" {
	interface ProvidedEnv {
		OAUTH_KV: {
			put: (
				key: string,
				value: string,
				options?: { expirationTtl?: number },
			) => Promise<void>;
			get: (key: string) => Promise<string | null>;
			delete?: (key: string) => Promise<void>;
		};
	}
}
// Mock Globalping OAuth token and user data endpoints
const createMockOAuthAPI = () => {
	const originalFetch = globalThis.fetch;
	let pendingRequests = 0;
	let idleResolvers: Array<() => void> = [];

	const mockFetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
		pendingRequests++;
		try {
			const urlString =
				typeof input === "string"
					? input
					: input instanceof URL
						? input.toString()
						: input.url;
			const method = init?.method || (input instanceof Request ? input.method : "GET");

			// Mock Globalping OAuth token endpoint
			if (
				urlString.includes("auth.globalping.io/oauth/token") &&
				!urlString.includes("/introspect")
			) {
				if (method === "POST") {
					return new Response(
						JSON.stringify({
							access_token: "gp_test_access_token_123",
							refresh_token: "gp_test_refresh_token_456",
							token_type: "Bearer",
							expires_in: 3600,
							scope: "measurements",
						}),
						{
							status: 200,
							headers: { "Content-Type": "application/json" },
						},
					);
				}
			}

			// Mock Globalping OAuth token introspection endpoint (user data)
			if (urlString.includes("auth.globalping.io/oauth/token/introspect")) {
				if (method === "POST") {
					return new Response(
						JSON.stringify({
							username: "test_user_oauth",
							active: true,
						}),
						{
							status: 200,
							headers: { "Content-Type": "application/json" },
						},
					);
				}
			}

			return originalFetch(input, init);
		} finally {
			pendingRequests--;
			if (pendingRequests === 0) {
				for (const idleResolver of idleResolvers) {
					idleResolver();
				}
				idleResolvers = [];
			}
		}
	});

	const waitForIdle = () => {
		if (pendingRequests === 0) {
			return Promise.resolve();
		}
		return new Promise<void>((resolve) => {
			idleResolvers.push(resolve);
		});
	};

	return { mockFetch, originalFetch, waitForIdle };
};

describe("OAuth Routes Integration", () => {
	let mockAPI: ReturnType<typeof createMockOAuthAPI>;

	beforeEach(() => {
		mockAPI = createMockOAuthAPI();
		globalThis.fetch = mockAPI.mockFetch as any;
	});

	afterEach(async () => {
		// Wait for all pending fetch operations to complete
		if (mockAPI) {
			await mockAPI.waitForIdle();
			globalThis.fetch = mockAPI.originalFetch;
		}
	});

	describe("Root Route", () => {
		it("should redirect to GitHub repository", async () => {
			const response = await SELF.fetch("http://localhost/", {
				method: "GET",
				redirect: "manual",
			});

			expect(response.status).toBe(302);
			expect(response.headers.get("Location")).toBe(
				"https://github.com/jsdelivr/globalping-mcp-server",
			);
		});
	});

	describe("Authorization Endpoint", () => {
		it("should validate and reject missing OAuth request parameters", async () => {
			const response = await SELF.fetch("http://localhost/authorize", { method: "GET" });

			expect(response.status).toBe(200);
			const html = await response.text();
			// OAuth provider may return either error based on validation order
			expect(html).toMatch(/Invalid request|Invalid redirect URI/);
		});

		it("should reject invalid redirect URI", async () => {
			const response = await SELF.fetch(
				"http://localhost/authorize?client_id=test&redirect_uri=https://evil.com&response_type=code&state=test",
				{ method: "GET" },
			);

			expect(response.status).toBe(200);
			const html = await response.text();
			expect(html).toMatch(/Invalid request|Invalid redirect URI/);
		});
	});

	describe("OAuth Callback - Error Paths", () => {
		it("should handle missing code and state parameters", async () => {
			const response = await SELF.fetch("http://localhost/auth/callback", { method: "GET" });

			expect(response.status).toBe(200);
			const html = await response.text();
			expect(html).toContain("Code and state are missing");
		});

		it("should handle expired or invalid state", async () => {
			const response = await SELF.fetch(
				"http://localhost/auth/callback?code=test-code&state=invalid-state-xyz",
				{ method: "GET" },
			);

			expect(response.status).toBe(200);
			const html = await response.text();
			expect(html).toContain("State is outdated");
		});

		it("should handle OAuth provider errors", async () => {
			const response = await SELF.fetch(
				"http://localhost/auth/callback?error=access_denied&error_description=User+denied+access",
				{ method: "GET" },
			);

			expect(response.status).toBe(200);
			const html = await response.text();
			expect(html).toContain("Authentication error");
			expect(html).toContain("access_denied");
		});

		it("should handle different OAuth error types", async () => {
			const errorTypes = [
				{ error: "invalid_request", description: "Missing required parameter" },
				{ error: "invalid_scope", description: "Invalid scope requested" },
				{ error: "server_error", description: "OAuth server error" },
				{
					error: "temporarily_unavailable",
					description: "Service temporarily unavailable",
				},
			];

			for (const { error, description } of errorTypes) {
				const response = await SELF.fetch(
					`http://localhost/auth/callback?error=${error}&error_description=${encodeURIComponent(description)}`,
					{ method: "GET" },
				);

				expect(response.status).toBe(200);
				const html = await response.text();
				expect(html).toContain("Authentication error");
				expect(html).toContain(error);
			}
		});
	});

	describe("OAuth Callback - Success Paths", () => {
		it("should successfully complete OAuth flow with valid code and state", async () => {
			// First, we need to create a valid state in KV by simulating the authorize flow
			const testState = "test-oauth-state-123";
			const testCode = "test-auth-code-456";

			// Store state data in KV that the callback will retrieve
			const stateData = {
				redirectUri: "http://localhost/auth/callback",
				clientRedirectUri: "http://localhost:3000/callback",
				codeVerifier: "test-verifier-123",
				codeChallenge: "test-challenge-456",
				clientId: "test-mcp-client",
				state: testState,
				oauthReqInfo: {
					clientId: "test-mcp-client",
					redirectUri: "http://localhost:3000/callback",
					state: "client-state-789",
					scope: "measurements",
				},
				createdAt: Date.now(),
			};

			await env.OAUTH_KV.put(`oauth_state_${testState}`, JSON.stringify(stateData), {
				expirationTtl: 600,
			});

			// Now call the callback with valid code and state
			const response = await SELF.fetch(
				`http://localhost/auth/callback?code=${testCode}&state=${testState}`,
				{ method: "GET", redirect: "manual" },
			);

			// Should redirect to the client's redirect URI with authorization code
			expect(response.status).toBe(302);
			const location = response.headers.get("Location");
			expect(location).toBeTruthy();
			expect(location).toContain("http://localhost:3000/callback");
			expect(location).toContain("code=");

			// Verify token exchange was attempted
			expect(mockAPI.mockFetch).toHaveBeenCalledWith(
				expect.stringContaining("auth.globalping.io/oauth/token"),
				expect.objectContaining({
					method: "POST",
				}),
			);

			// Verify user data was fetched
			expect(mockAPI.mockFetch).toHaveBeenCalledWith(
				expect.stringContaining("auth.globalping.io/oauth/token/introspect"),
				expect.objectContaining({
					method: "POST",
				}),
			);

			// Verify state was deleted from KV
			const deletedState = await env.OAUTH_KV.get(`oauth_state_${testState}`);
			expect(deletedState).toBeNull();
		});

		it("should handle token exchange errors gracefully", async () => {
			// Override mock to return error for token exchange
			const errorMockFetch = vi.fn(
				async (input: string | URL | Request, init?: RequestInit) => {
					const urlString =
						typeof input === "string"
							? input
							: input instanceof URL
								? input.toString()
								: input.url;

					if (
						urlString.includes("auth.globalping.io/oauth/token") &&
						!urlString.includes("/introspect")
					) {
						return new Response(JSON.stringify({ error: "invalid_grant" }), {
							status: 400,
							headers: { "Content-Type": "application/json" },
						});
					}

					return mockAPI.originalFetch(input, init);
				},
			);

			globalThis.fetch = errorMockFetch as any;

			const testState = "test-token-error-state";
			const stateData = {
				redirectUri: "http://localhost/auth/callback",
				clientRedirectUri: "http://localhost:3000/callback",
				codeVerifier: "test-verifier",
				codeChallenge: "test-challenge",
				clientId: "test-client",
				state: testState,
				oauthReqInfo: {
					clientId: "test-client",
					redirectUri: "http://localhost:3000/callback",
					state: "client-state",
					scope: "measurements",
				},
				createdAt: Date.now(),
			};

			await env.OAUTH_KV.put(`oauth_state_${testState}`, JSON.stringify(stateData), {
				expirationTtl: 600,
			});

			const response = await SELF.fetch(
				`http://localhost/auth/callback?code=test-code&state=${testState}`,
				{ method: "GET" },
			);

			expect(response.status).toBe(200);
			const html = await response.text();
			expect(html).toContain("Token error");
		});

		it("should handle user data retrieval errors gracefully", async () => {
			// Override mock to return error for user data introspection
			const errorMockFetch = vi.fn(
				async (input: string | URL | Request, init?: RequestInit) => {
					const urlString =
						typeof input === "string"
							? input
							: input instanceof URL
								? input.toString()
								: input.url;

					if (
						urlString.includes("auth.globalping.io/oauth/token") &&
						!urlString.includes("/introspect")
					) {
						return new Response(
							JSON.stringify({
								access_token: "test-token",
								token_type: "Bearer",
								expires_in: 3600,
							}),
							{
								status: 200,
								headers: { "Content-Type": "application/json" },
							},
						);
					}

					if (urlString.includes("/introspect")) {
						return new Response(JSON.stringify({ error: "invalid_token" }), {
							status: 401,
							headers: { "Content-Type": "application/json" },
						});
					}

					return mockAPI.originalFetch(input, init);
				},
			);

			globalThis.fetch = errorMockFetch as any;

			const testState = "test-userdata-error-state";
			const stateData = {
				redirectUri: "http://localhost/auth/callback",
				clientRedirectUri: "http://localhost:3000/callback",
				codeVerifier: "test-verifier",
				codeChallenge: "test-challenge",
				clientId: "test-client",
				state: testState,
				oauthReqInfo: {
					clientId: "test-client",
					redirectUri: "http://localhost:3000/callback",
					state: "client-state",
					scope: "measurements",
				},
				createdAt: Date.now(),
			};

			await env.OAUTH_KV.put(`oauth_state_${testState}`, JSON.stringify(stateData), {
				expirationTtl: 600,
			});

			const response = await SELF.fetch(
				`http://localhost/auth/callback?code=test-code&state=${testState}`,
				{ method: "GET" },
			);

			expect(response.status).toBe(200);
			const html = await response.text();
			expect(html).toContain("Failed to get user data");
		});
	});

	describe("Error Response Format", () => {
		it("should return HTML error pages with proper structure", async () => {
			const response = await SELF.fetch("http://localhost/auth/callback", { method: "GET" });

			expect(response.status).toBe(200);
			expect(response.headers.get("Content-Type")).toContain("text/html");

			const html = await response.text();
			expect(html).toContain("<!DOCTYPE html>");
			expect(html).toContain("<html");
			expect(html).toContain("</html>");
			expect(html).toContain("Globalping MCP Server");
		});

		it("should include error message in response body", async () => {
			const response = await SELF.fetch("http://localhost/auth/callback?error=custom_error", {
				method: "GET",
			});

			const html = await response.text();
			expect(html).toContain("custom_error");
			expect(html).toContain("Authentication error");
		});
	});
});
