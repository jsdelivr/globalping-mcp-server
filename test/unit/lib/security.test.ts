/**
 * Unit tests for security utilities
 * Tests Origin and Host header validation for DNS rebinding attack prevention
 */

import { describe, it, expect } from "vitest";
import {
	validateOrigin,
	validateHost,
	getCorsOptions,
	getMatchingOrigin,
	getCorsOptionsForRequest,
} from "../../../src/lib/security";
import { CORS_CONFIG } from "../../../src/config";

describe("validateOrigin", () => {
	describe("valid origins", () => {
		it("should accept production HTTPS origins", () => {
			expect(validateOrigin("https://mcp.globalping.io")).toBe(true);
			expect(validateOrigin("https://mcp.globalping.dev")).toBe(true);
		});

		it("should accept localhost HTTP origins without port", () => {
			expect(validateOrigin("http://localhost")).toBe(true);
			expect(validateOrigin("http://127.0.0.1")).toBe(true);
			expect(validateOrigin("http://[::1]")).toBe(true);
		});

		it("should accept localhost HTTPS origins without port", () => {
			expect(validateOrigin("https://localhost")).toBe(true);
			expect(validateOrigin("https://127.0.0.1")).toBe(true);
			expect(validateOrigin("https://[::1]")).toBe(true);
		});

		it("should accept localhost with port numbers", () => {
			expect(validateOrigin("http://localhost:3000")).toBe(true);
			expect(validateOrigin("http://localhost:8080")).toBe(true);
			expect(validateOrigin("http://127.0.0.1:3000")).toBe(true);
			expect(validateOrigin("http://127.0.0.1:8080")).toBe(true);
			expect(validateOrigin("http://[::1]:8080")).toBe(true);
		});

		it("should accept localhost HTTPS with port numbers", () => {
			expect(validateOrigin("https://localhost:3000")).toBe(true);
			expect(validateOrigin("https://localhost:8443")).toBe(true);
			expect(validateOrigin("https://127.0.0.1:3000")).toBe(true);
			expect(validateOrigin("https://127.0.0.1:8443")).toBe(true);
			expect(validateOrigin("https://[::1]:8443")).toBe(true);
			expect(validateOrigin("https://[::1]:3000")).toBe(true);
		});

		it("should accept MCP client protocol schemes", () => {
			expect(validateOrigin("vscode://")).toBe(true);
			expect(validateOrigin("claude://")).toBe(true);
		});

		it("should handle exact matches from whitelist", () => {
			for (const origin of CORS_CONFIG.ALLOWED_ORIGINS) {
				expect(validateOrigin(origin)).toBe(true);
			}
		});
	});

	describe("invalid origins", () => {
		it("should reject null origin", () => {
			expect(validateOrigin(null)).toBe(false);
		});

		it("should reject empty string origin", () => {
			expect(validateOrigin("")).toBe(false);
		});

		it("should reject malicious external origins", () => {
			expect(validateOrigin("https://evil.com")).toBe(false);
			expect(validateOrigin("http://malicious-site.com")).toBe(false);
			expect(validateOrigin("https://attacker.example.com")).toBe(false);
		});

		it("should reject origin with wrong protocol", () => {
			expect(validateOrigin("ftp://localhost")).toBe(false);
			expect(validateOrigin("ws://localhost")).toBe(false);
		});

		it("should reject subdomains that are not whitelisted", () => {
			expect(validateOrigin("https://subdomain.mcp.globalping.io")).toBe(false);
			expect(validateOrigin("https://evil.globalping.io")).toBe(false);
		});

		it("should reject similar but different domains", () => {
			expect(validateOrigin("https://mcp.globalping.io.evil.com")).toBe(false);
			expect(validateOrigin("https://mcpglobalping.io")).toBe(false);
			expect(validateOrigin("https://mcp-globalping.io")).toBe(false);
		});

		it("should reject invalid URL formats", () => {
			expect(validateOrigin("not-a-url")).toBe(false);
			expect(validateOrigin("javascript:alert(1)")).toBe(false);
			expect(validateOrigin("data:text/html")).toBe(false);
		});

		it("should reject IP addresses that are not 127.0.0.1", () => {
			expect(validateOrigin("http://192.168.1.1")).toBe(false);
			expect(validateOrigin("http://10.0.0.1")).toBe(false);
			expect(validateOrigin("http://172.16.0.1")).toBe(false);
		});

		it("should reject localhost-like domains", () => {
			expect(validateOrigin("http://localhost.evil.com")).toBe(false);
			expect(validateOrigin("http://127.0.0.1.evil.com")).toBe(false);
		});
	});

	describe("edge cases", () => {
		it("should handle origins with trailing slashes", () => {
			// URLs automatically normalize trailing slashes in the origin
			const urlWithSlash = new URL("https://mcp.globalping.io/");
			expect(validateOrigin(urlWithSlash.origin)).toBe(true);
		});

		it("should handle origins with paths (origin doesn't include path)", () => {
			const urlWithPath = new URL("https://mcp.globalping.io/some/path");
			expect(validateOrigin(urlWithPath.origin)).toBe(true);
		});

		it("should handle origins with query strings (origin doesn't include query)", () => {
			const urlWithQuery = new URL("https://mcp.globalping.io?param=value");
			expect(validateOrigin(urlWithQuery.origin)).toBe(true);
		});

		it("should be case-sensitive for protocols", () => {
			// URLs normalize protocol to lowercase
			const url = new URL("HTTPS://mcp.globalping.io");
			expect(validateOrigin(url.origin)).toBe(true);
		});
	});

	describe("DNS rebinding attack prevention", () => {
		it("should prevent DNS rebinding with spoofed origins", () => {
			// Attacker tries to make their domain resolve to 127.0.0.1
			expect(validateOrigin("http://attacker.com")).toBe(false);
			expect(validateOrigin("http://127.0.0.1.attacker.com")).toBe(false);
		});

		it("should prevent homograph attacks", () => {
			// Using unicode characters that look similar
			expect(validateOrigin("https://mсp.globalping.io")).toBe(false); // Cyrillic 'с'
		});

		it("should prevent protocol downgrade attacks", () => {
			// If production is HTTPS, HTTP should be rejected
			expect(validateOrigin("http://mcp.globalping.io")).toBe(false);
			expect(validateOrigin("http://mcp.globalping.dev")).toBe(false);
		});

		it("should require exact port match for production hosts", () => {
			// Production hosts should NOT allow port variations
			// Only localhost/127.0.0.1 should allow different ports
			expect(validateOrigin("https://mcp.globalping.io:8443")).toBe(false);
			expect(validateOrigin("https://mcp.globalping.io:443")).toBe(false);
			expect(validateOrigin("https://mcp.globalping.dev:8080")).toBe(false);
			// Standard HTTPS port (443) is implicit, but explicit port should be rejected
		});
	});
});

