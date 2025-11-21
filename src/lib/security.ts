/**
 * Security utilities for the Globalping MCP server
 * Includes Origin and Host header validation to prevent DNS rebinding attacks
 */

import { CORS_CONFIG } from "../config";

/**
 * Extract allowed hostnames from CORS_CONFIG.ALLOWED_ORIGINS
 * Strips scheme, port, and path to get base hostnames
 *
 * @returns Set of allowed hostnames (e.g., "localhost", "127.0.0.1", "mcp.globalping.io")
 */
function getAllowedHostnames(): Set<string> {
	const hostnames = new Set<string>();

	for (const origin of CORS_CONFIG.ALLOWED_ORIGINS) {
		try {
			// Handle protocol schemes like vscode://, claude://
			if (origin.includes("://")) {
				const url = new URL(origin);
				hostnames.add(url.hostname.toLowerCase());
			} else {
				// Handle bare hostnames or protocols without full URLs
				hostnames.add(origin.toLowerCase());
			}
		} catch {
			// If URL parsing fails, treat it as a bare hostname
			hostnames.add(origin.toLowerCase());
		}
	}

	return hostnames;
}

/**
 * Validate Host header to prevent DNS rebinding attacks
 * Required alongside Origin validation for defense-in-depth
 *
 * The Host header specifies the domain name of the server and must match
 * our allowed hostnames to prevent attackers from directing requests
 * through DNS rebinding.
 *
 * @param host - The Host header value from the request
 * @returns true if the host is valid and allowed, false otherwise
 *
 * @example
 * validateHost("mcp.globalping.io") // true
 * validateHost("localhost:3000") // true (port is stripped)
 * validateHost("[::1]:3000") // true (becomes [::1])
 * validateHost("evil-attacker.com") // false
 * validateHost(null) // false
 */
export function validateHost(host: string | null): boolean {
	if (!host) {
		return false;
	}

	let normalizedHost: string;

	// Detect IPv6 addresses (start with '[')
	if (host.startsWith("[")) {
		// IPv6 address with brackets
		const closeBracketIndex = host.indexOf("]");
		if (closeBracketIndex === -1) {
			// Malformed IPv6 - missing closing bracket
			return false;
		}

		// Extract IPv6 address with brackets (e.g., "[::1]" from "[::1]:8080")
		// Preserve the brackets as getAllowedHostnames returns IPv6 with brackets
		normalizedHost = host.substring(0, closeBracketIndex + 1);
	} else {
		// Non-IPv6 hostname - strip port using lastIndexOf(":")
		const colonIndex = host.lastIndexOf(":");
		if (colonIndex !== -1) {
			normalizedHost = host.substring(0, colonIndex);
		} else {
			normalizedHost = host;
		}
	}

	// Normalize to lowercase
	normalizedHost = normalizedHost.toLowerCase();

	// Check against allowed hostnames
	const allowedHostnames = getAllowedHostnames();
	return allowedHostnames.has(normalizedHost);
}

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

	// For localhost/127.0.0.1/::1, allow port variations by checking baseOrigin
	// For production hosts, require exact match (no port stripping)
	try {
		const originUrl = new URL(origin);
		const hostname = originUrl.hostname.toLowerCase();

		// Only strip ports for localhost/127.0.0.1/[::1]
		// Note: URL.hostname for http://[::1]:3000 is "[::1]" (with brackets)
		if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") {
			const baseOrigin = `${originUrl.protocol}//${hostname}`;
			if (CORS_CONFIG.ALLOWED_ORIGINS.includes(baseOrigin)) {
				return true;
			}
		}
		// For production hosts, exact match only (already checked above)
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
 * to access it, as required by the MCP streamable HTTP transport spec.
 * The origin is returned as an array - per-request validation should select
 * the matching origin from this list and set Access-Control-Allow-Origin
 * to that single value (never as a comma-separated list, per CORS spec).
 */
export function getCorsOptions() {
	return {
		origin: CORS_CONFIG.ALLOWED_ORIGINS,
		methods: CORS_CONFIG.METHODS,
		headers: CORS_CONFIG.HEADERS,
		exposeHeaders: CORS_CONFIG.EXPOSE_HEADERS,
		maxAge: CORS_CONFIG.MAX_AGE,
	};
}

/**
 * Get CORS options for a specific request with proper origin validation
 * Returns a single origin string per CORS spec requirements
 *
 * @param request - The incoming HTTP request
 * @returns CORS configuration with single matching origin, or "*" if no origin header
 *
 * @remarks
 * This function performs per-request origin validation and returns corsOptions
 * formatted for MCP transport. The origin field will be a single string (never
 * comma-separated) as required by the CORS specification.
 */
export function getCorsOptionsForRequest(request: Request) {
	const requestOrigin = request.headers.get("Origin");
	const matchingOrigin = getMatchingOrigin(requestOrigin);

	return {
		// Use matching origin if valid, otherwise "*" for requests without Origin header
		// (non-browser clients like Claude Desktop don't send Origin)
		origin: matchingOrigin || "*",
		methods: CORS_CONFIG.METHODS,
		headers: CORS_CONFIG.HEADERS,
		exposeHeaders: CORS_CONFIG.EXPOSE_HEADERS,
		maxAge: CORS_CONFIG.MAX_AGE,
	};
}

/**
 * Get the matching allowed origin for CORS headers
 * Per CORS spec, Access-Control-Allow-Origin must be a single origin or "*"
 *
 * @param requestOrigin - The Origin header from the incoming request
 * @returns The matching origin to use in Access-Control-Allow-Origin header, or null if not allowed
 *
 * @example
 * getMatchingOrigin("http://localhost:3000") // "http://localhost:3000" or "http://localhost"
 * getMatchingOrigin("https://mcp.globalping.io") // "https://mcp.globalping.io"
 * getMatchingOrigin("https://evil.com") // null
 */
export function getMatchingOrigin(requestOrigin: string | null): string | null {
	if (!requestOrigin || !validateOrigin(requestOrigin)) {
		return null;
	}

	// Check for exact match first
	if (CORS_CONFIG.ALLOWED_ORIGINS.includes(requestOrigin)) {
		return requestOrigin;
	}

	// For localhost/127.0.0.1/[::1] with ports, return the base origin if it matches
	try {
		const originUrl = new URL(requestOrigin);
		const hostname = originUrl.hostname.toLowerCase();

		if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") {
			const baseOrigin = `${originUrl.protocol}//${hostname}`;
			if (CORS_CONFIG.ALLOWED_ORIGINS.includes(baseOrigin)) {
				return baseOrigin;
			}
		}
	} catch {
		// Invalid URL, already rejected by validateOrigin
	}

	return null;
}
