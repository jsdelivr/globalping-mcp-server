/**
 * Tests for lib/target-validation.ts
 */
import { describe, it, expect } from "vitest";
import {
	isPrivateIPv4,
	isPrivateIPv6,
	isLoopbackIPv4,
	isLoopbackIPv6,
	isLinkLocalIPv4,
	isLocalhostDomain,
	isPublicTarget,
} from "../../../src/lib/target-validation";

describe("isPrivateIPv4", () => {
	describe("RFC1918 private ranges", () => {
		it("should detect 10.0.0.0/8 range", () => {
			expect(isPrivateIPv4("10.0.0.0")).toBe(true);
			expect(isPrivateIPv4("10.0.0.1")).toBe(true);
			expect(isPrivateIPv4("10.123.45.67")).toBe(true);
			expect(isPrivateIPv4("10.255.255.255")).toBe(true);
		});

		it("should detect 172.16.0.0/12 range", () => {
			expect(isPrivateIPv4("172.16.0.0")).toBe(true);
			expect(isPrivateIPv4("172.16.0.1")).toBe(true);
			expect(isPrivateIPv4("172.20.10.5")).toBe(true);
			expect(isPrivateIPv4("172.31.255.255")).toBe(true);
		});

		it("should detect 192.168.0.0/16 range", () => {
			expect(isPrivateIPv4("192.168.0.0")).toBe(true);
			expect(isPrivateIPv4("192.168.0.1")).toBe(true);
			expect(isPrivateIPv4("192.168.1.1")).toBe(true);
			expect(isPrivateIPv4("192.168.255.255")).toBe(true);
		});
	});

	describe("boundary cases", () => {
		it("should not detect 9.x.x.x as private", () => {
			expect(isPrivateIPv4("9.255.255.255")).toBe(false);
		});

		it("should not detect 11.x.x.x as private", () => {
			expect(isPrivateIPv4("11.0.0.0")).toBe(false);
		});

		it("should not detect 172.15.x.x as private", () => {
			expect(isPrivateIPv4("172.15.255.255")).toBe(false);
		});

		it("should not detect 172.32.x.x as private", () => {
			expect(isPrivateIPv4("172.32.0.0")).toBe(false);
		});

		it("should not detect 192.167.x.x as private", () => {
			expect(isPrivateIPv4("192.167.255.255")).toBe(false);
		});

		it("should not detect 192.169.x.x as private", () => {
			expect(isPrivateIPv4("192.169.0.0")).toBe(false);
		});
	});

	describe("public IPs", () => {
		it("should not detect public IPs as private", () => {
			expect(isPrivateIPv4("1.1.1.1")).toBe(false);
			expect(isPrivateIPv4("8.8.8.8")).toBe(false);
			expect(isPrivateIPv4("142.250.185.46")).toBe(false);
			expect(isPrivateIPv4("208.67.222.222")).toBe(false);
		});
	});

	describe("invalid inputs", () => {
		it("should return false for invalid IP formats", () => {
			expect(isPrivateIPv4("not-an-ip")).toBe(false);
			expect(isPrivateIPv4("256.1.1.1")).toBe(false);
			expect(isPrivateIPv4("1.1.1")).toBe(false);
			expect(isPrivateIPv4("1.1.1.1.1")).toBe(false);
			expect(isPrivateIPv4("")).toBe(false);
		});
	});
});

