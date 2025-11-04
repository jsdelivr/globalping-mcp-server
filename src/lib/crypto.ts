/**
 * Cryptographic utilities for PKCE and random string generation
 */
import { PKCE_CONFIG, RANDOM_STRING_CONFIG } from "../config";
import type { PKCECodePair } from "../types";

/**
 * Generate a random string for PKCE and state
 * @param length Length of the random string
 * @returns A URL-safe random string
 */
export function generateRandomString(length: number): string {
	const array = new Uint8Array(length);
	crypto.getRandomValues(array);
	return Array.from(array)
		.map((b) =>
			b
				.toString(RANDOM_STRING_CONFIG.HEX_RADIX)
				.padStart(RANDOM_STRING_CONFIG.PAD_LENGTH, RANDOM_STRING_CONFIG.PAD_CHAR),
		)
		.join("")
		.substring(0, length);
}

/**
 * Create a code verifier and code challenge pair for PKCE
 * @returns A code verifier and challenge pair
 */
export async function createPKCECodes(): Promise<PKCECodePair> {
	// Generate code verifier (random string between 43-128 chars)
	const codeVerifier = generateRandomString(PKCE_CONFIG.CODE_VERIFIER_LENGTH);

	// Create code challenge using SHA-256
	const encoder = new TextEncoder();
	const data = encoder.encode(codeVerifier);
	const digest = await crypto.subtle.digest(PKCE_CONFIG.HASH_ALGORITHM, data);

	// Convert digest to base64url format
	const base64Digest = btoa(String.fromCharCode(...new Uint8Array(digest)))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, "");

	return {
		codeVerifier,
		codeChallenge: base64Digest,
	};
}
