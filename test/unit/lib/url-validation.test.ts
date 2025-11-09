/**
 * Tests for lib/url-validation.ts
 */
import { describe, it, expect } from "vitest";
import { isDeepLink, isLocalhost } from "../../../src/lib/url-validation";

describe("isDeepLink", () => {
	it("should return false for http URL", () => {
		const result = isDeepLink("http://example.com");
		expect(result).toBe(false);
	});

	it("should return false for https URL", () => {
		const result = isDeepLink("https://example.com");
		expect(result).toBe(false);
	});

	it("should return false for ftp URL", () => {
		const result = isDeepLink("ftp://example.com");
		expect(result).toBe(false);
	});

	it("should return false for file URL", () => {
		const result = isDeepLink("file:///path/to/file");
		expect(result).toBe(false);
	});

	it("should return false for mailto URL", () => {
		const result = isDeepLink("mailto:test@example.com");
		expect(result).toBe(false);
	});

	it("should return false for tel URL", () => {
		const result = isDeepLink("tel:+1234567890");
		expect(result).toBe(false);
	});

	it("should return false for ws URL", () => {
		const result = isDeepLink("ws://example.com");
		expect(result).toBe(false);
	});

	it("should return false for wss URL", () => {
		const result = isDeepLink("wss://example.com");
		expect(result).toBe(false);
	});

	it("should return true for custom protocol (deep link)", () => {
		const result = isDeepLink("myapp://open/page");
		expect(result).toBe(true);
	});

	it("should return true for vscode protocol", () => {
		const result = isDeepLink("vscode://file/path");
		expect(result).toBe(true);
	});

	it("should return true for slack protocol", () => {
		const result = isDeepLink("slack://channel?id=123");
		expect(result).toBe(true);
	});

	it("should return true for custom app protocol", () => {
		const result = isDeepLink("com.example.app://action");
		expect(result).toBe(true);
	});

	it("should return false for invalid URL", () => {
		const result = isDeepLink("not a url");
		expect(result).toBe(false);
	});

	it("should return false for empty string", () => {
		const result = isDeepLink("");
		expect(result).toBe(false);
	});

	it("should handle protocol case insensitively", () => {
		expect(isDeepLink("HTTP://example.com")).toBe(false);
		expect(isDeepLink("HTTPS://example.com")).toBe(false);
		expect(isDeepLink("FTP://example.com")).toBe(false);
	});

	it("should return false for data URL", () => {
		const result = isDeepLink("data:text/plain;base64,SGVsbG8=");
		expect(result).toBe(false);
	});

	it("should return false for blob URL", () => {
		const result = isDeepLink("blob:https://example.com/uuid");
		expect(result).toBe(false);
	});

	it("should return false for about URL", () => {
		const result = isDeepLink("about:blank");
		expect(result).toBe(false);
	});

	it("should return false for javascript URL", () => {
		const result = isDeepLink("javascript:void(0)");
		expect(result).toBe(false);
	});
});

