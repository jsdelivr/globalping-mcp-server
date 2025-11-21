/**
 * Unit tests for security utilities
 * Tests Origin header validation for DNS rebinding attack prevention
 */

import { describe, it, expect } from "vitest";
import { validateOrigin, getCorsOptions } from "../../../src/lib/security";
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
		});

		it("should accept localhost HTTPS origins without port", () => {
			expect(validateOrigin("https://localhost")).toBe(true);
			expect(validateOrigin("https://127.0.0.1")).toBe(true);
		});

		it("should accept localhost with port numbers", () => {
			expect(validateOrigin("http://localhost:3000")).toBe(true);
			expect(validateOrigin("http://localhost:8080")).toBe(true);
			expect(validateOrigin("http://127.0.0.1:3000")).toBe(true);
			expect(validateOrigin("http://127.0.0.1:8080")).toBe(true);
		});

		it("should accept localhost HTTPS with port numbers", () => {
			expect(validateOrigin("https://localhost:3000")).toBe(true);
			expect(validateOrigin("https://localhost:8443")).toBe(true);
			expect(validateOrigin("https://127.0.0.1:3000")).toBe(true);
			expect(validateOrigin("https://127.0.0.1:8443")).toBe(true);
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

		it("should handle IPv6 localhost addresses", () => {
			// IPv6 localhost is not in our whitelist, should be rejected
			expect(validateOrigin("http://[::1]")).toBe(false);
			expect(validateOrigin("http://[::1]:3000")).toBe(false);
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

	it("should include all allowed origins as comma-separated string", () => {
		const corsOptions = getCorsOptions();
		const origins = corsOptions.origin.split(",");

		expect(origins.length).toBe(CORS_CONFIG.ALLOWED_ORIGINS.length);
		for (const origin of CORS_CONFIG.ALLOWED_ORIGINS) {
			expect(origins).toContain(origin);
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
