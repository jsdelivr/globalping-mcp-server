/**
 * Integration Tests for MCP Server Tools
 *
 * These tests verify the MCP server integration using SELF fetcher
 * to test the complete request/response cycle through the MCP protocol.
 */
import { SELF } from "cloudflare:test";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock Globalping API responses
const createMockGlobalpingAPI = () => {
	const originalFetch = globalThis.fetch;
	let pendingRequests = 0;
	let idleResolvers: Array<() => void> = [];

	const mockFetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
		pendingRequests++;
		try {
			const urlString =
				typeof input === "string"
					? input
					: input instanceof URL
						? input.toString()
						: input.url;
			const method = init?.method || (input instanceof Request ? input.method : "GET");

			// Mock Globalping API responses
			if (urlString.includes("api.globalping.io/v1/measurements")) {
				if (method === "POST") {
					return new Response(
						JSON.stringify({
							id: "mock-measurement-123",
							probesCount: 3,
						}),
						{
							status: 200,
							headers: { "Content-Type": "application/json" },
						},
					);
				}
				if (urlString.match(/\/v1\/measurements\/[a-zA-Z0-9-]+$/)) {
					return new Response(
						JSON.stringify({
							id: "mock-measurement-123",
							type: "ping",
							status: "finished",
							createdAt: "2024-01-01T00:00:00Z",
							updatedAt: "2024-01-01T00:00:10Z",
							target: "google.com",
							probesCount: 3,
							results: [
								{
									probe: {
										continent: "NA",
										region: "Northern America",
										country: "US",
										state: null,
										city: "New York",
										asn: 12345,
										network: "Test Network",
										latitude: 40.7128,
										longitude: -74.006,
										tags: [],
										resolvers: [],
									},
									result: {
										status: "finished",
										rawOutput:
											"PING google.com (142.250.185.46): 56 data bytes",
										resolvedAddress: "142.250.185.46",
										resolvedHostname: "google.com",
										stats: {
											min: 10.12,
											avg: 15.34,
											max: 20.56,
											total: 3,
											rcv: 3,
											drop: 0,
											loss: 0,
										},
										timings: [
											{ rtt: 10.12, ttl: 64 },
											{ rtt: 15.34, ttl: 64 },
											{ rtt: 20.56, ttl: 64 },
										],
									},
								},
							],
						}),
						{
							status: 200,
							headers: { "Content-Type": "application/json" },
						},
					);
				}
			}

			if (urlString.includes("/v1/probes")) {
				return new Response(
					JSON.stringify([
						{ location: { continent: "NA", country: "US", city: "New York" } },
						{ location: { continent: "NA", country: "US", city: "Los Angeles" } },
						{ location: { continent: "EU", country: "DE", city: "Frankfurt" } },
					]),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				);
			}

			if (urlString.includes("/v1/limits")) {
				return new Response(
					JSON.stringify({
						rateLimit: {
							measurements: {
								create: {
									type: "account",
									limit: 1000,
									remaining: 800,
									reset: 3600,
								},
							},
						},
						credits: { remaining: 5000 },
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				);
			}

			return originalFetch(input, init);
		} finally {
			pendingRequests--;
			if (pendingRequests === 0) {
				for (const idleResolver of idleResolvers) {
					idleResolver();
				}
				idleResolvers = [];
			}
		}
	});

	const waitForIdle = () => {
		if (pendingRequests === 0) {
			return Promise.resolve();
		}
		return new Promise<void>((resolve) => {
			idleResolvers.push(resolve);
		});
	};

	return { mockFetch, originalFetch, waitForIdle };
};

// Helper to create MCP requests with proper headers
const makeMCPRequest = async (mcpRequest: any, token?: string, sessionId?: string) => {
	return await SELF.fetch("http://localhost/mcp", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json, text/event-stream",
			...(sessionId && { "Mcp-Session-Id": sessionId }),
			...(token && { Authorization: `Bearer ${token}` }),
		},
		body: JSON.stringify(mcpRequest),
	});
};

// Helper to parse SSE response
const parseSSEResponse = (text: string) => {
	const lines = text.split("\n");
	for (const line of lines) {
		if (line.startsWith("data: ")) {
			const data = line.substring(6);
			if (data.trim()) {
				try {
					return JSON.parse(data);
				} catch (e) {
					// Ignore parse errors for non-JSON data lines
					console.warn("Failed to parse SSE data line:", data, e);
				}
			}
		}
	}
	console.warn("No valid SSE data found in response:", text);
	return null;
};

// Helper to get JSON or SSE response
const getMCPResponse = async (response: Response) => {
	const contentType = response.headers.get("Content-Type") || "";

	// Clone response to ensure body can be read multiple times if needed
	const clonedResponse = response.clone();
	const text = await clonedResponse.text();

	if (contentType.includes("text/event-stream")) {
		return parseSSEResponse(text);
	}

	try {
		return JSON.parse(text);
	} catch (e) {
		// If parsing fails, return the text
		return { text };
	}
};