describe("isLocalhost", () => {
	it("should return true for localhost", () => {
		const result = isLocalhost("http://localhost");
		expect(result).toBe(true);
	});

	it("should return true for localhost with https", () => {
		const result = isLocalhost("https://localhost");
		expect(result).toBe(true);
	});

	it("should return true for localhost with port", () => {
		const result = isLocalhost("http://localhost:3000");
		expect(result).toBe(true);
	});

	it("should return true for localhost with path", () => {
		const result = isLocalhost("http://localhost/path/to/page");
		expect(result).toBe(true);
	});

	it("should return true for localhost with query params", () => {
		const result = isLocalhost("http://localhost?param=value");
		expect(result).toBe(true);
	});

	it("should return true for localhost with all URL parts", () => {
		const result = isLocalhost("http://localhost:8080/path?query=value#hash");
		expect(result).toBe(true);
	});

	it("should return true for 127.0.0.1", () => {
		const result = isLocalhost("http://127.0.0.1");
		expect(result).toBe(true);
	});

	it("should return true for 127.0.0.1 with port", () => {
		const result = isLocalhost("http://127.0.0.1:8080");
		expect(result).toBe(true);
	});

	it("should return true for 127.0.0.1 with path", () => {
		const result = isLocalhost("http://127.0.0.1/api/test");
		expect(result).toBe(true);
	});

	it("should return true for IPv6 loopback ::1", () => {
		const result = isLocalhost("http://[::1]");
		expect(result).toBe(true);
	});

	it("should return true for IPv6 loopback with port", () => {
		const result = isLocalhost("http://[::1]:3000");
		expect(result).toBe(true);
	});

	it("should return true for IPv6 loopback with path", () => {
		const result = isLocalhost("http://[::1]/path");
		expect(result).toBe(true);
	});

	it("should return true for domain ending with .localhost", () => {
		const result = isLocalhost("http://myapp.localhost");
		expect(result).toBe(true);
	});

	it("should return true for domain ending with .localhost with port", () => {
		const result = isLocalhost("http://myapp.localhost:3000");
		expect(result).toBe(true);
	});

	it("should return true for nested subdomain ending with .localhost", () => {
		const result = isLocalhost("http://sub.myapp.localhost");
		expect(result).toBe(true);
	});

	it("should handle case insensitivity for localhost", () => {
		expect(isLocalhost("http://LOCALHOST")).toBe(true);
		expect(isLocalhost("http://LocalHost")).toBe(true);
		expect(isLocalhost("http://LoCaLhOsT")).toBe(true);
	});

	it("should handle case insensitivity for .localhost domains", () => {
		expect(isLocalhost("http://myapp.LOCALHOST")).toBe(true);
		expect(isLocalhost("http://MYAPP.localhost")).toBe(true);
	});

	it("should return false for non-localhost domain", () => {
		const result = isLocalhost("http://example.com");
		expect(result).toBe(false);
	});

	it("should return false for domain containing localhost but not matching pattern", () => {
		expect(isLocalhost("http://mylocalhost.com")).toBe(false);
		expect(isLocalhost("http://localhost.com")).toBe(false);
		expect(isLocalhost("http://notlocalhost.com")).toBe(false);
		expect(isLocalhost("http://localhost.example")).toBe(false);
		expect(isLocalhost("http://notlocalhost.dev")).toBe(false);
		expect(isLocalhost("http://my.localhost.dev")).toBe(false);
	});

	it("should return false for IP addresses other than 127.0.0.1", () => {
		expect(isLocalhost("http://192.168.1.1")).toBe(false);
		expect(isLocalhost("http://10.0.0.1")).toBe(false);
		expect(isLocalhost("http://172.16.0.1")).toBe(false);
	});

	it("should return false for IPv6 addresses other than ::1", () => {
		expect(isLocalhost("http://[2001:db8::1]")).toBe(false);
		expect(isLocalhost("http://[fe80::1]")).toBe(false);
	});

	it("should return false for invalid URL", () => {
		const result = isLocalhost("not a url");
		expect(result).toBe(false);
	});

	it("should return false for empty string", () => {
		const result = isLocalhost("");
		expect(result).toBe(false);
	});

	it("should return false for malformed URL", () => {
		expect(isLocalhost("http://")).toBe(false);
		expect(isLocalhost("://localhost")).toBe(false);
	});

	it("should work with different protocols", () => {
		expect(isLocalhost("https://localhost")).toBe(true);
		expect(isLocalhost("ws://localhost")).toBe(true);
		expect(isLocalhost("wss://localhost")).toBe(true);
		expect(isLocalhost("ftp://localhost")).toBe(true);
	});

	it("should return true for localhost with username and password", () => {
		const result = isLocalhost("http://user:pass@localhost:3000");
		expect(result).toBe(true);
	});
});
