/**
 * Tests for lib/form-parser.ts
 */
import { describe, it, expect } from "vitest";
import { parseApproveFormBody } from "../../src/lib/form-parser";
import type { AuthRequest } from "@cloudflare/workers-oauth-provider";

describe("parseApproveFormBody", () => {
	it("should parse valid form body with all fields", async () => {
		const oauthReqInfo: AuthRequest = {
			clientId: "test-client",
			redirectUri: "https://example.com/callback",
			scope: "read write",
			state: "random-state",
			codeChallenge: "challenge",
			codeChallengeMethod: "S256",
		};

		const body = {
			action: "approve",
			email: "test@example.com",
			password: "password123",
			oauthReqInfo: JSON.stringify(oauthReqInfo),
		};

		const result = await parseApproveFormBody(body);

		expect(result.action).toBe("approve");
		expect(result.email).toBe("test@example.com");
		expect(result.password).toBe("password123");
		expect(result.oauthReqInfo).toEqual(oauthReqInfo);
	});

	it("should handle deny action", async () => {
		const body = {
			action: "deny",
			email: "test@example.com",
			password: "password123",
			oauthReqInfo: "{}",
		};

		const result = await parseApproveFormBody(body);

		expect(result.action).toBe("deny");
	});

	it("should return null oauthReqInfo for invalid JSON", async () => {
		const body = {
			action: "approve",
			email: "test@example.com",
			password: "password123",
			oauthReqInfo: "invalid json {",
		};

		const result = await parseApproveFormBody(body);

		expect(result.oauthReqInfo).toBeNull();
	});

	it("should return null oauthReqInfo for empty string", async () => {
		const body = {
			action: "approve",
			email: "test@example.com",
			password: "password123",
			oauthReqInfo: "",
		};

		const result = await parseApproveFormBody(body);

		expect(result.oauthReqInfo).toBeNull();
	});

	it("should handle empty email and password", async () => {
		const body = {
			action: "approve",
			email: "",
			password: "",
			oauthReqInfo: "{}",
		};

		const result = await parseApproveFormBody(body);

		expect(result.email).toBe("");
		expect(result.password).toBe("");
	});

	it("should handle File objects in body", async () => {
		const file = new File(["content"], "test.txt", { type: "text/plain" });
		const body = {
			action: "approve",
			email: "test@example.com",
			password: "password123",
			oauthReqInfo: "{}",
			file: file,
		};

		const result = await parseApproveFormBody(body);

		expect(result.action).toBe("approve");
		expect(result.email).toBe("test@example.com");
	});

	it("should parse complex oauthReqInfo", async () => {
		const complexOAuth: AuthRequest = {
			clientId: "complex-client-id-123",
			redirectUri: "https://app.example.com/oauth/callback?param=value",
			scope: "read write delete admin",
			state: "very-long-random-state-string-12345",
			codeChallenge: "complex-code-challenge-base64-encoded",
			codeChallengeMethod: "S256",
		};

		const body = {
			action: "approve",
			email: "complex.user@example.com",
			password: "VerySecurePassword123!@#",
			oauthReqInfo: JSON.stringify(complexOAuth),
		};

		const result = await parseApproveFormBody(body);

		expect(result.oauthReqInfo).toEqual(complexOAuth);
		expect(result.oauthReqInfo?.clientId).toBe("complex-client-id-123");
		expect(result.oauthReqInfo?.scope).toBe("read write delete admin");
	});

	it("should handle missing oauthReqInfo field", async () => {
		const body = {
			action: "approve",
			email: "test@example.com",
			password: "password123",
		} as any;

		const result = await parseApproveFormBody(body);

		expect(result.oauthReqInfo).toBeNull();
	});

	it("should handle special characters in email", async () => {
		const body = {
			action: "approve",
			email: "test+tag@example.co.uk",
			password: "password123",
			oauthReqInfo: "{}",
		};

		const result = await parseApproveFormBody(body);

		expect(result.email).toBe("test+tag@example.co.uk");
	});

	it("should handle special characters in password", async () => {
		const body = {
			action: "approve",
			email: "test@example.com",
			password: "p@ssw0rd!#$%^&*()",
			oauthReqInfo: "{}",
		};

		const result = await parseApproveFormBody(body);

		expect(result.password).toBe("p@ssw0rd!#$%^&*()");
	});

	it("should parse minimal valid AuthRequest", async () => {
		const minimalOAuth: AuthRequest = {
			clientId: "client",
			redirectUri: "https://example.com",
			scope: "read",
			state: "state",
			codeChallenge: "challenge",
			codeChallengeMethod: "S256",
		};

		const body = {
			action: "approve",
			email: "a@b.c",
			password: "p",
			oauthReqInfo: JSON.stringify(minimalOAuth),
		};

		const result = await parseApproveFormBody(body);

		expect(result.oauthReqInfo).toEqual(minimalOAuth);
	});

	it("should handle whitespace in action field", async () => {
		const body = {
			action: "  approve  ",
			email: "test@example.com",
			password: "password123",
			oauthReqInfo: "{}",
		};

		const result = await parseApproveFormBody(body);

		// Note: The function doesn't trim, so it preserves whitespace
		expect(result.action).toBe("  approve  ");
	});

	it("should parse oauthReqInfo with nested objects", async () => {
		const nestedOAuth = {
			clientId: "client",
			redirectUri: "https://example.com",
			scope: "read",
			state: "state",
			codeChallenge: "challenge",
			codeChallengeMethod: "S256",
			metadata: {
				nested: {
					value: "test",
				},
			},
		};

		const body = {
			action: "approve",
			email: "test@example.com",
			password: "password123",
			oauthReqInfo: JSON.stringify(nestedOAuth),
		};

		const result = await parseApproveFormBody(body);

		expect(result.oauthReqInfo).toEqual(nestedOAuth);
	});
});
