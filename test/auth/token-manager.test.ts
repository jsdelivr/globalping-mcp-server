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
} from "../../src/auth/token-manager";

describe("sanitizeToken", () => {
	it("should add Bearer prefix to token without prefix", () => {
		const result = sanitizeToken("abc123token");
		expect(result).toBe("Bearer abc123token");
	});

	it("should return token as-is if it already has Bearer prefix", () => {
		const result = sanitizeToken("Bearer abc123token");
		expect(result).toBe("Bearer abc123token");
	});

	it("should trim whitespace before processing", () => {
		const result = sanitizeToken("  abc123token  ");
		expect(result).toBe("Bearer abc123token");
	});

	it("should trim whitespace from token with Bearer prefix", () => {
		const result = sanitizeToken("  Bearer abc123token  ");
		expect(result).toBe("Bearer abc123token");
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
	it("should return true for valid 32-character alphanumeric token", () => {
		const validToken = "abcdef1234567890ABCDEF1234567890";
		const result = isValidAPIToken(validToken);
		expect(result).toBe(true);
	});

	it("should return true for valid token with Bearer prefix", () => {
		const validToken = "Bearer abcdef1234567890ABCDEF1234567890";
		const result = isValidAPIToken(validToken);
		expect(result).toBe(true);
	});

	it("should return false for token with special characters", () => {
		const invalidToken = "abcdef1234567890ABCDEF12345678!@";
		const result = isValidAPIToken(invalidToken);
		expect(result).toBe(false);
	});

	it("should return false for token shorter than 32 characters", () => {
		const invalidToken = "abcdef1234567890";
		const result = isValidAPIToken(invalidToken);
		expect(result).toBe(false);
	});

	it("should return false for token longer than 32 characters", () => {
		const invalidToken = "abcdef1234567890ABCDEF1234567890EXTRA";
		const result = isValidAPIToken(invalidToken);
		expect(result).toBe(false);
	});

	it("should return false for OAuth token (3-part)", () => {
		const oauthToken = "part1:part2:part3";
		const result = isValidAPIToken(oauthToken);
		expect(result).toBe(false);
	});

	it("should return false for token with spaces", () => {
		const invalidToken = "abcdef1234567890 BCDEF1234567890";
		const result = isValidAPIToken(invalidToken);
		expect(result).toBe(false);
	});

	it("should return false for token with hyphens", () => {
		const invalidToken = "abcdef1234567890-BCDEF1234567890";
		const result = isValidAPIToken(invalidToken);
		expect(result).toBe(false);
	});

	it("should return false for empty token", () => {
		const result = isValidAPIToken("");
		expect(result).toBe(false);
	});

	it("should return true for all lowercase 32-char token", () => {
		const validToken = "abcdefghijklmnopqrstuvwxyz123456";
		const result = isValidAPIToken(validToken);
		expect(result).toBe(true);
	});

	it("should return true for all uppercase 32-char token", () => {
		const validToken = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456";
		const result = isValidAPIToken(validToken);
		expect(result).toBe(true);
	});

	it("should return true for all numeric 32-char token", () => {
		const validToken = "12345678901234567890123456789012";
		const result = isValidAPIToken(validToken);
		expect(result).toBe(true);
	});

	it("should return true for mixed case 32-char token", () => {
		const validToken = "AbCdEf1234567890GhIjKl1234567890";
		const result = isValidAPIToken(validToken);
		expect(result).toBe(true);
	});
});

describe("isAPITokenRequest", () => {
	it("should return true for request with valid API token", async () => {
		const validToken = "abcdef1234567890ABCDEF1234567890";
		const req = new Request("https://example.com", {
			headers: {
				Authorization: `Bearer ${validToken}`,
			},
		});

		const result = await isAPITokenRequest(req);
		expect(result).toBe(true);
	});

	it("should return false for request without Authorization header", async () => {
		const req = new Request("https://example.com");
		const result = await isAPITokenRequest(req);
		expect(result).toBe(false);
	});

	it("should return false for request with non-Bearer auth type", async () => {
		const req = new Request("https://example.com", {
			headers: {
				Authorization: "Basic username:password",
			},
		});

		const result = await isAPITokenRequest(req);
		expect(result).toBe(false);
	});

	it("should return false for request with Bearer but no token", async () => {
		const req = new Request("https://example.com", {
			headers: {
				Authorization: "Bearer",
			},
		});

		const result = await isAPITokenRequest(req);
		expect(result).toBe(false);
	});

	it("should return false for request with invalid token (too short)", async () => {
		const req = new Request("https://example.com", {
			headers: {
				Authorization: "Bearer short",
			},
		});

		const result = await isAPITokenRequest(req);
		expect(result).toBe(false);
	});

	it("should return false for request with OAuth token", async () => {
		const req = new Request("https://example.com", {
			headers: {
				Authorization: "Bearer part1:part2:part3",
			},
		});

		const result = await isAPITokenRequest(req);
		expect(result).toBe(false);
	});

	it("should return false for request with token containing special chars", async () => {
		const req = new Request("https://example.com", {
			headers: {
				Authorization: "Bearer abcdef1234567890ABCDEF12345678!@",
			},
		});

		const result = await isAPITokenRequest(req);
		expect(result).toBe(false);
	});

	it("should return true for request with valid token (all lowercase)", async () => {
		const validToken = "abcdefghijklmnopqrstuvwxyz123456";
		const req = new Request("https://example.com", {
			headers: {
				Authorization: `Bearer ${validToken}`,
			},
		});

		const result = await isAPITokenRequest(req);
		expect(result).toBe(true);
	});

	it("should return true for request with valid token (all uppercase)", async () => {
		const validToken = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456";
		const req = new Request("https://example.com", {
			headers: {
				Authorization: `Bearer ${validToken}`,
			},
		});

		const result = await isAPITokenRequest(req);
		expect(result).toBe(true);
	});

	it("should return true for request with valid token (mixed case)", async () => {
		const validToken = "AbCdEfGhIjKlMnOpQrStUvWxYz123456";
		const req = new Request("https://example.com", {
			headers: {
				Authorization: `Bearer ${validToken}`,
			},
		});

		const result = await isAPITokenRequest(req);
		expect(result).toBe(true);
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