describe("getCorsOptions", () => {
	it("should return valid CORS configuration", () => {
		const corsOptions = getCorsOptions();

		expect(corsOptions).toHaveProperty("origin");
		expect(corsOptions).toHaveProperty("methods");
		expect(corsOptions).toHaveProperty("headers");
		expect(corsOptions).toHaveProperty("exposeHeaders");
		expect(corsOptions).toHaveProperty("maxAge");
	});

	it("should include all allowed origins as an array", () => {
		const corsOptions = getCorsOptions();

		expect(Array.isArray(corsOptions.origin)).toBe(true);
		expect(corsOptions.origin.length).toBe(CORS_CONFIG.ALLOWED_ORIGINS.length);
		for (const origin of CORS_CONFIG.ALLOWED_ORIGINS) {
			expect(corsOptions.origin).toContain(origin);
		}
	});

	it("should include proper HTTP methods", () => {
		const corsOptions = getCorsOptions();
		expect(corsOptions.methods).toBe(CORS_CONFIG.METHODS);
		expect(corsOptions.methods).toContain("GET");
		expect(corsOptions.methods).toContain("POST");
		expect(corsOptions.methods).toContain("DELETE");
		expect(corsOptions.methods).toContain("OPTIONS");
	});

	it("should include proper headers", () => {
		const corsOptions = getCorsOptions();
		expect(corsOptions.headers).toBe(CORS_CONFIG.HEADERS);
		expect(corsOptions.headers).toContain("Content-Type");
		expect(corsOptions.headers).toContain("Authorization");
	});

	it("should have a reasonable maxAge value", () => {
		const corsOptions = getCorsOptions();
		expect(corsOptions.maxAge).toBe(CORS_CONFIG.MAX_AGE);
		expect(corsOptions.maxAge).toBe(86400); // 24 hours
	});

	it("should expose Mcp-Session-Id header for browser clients", () => {
		const corsOptions = getCorsOptions();
		expect(corsOptions.exposeHeaders).toBe(CORS_CONFIG.EXPOSE_HEADERS);
		expect(corsOptions.exposeHeaders).toContain("Mcp-Session-Id");
	});

	it("should allow Mcp-Session-Id in request headers", () => {
		const corsOptions = getCorsOptions();
		expect(corsOptions.headers).toContain("Mcp-Session-Id");
	});
});