describe("isPrivateIPv6", () => {
	describe("unique local addresses (fc00::/7)", () => {
		it("should detect fc00:: range", () => {
			expect(isPrivateIPv6("fc00::1")).toBe(true);
			expect(isPrivateIPv6("fc00:1234:5678::1")).toBe(true);
			expect(isPrivateIPv6("fcff:ffff:ffff:ffff:ffff:ffff:ffff:ffff")).toBe(true);
		});

		it("should detect fd00:: range", () => {
			expect(isPrivateIPv6("fd00::1")).toBe(true);
			expect(isPrivateIPv6("fd12:3456:789a::1")).toBe(true);
			expect(isPrivateIPv6("fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff")).toBe(true);
		});

		it("should handle brackets", () => {
			expect(isPrivateIPv6("[fc00::1]")).toBe(true);
			expect(isPrivateIPv6("[fd00::1]")).toBe(true);
		});
	});

	describe("link-local addresses (fe80::/10)", () => {
		it("should detect fe80:: range", () => {
			expect(isPrivateIPv6("fe80::1")).toBe(true);
			expect(isPrivateIPv6("fe80:1234:5678::1")).toBe(true);
		});

		it("should detect fe8-feb range", () => {
			expect(isPrivateIPv6("fe80::1")).toBe(true);
			expect(isPrivateIPv6("fe90::1")).toBe(true);
			expect(isPrivateIPv6("fea0::1")).toBe(true);
			expect(isPrivateIPv6("feb0::1")).toBe(true);
		});

		it("should handle brackets", () => {
			expect(isPrivateIPv6("[fe80::1]")).toBe(true);
		});
	});

	describe("public IPv6 addresses", () => {
		it("should not detect public IPv6 as private", () => {
			expect(isPrivateIPv6("2001:4860:4860::8888")).toBe(false);
			expect(isPrivateIPv6("2606:4700:4700::1111")).toBe(false);
			expect(isPrivateIPv6("2001:db8::1")).toBe(false);
		});
	});

	describe("case insensitivity", () => {
		it("should handle uppercase addresses", () => {
			expect(isPrivateIPv6("FC00::1")).toBe(true);
			expect(isPrivateIPv6("FD00::1")).toBe(true);
			expect(isPrivateIPv6("FE80::1")).toBe(true);
		});

		it("should handle mixed case", () => {
			expect(isPrivateIPv6("Fc00::1")).toBe(true);
			expect(isPrivateIPv6("Fe80::1")).toBe(true);
		});
	});
});

describe("isLoopbackIPv4", () => {
	it("should detect 127.0.0.0/8 loopback range", () => {
		expect(isLoopbackIPv4("127.0.0.0")).toBe(true);
		expect(isLoopbackIPv4("127.0.0.1")).toBe(true);
		expect(isLoopbackIPv4("127.1.2.3")).toBe(true);
		expect(isLoopbackIPv4("127.255.255.255")).toBe(true);
	});

	it("should not detect non-loopback IPs", () => {
		expect(isLoopbackIPv4("126.255.255.255")).toBe(false);
		expect(isLoopbackIPv4("128.0.0.0")).toBe(false);
		expect(isLoopbackIPv4("192.168.1.1")).toBe(false);
		expect(isLoopbackIPv4("8.8.8.8")).toBe(false);
	});

	it("should return false for invalid formats", () => {
		expect(isLoopbackIPv4("not-an-ip")).toBe(false);
		expect(isLoopbackIPv4("127.0.0")).toBe(false);
	});
});

describe("isLoopbackIPv6", () => {
	it("should detect ::1 loopback", () => {
		expect(isLoopbackIPv6("::1")).toBe(true);
		expect(isLoopbackIPv6("[::1]")).toBe(true);
	});

	it("should detect expanded ::1 formats", () => {
		expect(isLoopbackIPv6("0:0:0:0:0:0:0:1")).toBe(true);
		expect(isLoopbackIPv6("0000:0000:0000:0000:0000:0000:0000:0001")).toBe(true);
	});

	it("should not detect non-loopback IPv6", () => {
		expect(isLoopbackIPv6("::2")).toBe(false);
		expect(isLoopbackIPv6("fe80::1")).toBe(false);
		expect(isLoopbackIPv6("2001:db8::1")).toBe(false);
	});

	it("should be case insensitive", () => {
		expect(isLoopbackIPv6("::1")).toBe(true);
		expect(isLoopbackIPv6("::1".toUpperCase())).toBe(true);
	});
});

