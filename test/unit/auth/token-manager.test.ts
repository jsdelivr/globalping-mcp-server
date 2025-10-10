/**
 * Tests for auth/token-manager.ts
 */
import { describe, it, expect } from "vitest";
import {
	sanitizeToken,
	extractTokenValue,
	isOAuthToken,
	isValidAPIToken,
	isAPITokenRequest,
	maskToken,
} from "../../../src/auth/token-manager";

describe("sanitizeToken", () => {
	it("should return token without Bearer prefix when no prefix present", () => {
		const result = sanitizeToken("abc123token");
		expect(result).toBe("abc123token");
	});

	it("should remove Bearer prefix if present", () => {
		const result = sanitizeToken("Bearer abc123token");
		expect(result).toBe("abc123token");
	});

	it("should trim whitespace before processing", () => {
		const result = sanitizeToken("  abc123token  ");
		expect(result).toBe("abc123token");
	});

	it("should trim whitespace and remove Bearer prefix", () => {
		const result = sanitizeToken("  Bearer abc123token  ");
		expect(result).toBe("abc123token");
	});

	it("should return empty string for undefined token", () => {
		const result = sanitizeToken(undefined);
		expect(result).toBe("");
	});

	it("should return empty string for empty token", () => {
		const result = sanitizeToken("");
		expect(result).toBe("");
	});

	it("should handle token with only whitespace", () => {
		const result = sanitizeToken("   ");
		expect(result).toBe("");
	});
});

describe("extractTokenValue", () => {
	it("should extract token value from Bearer token", () => {
		const result = extractTokenValue("Bearer abc123token");
		expect(result).toBe("abc123token");
	});

	it("should return token as-is if no Bearer prefix", () => {
		const result = extractTokenValue("abc123token");
		expect(result).toBe("abc123token");
	});

	it("should handle empty token after Bearer prefix", () => {
		const result = extractTokenValue("Bearer ");
		expect(result).toBe("");
	});

	it("should handle token with multiple Bearer words", () => {
		const result = extractTokenValue("Bearer Bearer abc");
		expect(result).toBe("Bearer abc");
	});
});

describe("isOAuthToken", () => {
	it("should return true for 3-part OAuth token", () => {
		const result = isOAuthToken("part1:part2:part3");
		expect(result).toBe(true);
	});

	it("should return true for 3-part OAuth token with Bearer prefix", () => {
		const result = isOAuthToken("Bearer part1:part2:part3");
		expect(result).toBe(true);
	});

	it("should return false for 2-part token", () => {
		const result = isOAuthToken("part1:part2");
		expect(result).toBe(false);
	});

	it("should return false for 4-part token", () => {
		const result = isOAuthToken("part1:part2:part3:part4");
		expect(result).toBe(false);
	});

	it("should return false for token without colons", () => {
		const result = isOAuthToken("simpletoken");
		expect(result).toBe(false);
	});

	it("should return false for empty token", () => {
		const result = isOAuthToken("");
		expect(result).toBe(false);
	});
});

describe("isValidAPIToken", () => {
	it("should return true for valid 32-character alphanumeric tokens", () => {
		const validTokens = [
			"abcdef1234567890ABCDEF1234567890",
			"abcdefghijklmnopqrstuvwxyz123456",
			"ABCDEFGHIJKLMNOPQRSTUVWXYZ123456",
			"12345678901234567890123456789012",
			"AbCdEf1234567890GhIjKl1234567890",
		];

		for (const token of validTokens) {
			expect(isValidAPIToken(token)).toBe(true);
		}
	});

	it("should return true for valid token with Bearer prefix", () => {
		const validToken = "Bearer abcdef1234567890ABCDEF1234567890";
		const result = isValidAPIToken(validToken);
		expect(result).toBe(true);
	});

	it("should return false for invalid token formats", () => {
		const invalidTokens = [
			"", // Empty
			"abcdef1234567890", // Too short
			"abcdef1234567890ABCDEF1234567890EXTRA", // Too long
			"abcdef1234567890ABCDEF12345678!@", // Special characters
			"abcdef1234567890 BCDEF1234567890", // Spaces
			"abcdef1234567890-BCDEF1234567890", // Hyphens
			"part1:part2:part3", // OAuth format
		];

		for (const token of invalidTokens) {
			expect(isValidAPIToken(token)).toBe(false);
		}
	});
});

describe("isAPITokenRequest", () => {
	it("should return true for requests with valid API tokens", async () => {
		const validTokens = [
			"abcdef1234567890ABCDEF1234567890",
			"abcdefghijklmnopqrstuvwxyz123456",
			"ABCDEFGHIJKLMNOPQRSTUVWXYZ123456",
			"AbCdEfGhIjKlMnOpQrStUvWxYz123456",
		];

		for (const token of validTokens) {
			const req = new Request("https://example.com", {
				headers: { Authorization: `Bearer ${token}` },
			});
			expect(await isAPITokenRequest(req)).toBe(true);
		}
	});

	it("should return false for requests without Authorization header", async () => {
		const req = new Request("https://example.com");
		const result = await isAPITokenRequest(req);
		expect(result).toBe(false);
	});

	it("should return false for requests with invalid Authorization", async () => {
		const testCases = [
			{ headers: { Authorization: "Basic username:password" } }, // Non-Bearer
			{ headers: { Authorization: "Bearer" } }, // No token
			{ headers: { Authorization: "Bearer short" } }, // Too short
			{ headers: { Authorization: "Bearer part1:part2:part3" } }, // OAuth format
			{ headers: { Authorization: "Bearer abcdef1234567890ABCDEF12345678!@" } }, // Special chars
		];

		for (const testCase of testCases) {
			const req = new Request("https://example.com", testCase);
			expect(await isAPITokenRequest(req)).toBe(false);
		}
	});
});

describe("maskToken", () => {
	it("should mask a long token by showing middle characters", () => {
		const token = "abcdef1234567890ABCDEF1234567890";
		const result = maskToken(token);
		expect(result).toBe("23456789...");
	});

	it("should mask a token with Bearer prefix", () => {
		const token = "Bearer abcdef1234567890ABCDEF1234567890";
		const result = maskToken(token);
		expect(result).toBe("23456789...");
	});

	it("should return *** for short tokens", () => {
		const token = "short";
		const result = maskToken(token);
		expect(result).toBe("***");
	});

	it("should return *** for empty token", () => {
		const token = "";
		const result = maskToken(token);
		expect(result).toBe("***");
	});

	it("should mask exactly 15 character token", () => {
		const token = "123456789012345";
		const result = maskToken(token);
		expect(result).toBe("89012345...");
	});

	it("should mask 14 character token as ***", () => {
		const token = "12345678901234";
		const result = maskToken(token);
		expect(result).toBe("***");
	});

	it("should mask OAuth token", () => {
		const token = "part1:part2:part3withsomemorechars";
		const result = maskToken(token);
		expect(result).toBe("art2:par...");
	});
});

describe("Security Validation", () => {
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

	it("should handle case-sensitive Bearer prefix in requests", async () => {
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
