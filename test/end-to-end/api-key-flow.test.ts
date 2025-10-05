/**
 * End-to-End Tests for API Key Authentication Flow
 *
 * Tests API key validation and security checks
 */
import { describe, it, expect } from "vitest";
import { isAPITokenRequest, isValidAPIToken, sanitizeToken } from "../../src/auth";

describe("API Key Authentication - Token Validation", () => {
	it("should validate correct API token format (32 alphanumeric characters)", () => {
		const validTokens = [
			"abcdefghijklmnopqrstuvwxyz123456",
			"12345678901234567890123456789012",
			"ABCDEFGHIJKLMNOPQRSTUVWXYZ123456",
			"aBcDeFgHiJkLmNoPqRsTuVwXyZ123456",
		];

		for (const token of validTokens) {
			expect(isValidAPIToken(token)).toBe(true);
		}
	});

	it("should reject invalid API token formats", () => {
		const invalidTokens = [
			"", // Empty
			"short", // Too short
			"toolongabcdefghijklmnopqrstuvwxyz123456", // Too long
			"contains-special-chars-!!@#$%^&*()", // Special characters
			"has spaces in the middle of token", // Spaces
			"token:with:colons:oauth:format:123", // OAuth format (3+ parts with colons)
		];

		for (const token of invalidTokens) {
			expect(isValidAPIToken(token)).toBe(false);
		}
	});

	it("should distinguish between OAuth tokens and API tokens", () => {
		const oauthToken = "part1:part2:part3"; // OAuth token format (3 parts)
		const apiToken = "abcdefghijklmnopqrstuvwxyz123456"; // API token format

		expect(isValidAPIToken(oauthToken)).toBe(false);
		expect(isValidAPIToken(apiToken)).toBe(true);
	});

	it("should handle Bearer prefix in token validation", () => {
		const token = "abcdefghijklmnopqrstuvwxyz123456";
		const tokenWithBearer = `Bearer ${token}`;

		expect(isValidAPIToken(token)).toBe(true);
		expect(isValidAPIToken(tokenWithBearer)).toBe(true);
	});
});

describe("API Key Authentication - Request Authentication", () => {
	it("should detect valid API token in Authorization header", async () => {
		const token = "abcdefghijklmnopqrstuvwxyz123456";
		const request = new Request("http://localhost:3000/api", {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		const isApiToken = await isAPITokenRequest(request);
		expect(isApiToken).toBe(true);
	});

	it("should reject requests without Authorization header", async () => {
		const request = new Request("http://localhost:3000/api");

		const isApiToken = await isAPITokenRequest(request);
		expect(isApiToken).toBe(false);
	});

	it("should reject requests with invalid Authorization type", async () => {
		const testCases = [
			{ type: "Basic", token: "dXNlcjpwYXNz" },
			{ type: "Digest", token: "username=..." },
			{ type: "Token", token: "abc123" },
		];

		for (const { type, token } of testCases) {
			const request = new Request("http://localhost:3000/api", {
				headers: {
					Authorization: `${type} ${token}`,
				},
			});

			const isApiToken = await isAPITokenRequest(request);
			expect(isApiToken).toBe(false);
		}
	});

	it("should reject requests with missing token value", async () => {
		const request = new Request("http://localhost:3000/api", {
			headers: {
				Authorization: "Bearer",
			},
		});

		const isApiToken = await isAPITokenRequest(request);
		expect(isApiToken).toBe(false);
	});

	it("should reject OAuth tokens in API key flow", async () => {
		const oauthToken = "part1:part2:part3";
		const request = new Request("http://localhost:3000/api", {
			headers: {
				Authorization: `Bearer ${oauthToken}`,
			},
		});

		const isApiToken = await isAPITokenRequest(request);
		expect(isApiToken).toBe(false);
	});

	it("should handle case-sensitive Bearer prefix", async () => {
		const token = "abcdefghijklmnopqrstuvwxyz123456";
		const testCases = [
			{ prefix: "Bearer", expected: true },
			{ prefix: "bearer", expected: false },
			{ prefix: "BEARER", expected: false },
			{ prefix: "BeArEr", expected: false },
		];

		for (const { prefix, expected } of testCases) {
			const request = new Request("http://localhost:3000/api", {
				headers: { Authorization: `${prefix} ${token}` },
			});

			const isApiToken = await isAPITokenRequest(request);
			expect(isApiToken).toBe(expected);
		}
	});
});

describe("API Key Authentication - Token Sanitization", () => {
	it("should add Bearer prefix to tokens without it", () => {
		const token = "abcdefghijklmnopqrstuvwxyz123456";
		const sanitized = sanitizeToken(token);

		expect(sanitized).toBe(`Bearer ${token}`);
	});

	it("should preserve Bearer prefix if already present", () => {
		const token = "Bearer abcdefghijklmnopqrstuvwxyz123456";
		const sanitized = sanitizeToken(token);

		expect(sanitized).toBe(token);
	});

	it("should handle empty or whitespace tokens", () => {
		const testCases = ["", "   ", "\t", "\n"];

		for (const token of testCases) {
			const sanitized = sanitizeToken(token);
			expect(sanitized).toBe("");
		}
	});

	it("should trim whitespace from tokens", () => {
		const token = "  abcdefghijklmnopqrstuvwxyz123456  ";
		const sanitized = sanitizeToken(token);

		expect(sanitized).toBe("Bearer abcdefghijklmnopqrstuvwxyz123456");
	});

	it("should handle undefined tokens", () => {
		const sanitized = sanitizeToken(undefined);
		expect(sanitized).toBe("");
	});
});

describe("API Key Authentication - Security Validation", () => {
	it("should reject tokens with SQL injection attempts", () => {
		const maliciousTokens = [
			"'; DROP TABLE users; --",
			"' OR '1'='1",
			"admin'--",
			"' UNION SELECT * FROM tokens --",
		];

		for (const token of maliciousTokens) {
			expect(isValidAPIToken(token)).toBe(false);
		}
	});

	it("should reject tokens with XSS attempts", () => {
		const maliciousTokens = [
			"<script>alert('xss')</script>",
			"javascript:alert(1)",
			"<img src=x onerror=alert(1)>",
		];

		for (const token of maliciousTokens) {
			expect(isValidAPIToken(token)).toBe(false);
		}
	});

	it("should reject tokens with path traversal attempts", () => {
		const maliciousTokens = [
			"../../../etc/passwd",
			"..\\..\\..\\windows\\system32",
			"%2e%2e%2f%2e%2e%2f",
		];

		for (const token of maliciousTokens) {
			expect(isValidAPIToken(token)).toBe(false);
		}
	});

	it("should handle extremely long tokens gracefully", () => {
		const longToken = "a".repeat(10000);
		expect(isValidAPIToken(longToken)).toBe(false);
	});

	it("should handle unicode and special encoding", () => {
		const specialTokens = [
			"token\u0000with\u0000nulls",
			"token\nwith\nnewlines",
			"token\twith\ttabs",
			"token\rwith\rcarriage",
			"🔑🔐🗝️💎✨🎯🚀🔥💯🎉", // Emojis
		];

		for (const token of specialTokens) {
			expect(isValidAPIToken(token)).toBe(false);
		}
	});
});