describe("isLinkLocalIPv4", () => {
	it("should detect 169.254.0.0/16 range", () => {
		expect(isLinkLocalIPv4("169.254.0.0")).toBe(true);
		expect(isLinkLocalIPv4("169.254.0.1")).toBe(true);
		expect(isLinkLocalIPv4("169.254.123.45")).toBe(true);
		expect(isLinkLocalIPv4("169.254.255.255")).toBe(true);
	});

	it("should not detect non-link-local IPs", () => {
		expect(isLinkLocalIPv4("169.253.255.255")).toBe(false);
		expect(isLinkLocalIPv4("169.255.0.0")).toBe(false);
		expect(isLinkLocalIPv4("168.254.0.1")).toBe(false);
		expect(isLinkLocalIPv4("170.254.0.1")).toBe(false);
	});

	it("should return false for invalid formats", () => {
		expect(isLinkLocalIPv4("not-an-ip")).toBe(false);
		expect(isLinkLocalIPv4("169.254.0")).toBe(false);
	});
});

describe("isLocalhostDomain", () => {
	it("should detect localhost", () => {
		expect(isLocalhostDomain("localhost")).toBe(true);
		expect(isLocalhostDomain("LOCALHOST")).toBe(true);
		expect(isLocalhostDomain("LocalHost")).toBe(true);
	});

	it("should detect *.localhost domains", () => {
		expect(isLocalhostDomain("app.localhost")).toBe(true);
		expect(isLocalhostDomain("my.app.localhost")).toBe(true);
		expect(isLocalhostDomain("test.localhost")).toBe(true);
	});

	it("should be case insensitive", () => {
		expect(isLocalhostDomain("APP.LOCALHOST")).toBe(true);
		expect(isLocalhostDomain("My.App.LocalHost")).toBe(true);
	});

	it("should not detect domains that just contain 'localhost'", () => {
		expect(isLocalhostDomain("localhost.com")).toBe(false);
		expect(isLocalhostDomain("mylocalhost.dev")).toBe(false);
		expect(isLocalhostDomain("notlocalhost.com")).toBe(false);
	});

	it("should not detect empty or non-localhost strings", () => {
		expect(isLocalhostDomain("")).toBe(false);
		expect(isLocalhostDomain("example.com")).toBe(false);
		expect(isLocalhostDomain("google.com")).toBe(false);
	});
});

