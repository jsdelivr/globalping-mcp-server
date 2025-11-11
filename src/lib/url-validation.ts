/**
 * URL validation utilities
 */
import { STANDARD_PROTOCOLS, EXCEPTION_HOSTS } from "../config";

/**
 * Check if a URL is a deep link
 * @param url The URL to check
 * @returns True if URL is a deep link
 */
export function isDeepLink(url: string): boolean {
	try {
		const parsedUrl = new URL(url);
		const protocol = parsedUrl.protocol.toLowerCase();
		return !STANDARD_PROTOCOLS.has(protocol);
	} catch (e) {
		return false;
	}
}

/**
 * Check if a URL is from an exception host
 * @param urlString The URL to check
 * @returns True if URL is from an exception host
 */
export function isExceptionHost(urlString: string): boolean {
	try {
		const url = new URL(urlString);
		return EXCEPTION_HOSTS.has(url.hostname);
	} catch (err) {
		// Invalid URL string
		return false;
	}
}

/**
 * Check if a URL is localhost
 * @param urlString The URL to check
 * @returns True if URL is localhost
 */
export function isLocalhost(urlString: string): boolean {
	try {
		const url = new URL(urlString);
		const hostname = url.hostname.toLowerCase();
		return (
			hostname === "localhost" ||
			hostname === "127.0.0.1" ||
			hostname === "[::1]" ||
			hostname.endsWith(".localhost")
		);
	} catch (err) {
		// Invalid URL string
		return false;
	}
}

/**
 * Check if a redirect URI is trusted for automatic redirection
 * Per OAuth 2.0 Security Best Practices (RFC 6819 section 7.12.2),
 * only certain types of URIs should be automatically redirected to
 * @param urlString The redirect URI to check
 * @returns True if the URI is trusted for automatic redirection
 */
export function isTrustedRedirectUri(urlString: string): boolean {
	return isLocalhost(urlString) || isDeepLink(urlString) || isExceptionHost(urlString);
}
