/**
 * Tests for lib/crypto.ts
 */
import { describe, it, expect } from "vitest";
import { generateRandomString, createPKCECodes } from "../../../src/lib/crypto";

describe("generateRandomString", () => {
	it("should generate string of requested length", () => {
		const result = generateRandomString(32);
		expect(result).toHaveLength(32);
	});

	it("should generate string of different lengths", () => {
		expect(generateRandomString(10)).toHaveLength(10);
		expect(generateRandomString(64)).toHaveLength(64);
		expect(generateRandomString(128)).toHaveLength(128);
	});

	it("should generate different strings on each call", () => {
		const result1 = generateRandomString(32);
		const result2 = generateRandomString(32);
		expect(result1).not.toBe(result2);
	});

	it("should only contain hexadecimal characters", () => {
		const result = generateRandomString(100);
		const hexRegex = /^[0-9a-f]+$/;
		expect(hexRegex.test(result)).toBe(true);
	});

	it("should handle length of 1", () => {
		const result = generateRandomString(1);
		expect(result).toHaveLength(1);
	});

	it("should handle large lengths", () => {
		const result = generateRandomString(1000);
		expect(result).toHaveLength(1000);
	});

	it("should generate unique strings for multiple calls", () => {
		const results = new Set();
		for (let i = 0; i < 10; i++) {
			results.add(generateRandomString(32));
		}
		// All 10 should be unique
		expect(results.size).toBe(10);
	});
});

describe("createPKCECodes", () => {
	it("should return an object with codeVerifier and codeChallenge", async () => {
		const result = await createPKCECodes();
		expect(result).toHaveProperty("codeVerifier");
		expect(result).toHaveProperty("codeChallenge");
	});

	it("should generate codeVerifier of length 64", async () => {
		const result = await createPKCECodes();
		expect(result.codeVerifier).toHaveLength(64);
	});

	it("should generate codeChallenge as base64url string", async () => {
		const result = await createPKCECodes();
		// Base64url should only contain alphanumeric, -, and _
		const base64urlRegex = /^[A-Za-z0-9\-_]+$/;
		expect(base64urlRegex.test(result.codeChallenge)).toBe(true);
	});

	it("should generate different codes on each call", async () => {
		const result1 = await createPKCECodes();
		const result2 = await createPKCECodes();

		expect(result1.codeVerifier).not.toBe(result2.codeVerifier);
		expect(result1.codeChallenge).not.toBe(result2.codeChallenge);
	});

	it("should generate codeChallenge without padding (no = signs)", async () => {
		const result = await createPKCECodes();
		expect(result.codeChallenge).not.toContain("=");
	});

	it("should generate codeChallenge with expected length", async () => {
		const result = await createPKCECodes();
		// SHA-256 hash in base64url format should be 43 characters
		expect(result.codeChallenge).toHaveLength(43);
	});

	it("should generate multiple unique PKCE pairs", async () => {
		const pairs = await Promise.all([
			createPKCECodes(),
			createPKCECodes(),
			createPKCECodes(),
			createPKCECodes(),
			createPKCECodes(),
		]);

		const verifiers = new Set(pairs.map((p) => p.codeVerifier));
		const challenges = new Set(pairs.map((p) => p.codeChallenge));

		// All should be unique
		expect(verifiers.size).toBe(5);
		expect(challenges.size).toBe(5);
	});

	it("should generate deterministic codeChallenge from same codeVerifier", async () => {
		// This test verifies the SHA-256 hashing is deterministic
		const result1 = await createPKCECodes();

		// Manually compute the challenge from the verifier
		const encoder = new TextEncoder();
		const data = encoder.encode(result1.codeVerifier);
		const digest = await crypto.subtle.digest("SHA-256", data);
		const manualChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=/g, "");

		expect(result1.codeChallenge).toBe(manualChallenge);
	});

	it("should only use hexadecimal characters in codeVerifier", async () => {
		const result = await createPKCECodes();
		const hexRegex = /^[0-9a-f]+$/;
		expect(hexRegex.test(result.codeVerifier)).toBe(true);
	});
});
