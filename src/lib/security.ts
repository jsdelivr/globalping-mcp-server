/**
 * Security utilities for the Globalping MCP server
 * Includes Origin header validation to prevent DNS rebinding attacks
 */

import { CORS_CONFIG } from "../config";

/**
 * Validate Origin header against whitelist to prevent DNS rebinding attacks
 * Required by MCP specification for Streamable HTTP transport
 * @see https://modelcontextprotocol.io/specification/2025-03-26/basic/transports
 *
 * This implements DNS rebinding protection by:
 * 1. Requiring an Origin header to be present for validation
 * 2. Only allowing explicitly whitelisted origins
 * 3. Supporting localhost with various port numbers for development
 *
 * Note: This validation is applied when an Origin header IS present.
 * Requests without an Origin header (e.g., from non-browser MCP clients
 * like Claude Desktop) are handled by the caller's logic.
 *
 * @param origin - The Origin header value from the request
 * @returns true if the origin is valid and allowed, false otherwise
 *
 * @example
 * validateOrigin("https://mcp.globalping.io") // true
 * validateOrigin("http://localhost:3000") // true
 * validateOrigin("https://malicious-site.com") // false
 * validateOrigin(null) // false
 */
export function validateOrigin(origin: string | null): boolean {
	if (!origin) {
		return false;
	}

	// Check if origin exactly matches any allowed origin
	if (CORS_CONFIG.ALLOWED_ORIGINS.includes(origin)) {
		return true;
	}

	// For localhost/127.0.0.1, also check with port numbers
	try {
		const originUrl = new URL(origin);
		const baseOrigin = `${originUrl.protocol}//${originUrl.hostname}`;

		if (CORS_CONFIG.ALLOWED_ORIGINS.includes(baseOrigin)) {
			return true;
		}
	} catch {
		// Invalid origin URL
		return false;
	}

	return false;
}

/**
 * Get CORS options with Origin validation configuration
 * These options are passed to the MCP transport layer
 *
 * @returns CORS configuration object for the MCP transport
 *
 * @remarks
 * The Mcp-Session-Id header must be exposed for browser-based clients
 * to access it, as required by the MCP streamable HTTP transport spec
 */
export function getCorsOptions() {
	return {
		origin: CORS_CONFIG.ALLOWED_ORIGINS.join(","),
		methods: CORS_CONFIG.METHODS,
		headers: CORS_CONFIG.HEADERS,
		exposeHeaders: CORS_CONFIG.EXPOSE_HEADERS,
		maxAge: CORS_CONFIG.MAX_AGE,
	};
}
