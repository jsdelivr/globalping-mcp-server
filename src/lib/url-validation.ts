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
