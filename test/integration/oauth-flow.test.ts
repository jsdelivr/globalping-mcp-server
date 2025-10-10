/**
 * Integration Tests for OAuth Routes
 *
 * These tests verify OAuth route handling using SELF fetcher
 * to test the complete request/response cycle through the Worker.
 */
import { SELF } from "cloudflare:test";
import { describe, it, expect, afterEach } from "vitest";

describe("OAuth Routes Integration", () => {
	afterEach(async () => {
		// Give the Worker a moment to complete any pending operations
		await new Promise(resolve => setTimeout(resolve, 10));
	});

	describe("Root Route", () => {
		it("should redirect to GitHub repository", async () => {
			const response = await SELF.fetch(
				"http://localhost/",
				{ method: "GET", redirect: "manual" }
			);

			expect(response.status).toBe(302);
			expect(response.headers.get("Location")).toBe(
				"https://github.com/jsdelivr/globalping-mcp-server"
			);
		});
	});

	describe("Authorization Endpoint", () => {
		it("should validate and reject missing OAuth request parameters", async () => {
			const response = await SELF.fetch(
				"http://localhost/authorize",
				{ method: "GET" }
			);

			expect(response.status).toBe(200);
			const html = await response.text();
			// OAuth provider may return either error based on validation order
			expect(html).toMatch(/Invalid request|Invalid redirect URI/);
		});

		it("should reject invalid redirect URI", async () => {
			const response = await SELF.fetch(
				"http://localhost/authorize?client_id=test&redirect_uri=https://evil.com&response_type=code&state=test",
				{ method: "GET" }
			);

			expect(response.status).toBe(200);
			const html = await response.text();
			expect(html).toMatch(/Invalid request|Invalid redirect URI/);
		});
	});

	describe("OAuth Callback", () => {
		it("should handle missing code or state parameters", async () => {
			const response = await SELF.fetch(
				"http://localhost/auth/callback",
				{ method: "GET" }
			);

			expect(response.status).toBe(200);
			const html = await response.text();
			expect(html).toContain("Code and state are missing");
		});

		it("should handle missing code parameter", async () => {
			const response = await SELF.fetch(
				"http://localhost/auth/callback?state=test-state",
				{ method: "GET" }
			);

			expect(response.status).toBe(200);
			const html = await response.text();
			expect(html).toContain("Code and state are missing");
		});

		it("should handle missing state parameter", async () => {
			const response = await SELF.fetch(
				"http://localhost/auth/callback?code=test-code",
				{ method: "GET" }
			);

			expect(response.status).toBe(200);
			const html = await response.text();
			expect(html).toContain("Code and state are missing");
		});

		it("should handle expired or invalid state", async () => {
			const response = await SELF.fetch(
				"http://localhost/auth/callback?code=abc&state=invalid-state-xyz",
				{ method: "GET" }
			);

			expect(response.status).toBe(200);
			const html = await response.text();
			expect(html).toContain("State is outdated");
		});

		it("should handle OAuth error parameter", async () => {
			const response = await SELF.fetch(
				"http://localhost/auth/callback?error=access_denied",
				{ method: "GET" }
			);

			expect(response.status).toBe(200);
			const html = await response.text();
			expect(html).toContain("Authentication error");
			expect(html).toContain("access_denied");
		});

		it("should handle OAuth error with description", async () => {
			const response = await SELF.fetch(
				"http://localhost/auth/callback?error=invalid_request&error_description=Missing+required+parameter",
				{ method: "GET" }
			);

			expect(response.status).toBe(200);
			const html = await response.text();
			expect(html).toContain("Authentication error");
			expect(html).toContain("invalid_request");
		});

		it("should handle OAuth error: access_denied", async () => {
			const response = await SELF.fetch(
				"http://localhost/auth/callback?error=access_denied&state=test",
				{ method: "GET" }
			);

			expect(response.status).toBe(200);
			const html = await response.text();
			expect(html).toContain("access_denied");
		});

		it("should handle OAuth error: invalid_scope", async () => {
			const response = await SELF.fetch(
				"http://localhost/auth/callback?error=invalid_scope&state=test",
				{ method: "GET" }
			);

			expect(response.status).toBe(200);
			const html = await response.text();
			expect(html).toContain("invalid_scope");
		});

		it("should handle OAuth error: server_error", async () => {
			const response = await SELF.fetch(
				"http://localhost/auth/callback?error=server_error&state=test",
				{ method: "GET" }
			);

			expect(response.status).toBe(200);
			const html = await response.text();
			expect(html).toContain("server_error");
		});
	});

	describe("Error Response Format", () => {
		it("should return HTML error pages with proper structure", async () => {
			const response = await SELF.fetch(
				"http://localhost/auth/callback",
				{ method: "GET" }
			);

			expect(response.status).toBe(200);
			expect(response.headers.get("Content-Type")).toContain("text/html");

			const html = await response.text();
			expect(html).toContain("<!DOCTYPE html>");
			expect(html).toContain("<html");
			expect(html).toContain("</html>");
		});

		it("should include error message in response body", async () => {
			const response = await SELF.fetch(
				"http://localhost/auth/callback?error=test_error",
				{ method: "GET" }
			);

			const html = await response.text();
			expect(html).toContain("test_error");
		});
	});
});