describe("getMatchingOrigin", () => {
	it("should return exact match for production origins", () => {
		expect(getMatchingOrigin("https://mcp.globalping.io")).toBe("https://mcp.globalping.io");
		expect(getMatchingOrigin("https://mcp.globalping.dev")).toBe("https://mcp.globalping.dev");
	});

	it("should return exact match for localhost with ports", () => {
		expect(getMatchingOrigin("http://localhost:3000")).toBe("http://localhost");
		expect(getMatchingOrigin("http://127.0.0.1:8080")).toBe("http://127.0.0.1");
	});

	it("should return base origin for localhost without ports", () => {
		expect(getMatchingOrigin("http://localhost")).toBe("http://localhost");
		expect(getMatchingOrigin("https://127.0.0.1")).toBe("https://127.0.0.1");
	});

	it("should return exact match for IPv6 localhost with ports", () => {
		expect(getMatchingOrigin("http://[::1]:3000")).toBe("http://[::1]");
		expect(getMatchingOrigin("http://[::1]:8080")).toBe("http://[::1]");
		expect(getMatchingOrigin("https://[::1]:8443")).toBe("https://[::1]");
		expect(getMatchingOrigin("https://[::1]:3000")).toBe("https://[::1]");
	});

	it("should return base origin for IPv6 localhost without ports", () => {
		expect(getMatchingOrigin("http://[::1]")).toBe("http://[::1]");
		expect(getMatchingOrigin("https://[::1]")).toBe("https://[::1]");
	});

	it("should return null for invalid origins", () => {
		expect(getMatchingOrigin("https://evil.com")).toBeNull();
		expect(getMatchingOrigin("http://attacker.example.com")).toBeNull();
		expect(getMatchingOrigin(null)).toBeNull();
		expect(getMatchingOrigin("")).toBeNull();
	});

	it("should reject production origins with non-standard ports", () => {
		expect(getMatchingOrigin("https://mcp.globalping.io:8443")).toBeNull();
		expect(getMatchingOrigin("https://mcp.globalping.dev:3000")).toBeNull();
	});

	it("should handle MCP client protocols", () => {
		expect(getMatchingOrigin("vscode://")).toBe("vscode://");
		expect(getMatchingOrigin("claude://")).toBe("claude://");
	});
});