describe("isPublicTarget", () => {
	describe("invalid targets", () => {
		it("should reject empty targets", () => {
			expect(isPublicTarget("").valid).toBe(false);
			expect(isPublicTarget("  ").valid).toBe(false);
			expect(isPublicTarget("").reason).toContain("empty");
		});
	});

	describe("localhost domains", () => {
		it("should reject localhost", () => {
			const result = isPublicTarget("localhost");
			expect(result.valid).toBe(false);
			expect(result.reason).toContain("localhost domain");
		});

		it("should reject *.localhost", () => {
			const result = isPublicTarget("app.localhost");
			expect(result.valid).toBe(false);
			expect(result.reason).toContain("localhost domain");
		});
	});

	describe("loopback addresses", () => {
		it("should reject IPv4 loopback", () => {
			const result = isPublicTarget("127.0.0.1");
			expect(result.valid).toBe(false);
			expect(result.reason).toContain("loopback");
		});

		it("should reject all 127.x.x.x addresses", () => {
			const result = isPublicTarget("127.1.2.3");
			expect(result.valid).toBe(false);
			expect(result.reason).toContain("loopback");
		});

		it("should reject IPv6 loopback", () => {
			const result = isPublicTarget("::1");
			expect(result.valid).toBe(false);
			expect(result.reason).toContain("loopback");
		});

		it("should reject IPv6 loopback with brackets", () => {
			const result = isPublicTarget("[::1]");
			expect(result.valid).toBe(false);
			expect(result.reason).toContain("loopback");
		});
	});

	describe("private IPv4 addresses", () => {
		it("should reject 10.x.x.x", () => {
			const result = isPublicTarget("10.0.0.1");
			expect(result.valid).toBe(false);
			expect(result.reason).toContain("private IPv4");
			expect(result.reason).toContain("RFC1918");
		});

		it("should reject 172.16.x.x through 172.31.x.x", () => {
			const result1 = isPublicTarget("172.16.0.1");
			expect(result1.valid).toBe(false);
			expect(result1.reason).toContain("private IPv4");

			const result2 = isPublicTarget("172.31.255.254");
			expect(result2.valid).toBe(false);
			expect(result2.reason).toContain("private IPv4");
		});

		it("should reject 192.168.x.x", () => {
			const result = isPublicTarget("192.168.1.1");
			expect(result.valid).toBe(false);
			expect(result.reason).toContain("private IPv4");
			expect(result.reason).toContain("RFC1918");
		});
	});

	describe("private IPv6 addresses", () => {
		it("should reject fc00::/7 range", () => {
			const result = isPublicTarget("fc00::1");
			expect(result.valid).toBe(false);
			expect(result.reason).toContain("private IPv6");
		});

		it("should reject fd00::/8 range", () => {
			const result = isPublicTarget("fd12:3456::1");
			expect(result.valid).toBe(false);
			expect(result.reason).toContain("private IPv6");
		});

		it("should reject fe80::/10 link-local", () => {
			const result = isPublicTarget("fe80::1");
			expect(result.valid).toBe(false);
			expect(result.reason).toContain("private IPv6");
		});

		it("should reject IPv6 with brackets", () => {
			const result = isPublicTarget("[fc00::1]");
			expect(result.valid).toBe(false);
			expect(result.reason).toContain("private IPv6");
		});
	});

	describe("link-local addresses", () => {
		it("should reject 169.254.x.x", () => {
			const result = isPublicTarget("169.254.1.1");
			expect(result.valid).toBe(false);
			expect(result.reason).toContain("link-local");
			expect(result.reason).toContain("169.254");
		});
	});

	describe("public targets", () => {
		it("should accept public IPv4 addresses", () => {
			expect(isPublicTarget("1.1.1.1").valid).toBe(true);
			expect(isPublicTarget("8.8.8.8").valid).toBe(true);
			expect(isPublicTarget("142.250.185.46").valid).toBe(true);
			expect(isPublicTarget("208.67.222.222").valid).toBe(true);
		});

		it("should accept public IPv6 addresses", () => {
			expect(isPublicTarget("2001:4860:4860::8888").valid).toBe(true);
			expect(isPublicTarget("2606:4700:4700::1111").valid).toBe(true);
		});

		it("should accept public IPv6 with brackets", () => {
			expect(isPublicTarget("[2001:4860:4860::8888]").valid).toBe(true);
		});

		it("should accept domain names", () => {
			expect(isPublicTarget("google.com").valid).toBe(true);
			expect(isPublicTarget("example.com").valid).toBe(true);
			expect(isPublicTarget("github.com").valid).toBe(true);
			expect(isPublicTarget("api.globalping.io").valid).toBe(true);
		});

		it("should accept subdomains", () => {
			expect(isPublicTarget("www.example.com").valid).toBe(true);
			expect(isPublicTarget("api.github.com").valid).toBe(true);
		});
	});

	describe("boundary cases for 172.x range", () => {
		it("should accept 172.15.x.x", () => {
			expect(isPublicTarget("172.15.255.255").valid).toBe(true);
		});

		it("should reject 172.16.x.x", () => {
			expect(isPublicTarget("172.16.0.0").valid).toBe(false);
		});

		it("should reject 172.31.x.x", () => {
			expect(isPublicTarget("172.31.255.255").valid).toBe(false);
		});

		it("should accept 172.32.x.x", () => {
			expect(isPublicTarget("172.32.0.0").valid).toBe(true);
		});
	});

	describe("whitespace handling", () => {
		it("should trim whitespace", () => {
			expect(isPublicTarget("  google.com  ").valid).toBe(true);
			expect(isPublicTarget("  192.168.1.1  ").valid).toBe(false);
		});
	});
});