describe("MCP Tools Integration", () => {
	let mockAPI: ReturnType<typeof createMockGlobalpingAPI>;
	const validToken = "abcdefghijklmnopqrstuvwxyz123456";
	let sessionId: string;

	beforeEach(async () => {
		mockAPI = createMockGlobalpingAPI();
		globalThis.fetch = mockAPI.mockFetch as any;

		// Initialize MCP session
		const initRequest = {
			jsonrpc: "2.0",
			id: 0,
			method: "initialize",
			params: {
				protocolVersion: "2024-11-05",
				capabilities: {},
				clientInfo: {
					name: "test-client",
					version: "1.0.0",
				},
			},
		};

		const initResponse = await SELF.fetch("http://localhost/mcp", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json, text/event-stream",
				Authorization: `Bearer ${validToken}`,
			},
			body: JSON.stringify(initRequest),
		});

		expect(initResponse.status).toBe(200);

		// Consume the response body to ensure the request completes
		await getMCPResponse(initResponse);

		// Extract session ID from response headers and assert it's present
		const receivedSessionId = initResponse.headers.get("Mcp-Session-Id");
		expect(receivedSessionId).toBeTruthy();
		if (!receivedSessionId) {
			throw new Error("Server did not return Mcp-Session-Id header during initialization");
		}
		sessionId = receivedSessionId;

		// Send initialized notification to complete the handshake
		const notifyRequest = {
			jsonrpc: "2.0",
			method: "notifications/initialized",
		};

		await SELF.fetch("http://localhost/mcp", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json, text/event-stream",
				Authorization: `Bearer ${validToken}`,
				"Mcp-Session-Id": sessionId,
			},
			body: JSON.stringify(notifyRequest),
		});
	});

	afterEach(async () => {
		// Wait for all pending fetch operations to complete
		if (mockAPI) {
			await mockAPI.waitForIdle();
			globalThis.fetch = mockAPI.originalFetch;
		}
	});

	describe("Ping Tool", () => {
		it("should execute ping measurement through MCP protocol", async () => {
			const mcpRequest = {
				jsonrpc: "2.0",
				id: 1,
				method: "tools/call",
				params: {
					name: "ping",
					arguments: {
						target: "google.com",
						limit: 3,
						packets: 3,
					},
				},
			};

			const response = await makeMCPRequest(mcpRequest, validToken, sessionId);
			expect(response.status).toBe(200);

			const data = await getMCPResponse(response);

			expect(data.result).toBeDefined();
			expect(data.result.content).toBeDefined();
			expect(data.result.content[0]).toHaveProperty('type', 'text');
			expect(data.result.content[0].text).toContain('mock-measurement-123');

			// Verify mock API was called correctly
			expect(mockAPI.mockFetch).toHaveBeenCalledTimes(2);
		});

		it("should use default values when parameters are missing", async () => {
			const mcpRequest = {
				jsonrpc: "2.0",
				id: 2,
				method: "tools/call",
				params: {
					name: "ping",
					arguments: { target: "example.com" },
				},
			};

			const response = await makeMCPRequest(mcpRequest, validToken, sessionId);
			expect(response.status).toBe(200);

			const data = await getMCPResponse(response);

			expect(data.result).toBeDefined();
			expect(data.result.content[0]).toHaveProperty('type', 'text');
			expect(data.result.content[0].text).toContain('mock-measurement-123');

			// Verify mock API was called correctly
			expect(mockAPI.mockFetch).toHaveBeenCalledTimes(2);
		});
	});

	describe("Traceroute Tool", () => {
		it("should execute traceroute with ICMP protocol", async () => {
			const mcpRequest = {
				jsonrpc: "2.0",
				id: 3,
				method: "tools/call",
				params: {
					name: "traceroute",
					arguments: {
						target: "google.com",
						protocol: "ICMP",
						limit: 3,
					},
				},
			};

			const response = await makeMCPRequest(mcpRequest, validToken, sessionId);
			expect(response.status).toBe(200);

			const data = await getMCPResponse(response);

			expect(data.result).toBeDefined();
			expect(data.result.content[0]).toHaveProperty('type', 'text');
			expect(data.result.content[0].text).toContain('mock-measurement-123');

			// Verify mock API was called correctly
			expect(mockAPI.mockFetch).toHaveBeenCalledTimes(2);
		});
	});

	describe("DNS Tool", () => {
		it("should execute DNS query", async () => {
			const mcpRequest = {
				jsonrpc: "2.0",
				id: 4,
				method: "tools/call",
				params: {
					name: "dns",
					arguments: { target: "example.com" },
				},
			};

			const response = await makeMCPRequest(mcpRequest, validToken, sessionId);
			expect(response.status).toBe(200);
			const data = await getMCPResponse(response);

			expect(data.result).toBeDefined();
			expect(data.result.content[0]).toHaveProperty('type', 'text');
			expect(data.result.content[0].text).toContain('mock-measurement-123');

			// Verify mock API was called correctly
			expect(mockAPI.mockFetch).toHaveBeenCalledTimes(2);
		});
	});

	describe("HTTP Tool", () => {
		it("should execute HTTP measurement", async () => {
			const mcpRequest = {
				jsonrpc: "2.0",
				id: 5,
				method: "tools/call",
				params: {
					name: "http",
					arguments: {
						target: "example.com",
						path: "/api/v1/status",
					},
				},
			};

			const response = await makeMCPRequest(mcpRequest, validToken, sessionId);
			expect(response.status).toBe(200);
			const data = await getMCPResponse(response);

			expect(data.result).toBeDefined();
			expect(data.result.content[0]).toHaveProperty('type', 'text');
			expect(data.result.content[0].text).toContain('mock-measurement-123');

			// Verify mock API was called correctly
			expect(mockAPI.mockFetch).toHaveBeenCalledTimes(2);
		});
	});

	describe("MTR Tool", () => {
		it("should execute MTR measurement", async () => {
			const mcpRequest = {
				jsonrpc: "2.0",
				id: 6,
				method: "tools/call",
				params: {
					name: "mtr",
					arguments: {
						target: "google.com",
						packets: 5,
					},
				},
			};

			const response = await makeMCPRequest(mcpRequest, validToken, sessionId);
			expect(response.status).toBe(200);
			const data = await getMCPResponse(response);

			expect(data.result).toBeDefined();
			expect(data.result.content[0]).toHaveProperty('type', 'text');
			expect(data.result.content[0].text).toContain('mock-measurement-123');

			// Verify mock API was called correctly
			expect(mockAPI.mockFetch).toHaveBeenCalledTimes(2);
		});
	});

	describe("Locations Tool", () => {
		it("should fetch probe locations", async () => {
			const mcpRequest = {
				jsonrpc: "2.0",
				id: 7,
				method: "tools/call",
				params: {
					name: "locations",
					arguments: {},
				},
			};

			const response = await makeMCPRequest(mcpRequest, validToken, sessionId);
			expect(response.status).toBe(200);

			const data = await getMCPResponse(response);
			expect(data.result).toBeDefined();
			expect(data.result.content).toBeDefined();
			expect(data.result.content[0]).toHaveProperty('type', 'text');
			expect(data.result.content[0].text).toContain('Total Probes');

			// Verify mock API was called correctly
			expect(mockAPI.mockFetch).toHaveBeenCalledTimes(1);
		});
	});

	describe("Rate Limits Tool", () => {
		it("should fetch rate limits", async () => {
			const mcpRequest = {
				jsonrpc: "2.0",
				id: 8,
				method: "tools/call",
				params: {
					name: "limits",
					arguments: {},
				},
			};

			const response = await makeMCPRequest(mcpRequest, validToken, sessionId);
			expect(response.status).toBe(200);

			const data = await getMCPResponse(response);
			expect(data.result).toBeDefined();
			expect(data.result.content[0]).toHaveProperty('type', 'text');
			expect(data.result.content[0].text).toContain('rateLimit');

			// Verify mock API was called correctly
			expect(mockAPI.mockFetch).toHaveBeenCalledTimes(1);
		});
	});

	describe("Tool List", () => {
		it("should list all available tools", async () => {
			const mcpRequest = {
				jsonrpc: "2.0",
				id: 9,
				method: "tools/list",
				params: {},
			};

			const response = await makeMCPRequest(mcpRequest, validToken, sessionId);
			expect(response.status).toBe(200);

			const data = await getMCPResponse(response);
			expect(data.result).toBeDefined();
			expect(data.result.tools).toBeDefined();
			expect(Array.isArray(data.result.tools)).toBe(true);

			const toolNames = data.result.tools.map((t: any) => t.name);
			expect(toolNames).toContain("ping");
			expect(toolNames).toContain("traceroute");
			expect(toolNames).toContain("dns");
			expect(toolNames).toContain("mtr");
			expect(toolNames).toContain("http");
			expect(toolNames).toContain("locations");
			expect(toolNames).toContain("limits");
		});
	});

	describe("Authentication", () => {
		it("should reject requests without API token", async () => {
			const mcpRequest = {
				jsonrpc: "2.0",
				id: 10,
				method: "tools/call",
				params: {
					name: "ping",
					arguments: { target: "google.com" },
				},
			};

			const response = await makeMCPRequest(mcpRequest);
			expect(response.status).toBe(401);
		});

		it("should reject requests with invalid API token", async () => {
			const mcpRequest = {
				jsonrpc: "2.0",
				id: 11,
				method: "tools/call",
				params: {
					name: "ping",
					arguments: { target: "google.com" },
				},
			};

			const response = await makeMCPRequest(mcpRequest, "invalid-token");
			expect(response.status).toBe(401);
		});
	});
});
