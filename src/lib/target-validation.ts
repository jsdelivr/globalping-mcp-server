/**
 * Target validation utilities for Globalping measurements
 * Ensures only public endpoints are tested (Globalping API requirement)
 */

/**
 * Check if an IPv4 address is in a private range (RFC1918)
 * Private ranges:
 * - 10.0.0.0/8 (10.0.0.0 - 10.255.255.255)
 * - 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
 * - 192.168.0.0/16 (192.168.0.0 - 192.168.255.255)
 *
 * @param ip The IPv4 address to check
 * @returns True if the IP is in a private range
 */
export function isPrivateIPv4(ip: string): boolean {
	// Remove any IPv6 brackets if present
	const cleanIp = ip.replace(/^\[|\]$/g, "");

	// Parse IPv4 address into octets
	const parts = cleanIp.split(".");
	if (parts.length !== 4) {
		return false;
	}

	const octets = parts.map((part) => Number.parseInt(part, 10));

	// Validate all octets are numbers 0-255
	if (octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) {
		return false;
	}

	const [first, second] = octets;

	// 10.0.0.0/8
	if (first === 10) {
		return true;
	}

	// 172.16.0.0/12
	if (first === 172 && second >= 16 && second <= 31) {
		return true;
	}

	// 192.168.0.0/16
	if (first === 192 && second === 168) {
		return true;
	}

	return false;
}

/**
 * Check if an IPv6 address is in a private range
 * Private ranges:
 * - fc00::/7 (Unique Local Addresses)
 * - fe80::/10 (Link-local addresses)
 *
 * @param ip The IPv6 address to check
 * @returns True if the IP is in a private range
 */
export function isPrivateIPv6(ip: string): boolean {
	// Remove brackets if present
	const cleanIp = ip.replace(/^\[|\]$/g, "").toLowerCase();

	// fc00::/7 - Unique Local Addresses (fc00:: to fdff::)
	if (cleanIp.startsWith("fc") || cleanIp.startsWith("fd")) {
		return true;
	}

	// fe80::/10 - Link-local addresses
	if (cleanIp.startsWith("fe8") || cleanIp.startsWith("fe9") || cleanIp.startsWith("fea") || cleanIp.startsWith("feb")) {
		return true;
	}

	return false;
}

/**
 * Check if an IPv4 address is a loopback address
 * Loopback range: 127.0.0.0/8
 *
 * @param ip The IPv4 address to check
 * @returns True if the IP is a loopback address
 */
export function isLoopbackIPv4(ip: string): boolean {
	const cleanIp = ip.replace(/^\[|\]$/g, "");
	const parts = cleanIp.split(".");

	if (parts.length !== 4) {
		return false;
	}

	const first = Number.parseInt(parts[0], 10);
	return first === 127;
}

/**
 * Check if an IPv6 address is a loopback address
 * Loopback: ::1
 *
 * @param ip The IPv6 address to check
 * @returns True if the IP is a loopback address
 */
export function isLoopbackIPv6(ip: string): boolean {
	const cleanIp = ip.replace(/^\[|\]$/g, "").toLowerCase();

	// ::1 is the only IPv6 loopback
	return cleanIp === "::1" || cleanIp === "0:0:0:0:0:0:0:1" || cleanIp === "0000:0000:0000:0000:0000:0000:0000:0001";
}

/**
 * Check if an IPv4 address is a link-local address (APIPA)
 * Link-local range: 169.254.0.0/16
 *
 * @param ip The IPv4 address to check
 * @returns True if the IP is a link-local address
 */
export function isLinkLocalIPv4(ip: string): boolean {
	const cleanIp = ip.replace(/^\[|\]$/g, "");
	const parts = cleanIp.split(".");

	if (parts.length !== 4) {
		return false;
	}

	const octets = parts.map((part) => Number.parseInt(part, 10));

	// Validate octets
	if (octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) {
		return false;
	}

	// 169.254.0.0/16
	return octets[0] === 169 && octets[1] === 254;
}

/**
 * Check if a target is a localhost domain
 * Matches: localhost, *.localhost
 *
 * @param target The target to check
 * @returns True if the target is a localhost domain
 */
export function isLocalhostDomain(target: string): boolean {
	const lower = target.toLowerCase();
	return lower === "localhost" || lower.endsWith(".localhost");
}

/**
 * Validate if a target is a public endpoint
 * Globalping only supports public endpoints - no private IPs, localhost, or link-local addresses
 *
 * @param target The target domain or IP address to validate
 * @returns Validation result with reason if invalid
 */
export function isPublicTarget(target: string): { valid: boolean; reason?: string } {
	if (!target || target.trim() === "") {
		return { valid: false, reason: "Target cannot be empty" };
	}

	const cleanTarget = target.trim();

	// Check for localhost domain patterns
	if (isLocalhostDomain(cleanTarget)) {
		return {
			valid: false,
			reason: `'${cleanTarget}' is a localhost domain`,
		};
	}

	// Try to determine if it's an IP address
	// IPv6 addresses may be in brackets
	const ipToCheck = cleanTarget.replace(/^\[|\]$/g, "");

	// Check if it looks like an IPv4 address (contains only digits and dots)
	const ipv4Pattern = /^[\d.]+$/;
	if (ipv4Pattern.test(ipToCheck)) {
		// Check IPv4 loopback
		if (isLoopbackIPv4(ipToCheck)) {
			return {
				valid: false,
				reason: `${ipToCheck} is a loopback address (127.0.0.0/8)`,
			};
		}

		// Check IPv4 private ranges
		if (isPrivateIPv4(ipToCheck)) {
			return {
				valid: false,
				reason: `${ipToCheck} is a private IPv4 address (RFC1918)`,
			};
		}

		// Check IPv4 link-local
		if (isLinkLocalIPv4(ipToCheck)) {
			return {
				valid: false,
				reason: `${ipToCheck} is a link-local address (169.254.0.0/16)`,
			};
		}
	}

	// Check if it looks like an IPv6 address (contains colons)
	if (ipToCheck.includes(":")) {
		// Check IPv6 loopback
		if (isLoopbackIPv6(ipToCheck)) {
			return {
				valid: false,
				reason: `${ipToCheck} is the IPv6 loopback address`,
			};
		}

		// Check IPv6 private ranges
		if (isPrivateIPv6(ipToCheck)) {
			return {
				valid: false,
				reason: `${ipToCheck} is a private IPv6 address`,
			};
		}
	}

	// If it doesn't match any private/local patterns, assume it's public
	// (could be a domain name or a public IP)
	return { valid: true };
}