describe("getCorsOptionsForRequest", () => {
	it("should return single origin for valid browser requests", () => {
		// Mock Request with Origin header (Origin is a forbidden header in Fetch API)
		const mockRequest = {
			headers: {
				get: (name: string) =>
					name.toLowerCase() === "origin" ? "http://localhost:3000" : null,
			},
		} as unknown as Request;

		const corsOptions = getCorsOptionsForRequest(mockRequest);

		expect(corsOptions.origin).toBe("http://localhost");
		expect(typeof corsOptions.origin).toBe("string");
	});

	it("should return single origin for IPv6 localhost requests", () => {
		const mockRequestHttp = {
			headers: {
				get: (name: string) =>
					name.toLowerCase() === "origin" ? "http://[::1]:3000" : null,
			},
		} as unknown as Request;

		const corsOptionsHttp = getCorsOptionsForRequest(mockRequestHttp);

		expect(corsOptionsHttp.origin).toBe("http://[::1]");
		expect(typeof corsOptionsHttp.origin).toBe("string");

		const mockRequestHttps = {
			headers: {
				get: (name: string) =>
					name.toLowerCase() === "origin" ? "https://[::1]:8443" : null,
			},
		} as unknown as Request;

		const corsOptionsHttps = getCorsOptionsForRequest(mockRequestHttps);

		expect(corsOptionsHttps.origin).toBe("https://[::1]");
		expect(typeof corsOptionsHttps.origin).toBe("string");
	});

	it("should normalize IPv6 localhost ports to base origin", () => {
		// Test different ports all normalize to the same base origin
		const ports = [3000, 8080, 8443, 5173];

		for (const port of ports) {
			const mockRequest = {
				headers: {
					get: (name: string) =>
						name.toLowerCase() === "origin" ? `http://[::1]:${port}` : null,
				},
			} as unknown as Request;

			const corsOptions = getCorsOptionsForRequest(mockRequest);
			expect(corsOptions.origin).toBe("http://[::1]");
		}
	});

	it("should return wildcard for requests without Origin header", () => {
		const mockRequest = {
			headers: {
				get: () => null,
			},
		} as unknown as Request;

		const corsOptions = getCorsOptionsForRequest(mockRequest);

		expect(corsOptions.origin).toBe("*");
	});

	it("should return wildcard for invalid origins", () => {
		const mockRequest = {
			headers: {
				get: (name: string) =>
					name.toLowerCase() === "origin" ? "https://evil.com" : null,
			},
		} as unknown as Request;

		const corsOptions = getCorsOptionsForRequest(mockRequest);

		expect(corsOptions.origin).toBe("*");
	});

	it("should include all CORS configuration", () => {
		const mockRequest = {
			headers: {
				get: (name: string) =>
					name.toLowerCase() === "origin" ? "https://mcp.globalping.io" : null,
			},
		} as unknown as Request;

		const corsOptions = getCorsOptionsForRequest(mockRequest);

		expect(corsOptions).toHaveProperty("methods");
		expect(corsOptions).toHaveProperty("headers");
		expect(corsOptions).toHaveProperty("exposeHeaders");
		expect(corsOptions).toHaveProperty("maxAge");
		expect(corsOptions.methods).toBe(CORS_CONFIG.METHODS);
		expect(corsOptions.headers).toBe(CORS_CONFIG.HEADERS);
		expect(corsOptions.exposeHeaders).toBe(CORS_CONFIG.EXPOSE_HEADERS);
		expect(corsOptions.maxAge).toBe(CORS_CONFIG.MAX_AGE);
	});
});

