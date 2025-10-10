/**
 * Token management utilities
 * Centralized token sanitization and validation
 */
import { TOKEN_CONFIG } from "../config";

/**
 * Sanitize a token by removing the Bearer prefix if present
 * @param token The token to sanitize
 * @returns Token without Bearer prefix
 */
export function sanitizeToken(token: string | undefined): string {
	if (!token || token.trim() === "") {
		return "";
	}

	const trimmed = token.trim();
	if (trimmed.startsWith(TOKEN_CONFIG.BEARER_PREFIX)) {
		return trimmed.substring(TOKEN_CONFIG.BEARER_PREFIX.length);
	}

	return trimmed;
}

/**
 * Extract the token value without Bearer prefix
 * @param token The token to extract from
 * @returns Token value without prefix
 */
export function extractTokenValue(token: string): string {
	if (token.startsWith(TOKEN_CONFIG.BEARER_PREFIX)) {
		return token.substring(TOKEN_CONFIG.BEARER_PREFIX.length).trim();
	}
	return token.trim();
}

/**
 * Check if a token is an OAuth token (3-part format)
 * @param token The token to check
 * @returns True if OAuth token
 */
export function isOAuthToken(token: string): boolean {
	const tokenValue = extractTokenValue(token);
	const parts = tokenValue.split(":");
	return parts.length === TOKEN_CONFIG.OAUTH_TOKEN_PARTS;
}

/**
 * Check if a token is a valid API token (32 alphanumeric characters)
 * @param token The token to validate
 * @returns True if valid API token
 */
export function isValidAPIToken(token: string): boolean {
	const tokenValue = extractTokenValue(token);

	// Check if it's an OAuth token (not an API token)
	if (isOAuthToken(tokenValue)) {
		return false;
	}

	// Validate API token format
	return TOKEN_CONFIG.API_TOKEN_REGEX.test(tokenValue);
}

/**
 * Check if a request contains a valid API token
 * @param req The request to check
 * @returns True if request has valid API token
 */
export async function isAPITokenRequest(req: Request): Promise<boolean> {
	const authHeader = req.headers.get("Authorization");
	if (!authHeader) return false;

	const [type, token] = authHeader.split(" ");
	if (type.toLowerCase() !== "bearer") return false;

	if (!token) return false;

	return isValidAPIToken(token);
}

/**
 * Get a masked version of the token for logging
 * @param token The token to mask
 * @returns Masked token string
 */
export function maskToken(token: string): string {
	const tokenValue = extractTokenValue(token);
	if (tokenValue.length < 15) {
		return "***";
	}
	return `${tokenValue.substring(7, 15)}...`;
}