describe("validateHost", () => {
	describe("valid hosts", () => {
		it("should accept production hostnames", () => {
			expect(validateHost("mcp.globalping.io")).toBe(true);
			expect(validateHost("mcp.globalping.dev")).toBe(true);
		});

		it("should accept localhost variants", () => {
			expect(validateHost("localhost")).toBe(true);
			expect(validateHost("127.0.0.1")).toBe(true);
		});

		it("should accept hosts with port numbers", () => {
			expect(validateHost("localhost:3000")).toBe(true);
			expect(validateHost("localhost:8080")).toBe(true);
			expect(validateHost("127.0.0.1:3000")).toBe(true);
			expect(validateHost("mcp.globalping.io:443")).toBe(true);
		});

		it("should be case-insensitive", () => {
			expect(validateHost("LOCALHOST")).toBe(true);
			expect(validateHost("MCP.GLOBALPING.IO")).toBe(true);
			expect(validateHost("Localhost:3000")).toBe(true);
		});

		it("should strip port numbers before validation", () => {
			// Port should be stripped, so these should match base hostnames
			expect(validateHost("localhost:9999")).toBe(true);
			expect(validateHost("127.0.0.1:65535")).toBe(true);
		});

		it("should accept IPv6 localhost without port", () => {
			expect(validateHost("[::1]")).toBe(true);
		});

		it("should accept IPv6 localhost with port numbers", () => {
			expect(validateHost("[::1]:3000")).toBe(true);
			expect(validateHost("[::1]:8080")).toBe(true);
			expect(validateHost("[::1]:8787")).toBe(true);
			expect(validateHost("[::1]:8443")).toBe(true);
		});

		it("should strip port from IPv6 addresses", () => {
			// IPv6 with various ports should all normalize to [::1]
			expect(validateHost("[::1]:9999")).toBe(true);
			expect(validateHost("[::1]:65535")).toBe(true);
			expect(validateHost("[::1]:80")).toBe(true);
			expect(validateHost("[::1]:443")).toBe(true);
		});

		it("should handle IPv6 in various formats", () => {
			// Test that [::1] is properly recognized and validated
			expect(validateHost("[::1]")).toBe(true);
			// With scheme-like prefix (though Host header shouldn't have this, test robustness)
			expect(validateHost("[::1]:8080")).toBe(true);
		});
	});

	describe("invalid hosts", () => {
		it("should reject null host", () => {
			expect(validateHost(null)).toBe(false);
		});

		it("should reject empty string host", () => {
			expect(validateHost("")).toBe(false);
		});

		it("should reject malicious external hosts", () => {
			expect(validateHost("evil.com")).toBe(false);
			expect(validateHost("attacker.example.com")).toBe(false);
			expect(validateHost("malicious-site.com")).toBe(false);
		});

		it("should reject hosts with wrong IP addresses", () => {
			expect(validateHost("192.168.1.1")).toBe(false);
			expect(validateHost("10.0.0.1")).toBe(false);
			expect(validateHost("172.16.0.1")).toBe(false);
		});

		it("should reject non-localhost IPv6 addresses", () => {
			// Only [::1] should be accepted, other IPv6 addresses should be rejected
			expect(validateHost("[2001:db8::1]")).toBe(false);
			expect(validateHost("[fe80::1]")).toBe(false);
			expect(validateHost("[::ffff:192.0.2.1]")).toBe(false);
			expect(validateHost("[2001:db8::1]:8080")).toBe(false);
		});

		it("should reject malformed IPv6 addresses", () => {
			// Missing brackets, incomplete addresses, etc.
			expect(validateHost("::1")).toBe(false);
			expect(validateHost("::1:8080")).toBe(false);
			expect(validateHost("[::1")).toBe(false);
			expect(validateHost("::1]")).toBe(false);
			expect(validateHost("[:1]")).toBe(false);
		});

		it("should reject IPv6 addresses with protocol prefixes", () => {
			// Host headers should never include protocols
			expect(validateHost("http://[::1]")).toBe(false);
			expect(validateHost("https://[::1]")).toBe(false);
			expect(validateHost("http://[::1]:8080")).toBe(false);
			expect(validateHost("https://[::1]:8443")).toBe(false);
		});

		it("should reject subdomain attacks", () => {
			expect(validateHost("evil.mcp.globalping.io")).toBe(false);
			expect(validateHost("subdomain.globalping.io")).toBe(false);
		});

		it("should reject similar but different domains", () => {
			expect(validateHost("mcp.globalping.io.evil.com")).toBe(false);
			expect(validateHost("mcpglobalping.io")).toBe(false);
			expect(validateHost("mcp-globalping.io")).toBe(false);
		});

		it("should reject localhost-like domains", () => {
			expect(validateHost("localhost.evil.com")).toBe(false);
			expect(validateHost("127.0.0.1.evil.com")).toBe(false);
			expect(validateHost("my-localhost.com")).toBe(false);
		});
	});

	describe("DNS rebinding attack prevention", () => {
		it("should prevent DNS rebinding with spoofed hosts", () => {
			// Attacker tries to use their domain as Host header
			expect(validateHost("attacker.com")).toBe(false);
			expect(validateHost("rebinding-attack.net")).toBe(false);
		});

		it("should prevent homograph attacks in Host header", () => {
			// Using unicode characters that look similar
			expect(validateHost("mсp.globalping.io")).toBe(false); // Cyrillic 'с'
		});

		it("should work with getAllowedHostnames extraction", () => {
			// Hostnames should be extracted from CORS_CONFIG.ALLOWED_ORIGINS
			// including protocol schemes like vscode:// and claude://
			expect(validateHost("localhost")).toBe(true);
			expect(validateHost("127.0.0.1")).toBe(true);
		});
	});

	describe("port handling", () => {
		it("should strip standard HTTP port (80)", () => {
			expect(validateHost("localhost:80")).toBe(true);
		});

		it("should strip standard HTTPS port (443)", () => {
			expect(validateHost("mcp.globalping.io:443")).toBe(true);
		});

		it("should strip custom ports", () => {
			expect(validateHost("localhost:3000")).toBe(true);
			expect(validateHost("localhost:8080")).toBe(true);
			expect(validateHost("127.0.0.1:5000")).toBe(true);
		});

		it("should handle malformed port numbers", () => {
			// If port is present but malformed, the hostname part should still be validated
			expect(validateHost("localhost:abc")).toBe(true); // Port stripped, localhost remains
			expect(validateHost("evil.com:80")).toBe(false); // Still evil after port strip
		});
	});
});
