/**
 * End-to-End Tests for MCP Server Tools
 *
 * These tests verify the actual MCP tool implementations including:
 * - Tool registration and parameter validation
 * - API integration with Globalping
 * - Response formatting
 * - State management and caching
 * - Error handling
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as api from "../../src/api";
import { registerGlobalpingTools } from "../../src/mcp/tools";
import type { MeasurementResponse } from "../../src/types";
import type { GlobalpingMCP } from "../../src/index";

// Mock the API module
vi.mock("../../src/api", () => ({
	runMeasurement: vi.fn(),
	getLocations: vi.fn(),
	getRateLimits: vi.fn(),
}));

// Create a mock agent with minimal implementation
const createMockAgent = () => {
	const state = {
		measurements: {} as Record<string, MeasurementResponse>,
		lastMeasurementId: undefined as string | undefined,
		oAuth: {},
	};

	const props = {
		accessToken: "Bearer test-token-12345",
		refreshToken: "",
		state: "",
		userName: "testuser",
		clientId: "test-client",
		isAuthenticated: true,
	};

	const tools = new Map<string, any>();

	const mockServer = {
		tool: (name: string, schema: any, handler: any) => {
			tools.set(name, { schema, handler });
		},
	};

	const agent = {
		state,
		props,
		server: mockServer,
		getIsAuthenticated: () => props.isAuthenticated,
		setIsAuthenticated: (val: boolean) => {
			props.isAuthenticated = val;
		},
	} as unknown as GlobalpingMCP;

	return { agent, tools, state, props };
};

describe("MCP Tools - Ping", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should execute ping tool and cache the result", async () => {
		const { agent, tools, state } = createMockAgent();
		const getToken = () => "Bearer test-token-12345";

		registerGlobalpingTools(agent, getToken);

		const mockResult: MeasurementResponse = {
			id: "ping-123",
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
						rawOutput: "PING google.com (142.250.185.46): 56 data bytes",
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
		};

		vi.mocked(api.runMeasurement).mockResolvedValue(mockResult);

		const pingTool = tools.get("ping");
		expect(pingTool).toBeDefined();

		const result = await pingTool.handler({
			target: "google.com",
			limit: 3,
			packets: 3,
		});

		// Verify API was called correctly
		expect(api.runMeasurement).toHaveBeenCalledWith(
			agent,
			{
				type: "ping",
				target: "google.com",
				locations: undefined,
				limit: 3,
				measurementOptions: { packets: 3 },
			},
			"Bearer test-token-12345",
		);

		// Verify result was cached
		expect(state.measurements["ping-123"]).toBeDefined();
		expect(state.lastMeasurementId).toBe("ping-123");

		// Verify response format
		expect(result.content).toBeDefined();
		expect(result.content).toHaveLength(2);
		expect(result.content[1].text).toContain("ping-123");
	});

	it("should parse location arrays correctly", async () => {
		const { agent, tools } = createMockAgent();
		const getToken = () => "Bearer test-token-12345";

		registerGlobalpingTools(agent, getToken);

		const mockResult: MeasurementResponse = {
			id: "ping-456",
			type: "ping",
			status: "finished",
			createdAt: "2024-01-01T00:00:00Z",
			updatedAt: "2024-01-01T00:00:10Z",
			target: "cloudflare.com",
			probesCount: 2,
			results: [],
		};

		vi.mocked(api.runMeasurement).mockResolvedValue(mockResult);

		const pingTool = tools.get("ping");
		await pingTool.handler({
			target: "cloudflare.com",
			locations: ["US", "Europe"],
			limit: 2,
		});

		expect(api.runMeasurement).toHaveBeenCalledWith(
			agent,
			expect.objectContaining({
				locations: [{ magic: "US" }, { magic: "Europe" }],
			}),
			expect.any(String),
		);
	});

	it("should use default values when parameters are missing", async () => {
		const { agent, tools } = createMockAgent();
		const getToken = () => "Bearer test-token";

		registerGlobalpingTools(agent, getToken);

		const mockResult: MeasurementResponse = {
			id: "ping-789",
			type: "ping",
			status: "finished",
			createdAt: "2024-01-01T00:00:00Z",
			updatedAt: "2024-01-01T00:00:10Z",
			target: "example.com",
			probesCount: 3,
			results: [],
		};

		vi.mocked(api.runMeasurement).mockResolvedValue(mockResult);

		const pingTool = tools.get("ping");
		await pingTool.handler({ target: "example.com" });

		expect(api.runMeasurement).toHaveBeenCalledWith(
			agent,
			expect.objectContaining({
				limit: 3, // default
				measurementOptions: { packets: 3 }, // default
			}),
			expect.any(String),
		);
	});
});

describe("MCP Tools - Traceroute", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should execute traceroute with ICMP protocol", async () => {
		const { agent, tools } = createMockAgent();
		const getToken = () => "Bearer test-token";

		registerGlobalpingTools(agent, getToken);

		const mockResult: MeasurementResponse = {
			id: "tr-123",
			type: "traceroute",
			status: "finished",
			createdAt: "2024-01-01T00:00:00Z",
			updatedAt: "2024-01-01T00:00:10Z",
			target: "google.com",
			probesCount: 3,
			results: [],
		};

		vi.mocked(api.runMeasurement).mockResolvedValue(mockResult);

		const tracerouteTool = tools.get("traceroute");
		await tracerouteTool.handler({
			target: "google.com",
			protocol: "ICMP",
			limit: 3,
		});

		expect(api.runMeasurement).toHaveBeenCalledWith(
			agent,
			expect.objectContaining({
				type: "traceroute",
				measurementOptions: expect.objectContaining({
					protocol: "ICMP",
				}),
			}),
			expect.any(String),
		);
	});

	it("should handle TCP protocol with custom port", async () => {
		const { agent, tools } = createMockAgent();
		const getToken = () => "Bearer test-token";

		registerGlobalpingTools(agent, getToken);

		const mockResult: MeasurementResponse = {
			id: "tr-456",
			type: "traceroute",
			status: "finished",
			createdAt: "2024-01-01T00:00:00Z",
			updatedAt: "2024-01-01T00:00:10Z",
			target: "example.com",
			probesCount: 3,
			results: [],
		};

		vi.mocked(api.runMeasurement).mockResolvedValue(mockResult);

		const tracerouteTool = tools.get("traceroute");
		await tracerouteTool.handler({
			target: "example.com",
			protocol: "TCP",
			port: 443,
		});

		expect(api.runMeasurement).toHaveBeenCalledWith(
			agent,
			expect.objectContaining({
				measurementOptions: expect.objectContaining({
					protocol: "TCP",
					port: 443,
				}),
			}),
			expect.any(String),
		);
	});
});

describe("MCP Tools - DNS", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should execute DNS query with default A record", async () => {
		const { agent, tools } = createMockAgent();
		const getToken = () => "Bearer test-token";

		registerGlobalpingTools(agent, getToken);

		const mockResult: MeasurementResponse = {
			id: "dns-123",
			type: "dns",
			status: "finished",
			createdAt: "2024-01-01T00:00:00Z",
			updatedAt: "2024-01-01T00:00:10Z",
			target: "example.com",
			probesCount: 3,
			results: [],
		};

		vi.mocked(api.runMeasurement).mockResolvedValue(mockResult);

		const dnsTool = tools.get("dns");
		await dnsTool.handler({ target: "example.com" });

		expect(api.runMeasurement).toHaveBeenCalledWith(
			agent,
			expect.objectContaining({
				type: "dns",
				measurementOptions: expect.objectContaining({
					query: { type: "A" },
				}),
			}),
			expect.any(String),
		);
	});

	it("should support custom resolver and trace", async () => {
		const { agent, tools } = createMockAgent();
		const getToken = () => "Bearer test-token";

		registerGlobalpingTools(agent, getToken);

		const mockResult: MeasurementResponse = {
			id: "dns-456",
			type: "dns",
			status: "finished",
			createdAt: "2024-01-01T00:00:00Z",
			updatedAt: "2024-01-01T00:00:10Z",
			target: "cloudflare.com",
			probesCount: 3,
			results: [],
		};

		vi.mocked(api.runMeasurement).mockResolvedValue(mockResult);

		const dnsTool = tools.get("dns");
		await dnsTool.handler({
			target: "cloudflare.com",
			queryType: "AAAA",
			resolver: "1.1.1.1",
			trace: true,
		});

		expect(api.runMeasurement).toHaveBeenCalledWith(
			agent,
			expect.objectContaining({
				measurementOptions: expect.objectContaining({
					query: { type: "AAAA" },
					resolver: "1.1.1.1",
					trace: true,
				}),
			}),
			expect.any(String),
		);
	});
});

describe("MCP Tools - MTR", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should execute MTR with default settings", async () => {
		const { agent, tools } = createMockAgent();
		const getToken = () => "Bearer test-token";

		registerGlobalpingTools(agent, getToken);

		const mockResult: MeasurementResponse = {
			id: "mtr-123",
			type: "mtr",
			status: "finished",
			createdAt: "2024-01-01T00:00:00Z",
			updatedAt: "2024-01-01T00:00:10Z",
			target: "google.com",
			probesCount: 3,
			results: [],
		};

		vi.mocked(api.runMeasurement).mockResolvedValue(mockResult);

		const mtrTool = tools.get("mtr");
		await mtrTool.handler({
			target: "google.com",
			packets: 5,
		});

		expect(api.runMeasurement).toHaveBeenCalledWith(
			agent,
			expect.objectContaining({
				type: "mtr",
				measurementOptions: expect.objectContaining({
					packets: 5,
				}),
			}),
			expect.any(String),
		);
	});
});

describe("MCP Tools - HTTP", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should execute HTTP GET with HTTPS default", async () => {
		const { agent, tools } = createMockAgent();
		const getToken = () => "Bearer test-token";

		registerGlobalpingTools(agent, getToken);

		const mockResult: MeasurementResponse = {
			id: "http-123",
			type: "http",
			status: "finished",
			createdAt: "2024-01-01T00:00:00Z",
			updatedAt: "2024-01-01T00:00:10Z",
			target: "example.com",
			probesCount: 3,
			results: [],
		};

		vi.mocked(api.runMeasurement).mockResolvedValue(mockResult);

		const httpTool = tools.get("http");
		await httpTool.handler({
			target: "example.com",
			path: "/api/v1/status",
		});

		expect(api.runMeasurement).toHaveBeenCalledWith(
			agent,
			expect.objectContaining({
				type: "http",
				measurementOptions: expect.objectContaining({
					request: {
						method: "GET",
						path: "/api/v1/status",
						query: undefined,
					},
					protocol: "HTTPS",
					port: 443,
				}),
			}),
			expect.any(String),
		);
	});

	it("should handle custom HTTP port and query params", async () => {
		const { agent, tools } = createMockAgent();
		const getToken = () => "Bearer test-token";

		registerGlobalpingTools(agent, getToken);

		const mockResult: MeasurementResponse = {
			id: "http-456",
			type: "http",
			status: "finished",
			createdAt: "2024-01-01T00:00:00Z",
			updatedAt: "2024-01-01T00:00:10Z",
			target: "api.example.com",
			probesCount: 3,
			results: [],
		};

		vi.mocked(api.runMeasurement).mockResolvedValue(mockResult);

		const httpTool = tools.get("http");
		await httpTool.handler({
			target: "api.example.com",
			method: "HEAD",
			protocol: "HTTP",
			port: 8080,
			query: "limit=10&offset=20",
		});

		expect(api.runMeasurement).toHaveBeenCalledWith(
			agent,
			expect.objectContaining({
				measurementOptions: expect.objectContaining({
					request: {
						method: "HEAD",
						path: undefined,
						query: "limit=10&offset=20",
					},
					protocol: "HTTP",
					port: 8080,
				}),
			}),
			expect.any(String),
		);
	});
});

describe("MCP Tools - Locations", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should fetch and group probe locations", async () => {
		const { agent, tools } = createMockAgent();
		const getToken = () => "Bearer test-token";

		registerGlobalpingTools(agent, getToken);

		const mockProbes = [
			{
				location: {
					continent: "NA",
					country: "US",
					city: "New York",
				},
			},
			{
				location: {
					continent: "NA",
					country: "US",
					city: "Los Angeles",
				},
			},
			{
				location: {
					continent: "EU",
					country: "DE",
					city: "Frankfurt",
				},
			},
		];

		vi.mocked(api.getLocations).mockResolvedValue(mockProbes);

		const locationsTool = tools.get("locations");
		const result = await locationsTool.handler({});

		expect(api.getLocations).toHaveBeenCalledWith(agent, "Bearer test-token");
		expect(result.content[0].text).toContain("NA:");
		expect(result.content[0].text).toContain("EU:");
		expect(result.content[0].text).toContain("Total Probes: 3");
	});
});

describe("MCP Tools - Rate Limits", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should fetch and display rate limits", async () => {
		const { agent, tools } = createMockAgent();
		const getToken = () => "Bearer test-token";

		registerGlobalpingTools(agent, getToken);

		const mockLimits = {
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
			credits: {
				remaining: 5000,
			},
		};

		vi.mocked(api.getRateLimits).mockResolvedValue(mockLimits);

		const limitsTool = tools.get("limits");
		const result = await limitsTool.handler({});

		expect(api.getRateLimits).toHaveBeenCalledWith(agent, "Bearer test-token");
		expect(result.content[0].text).toContain("Limit: 1000");
		expect(result.content[0].text).toContain("Remaining: 800");
		expect(result.content[0].text).toContain("Credits Remaining: 5000");
	});
});

describe("MCP Tools - State Management", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should cache measurements and track last measurement ID", async () => {
		const { agent, tools, state } = createMockAgent();
		const getToken = () => "Bearer test-token";

		registerGlobalpingTools(agent, getToken);

		const mockResult: MeasurementResponse = {
			id: "test-789",
			type: "ping",
			status: "finished",
			createdAt: "2024-01-01T00:00:00Z",
			updatedAt: "2024-01-01T00:00:10Z",
			target: "cloudflare.com",
			probesCount: 3,
			results: [],
		};

		vi.mocked(api.runMeasurement).mockResolvedValue(mockResult);

		const pingTool = tools.get("ping");
		await pingTool.handler({ target: "cloudflare.com" });

		expect(state.measurements["test-789"]).toBeDefined();
		expect(state.lastMeasurementId).toBe("test-789");
	});

	it("should persist measurements across multiple tool calls", async () => {
		const { agent, tools, state } = createMockAgent();
		const getToken = () => "Bearer test-token";

		registerGlobalpingTools(agent, getToken);

		const mockResult1: MeasurementResponse = {
			id: "ping-001",
			type: "ping",
			status: "finished",
			createdAt: "2024-01-01T00:00:00Z",
			updatedAt: "2024-01-01T00:00:10Z",
			target: "google.com",
			probesCount: 3,
			results: [],
		};

		const mockResult2: MeasurementResponse = {
			id: "dns-002",
			type: "dns",
			status: "finished",
			createdAt: "2024-01-01T00:01:00Z",
			updatedAt: "2024-01-01T00:01:10Z",
			target: "example.com",
			probesCount: 3,
			results: [],
		};

		vi.mocked(api.runMeasurement)
			.mockResolvedValueOnce(mockResult1)
			.mockResolvedValueOnce(mockResult2);

		const pingTool = tools.get("ping");
		const dnsTool = tools.get("dns");

		await pingTool.handler({ target: "google.com" });
		await dnsTool.handler({ target: "example.com" });

		expect(Object.keys(state.measurements)).toHaveLength(2);
		expect(state.measurements["ping-001"]).toBeDefined();
		expect(state.measurements["dns-002"]).toBeDefined();
		expect(state.lastMeasurementId).toBe("dns-002");
	});
});

describe("MCP Tools - Tool Registration", () => {
	it("should register all expected tools", () => {
		const { agent, tools } = createMockAgent();
		const getToken = () => "Bearer test-token";

		registerGlobalpingTools(agent, getToken);

		const expectedTools = ["ping", "traceroute", "dns", "mtr", "http", "locations", "limits"];

		for (const toolName of expectedTools) {
			expect(tools.has(toolName)).toBe(true);
		}
	});

	it("should register tools with correct schemas", () => {
		const { agent, tools } = createMockAgent();
		const getToken = () => "Bearer test-token";

		registerGlobalpingTools(agent, getToken);

		const pingTool = tools.get("ping");
		expect(pingTool.schema).toHaveProperty("target");
		expect(pingTool.schema).toHaveProperty("locations");
		expect(pingTool.schema).toHaveProperty("limit");
		expect(pingTool.schema).toHaveProperty("packets");

		const dnsTool = tools.get("dns");
		expect(dnsTool.schema).toHaveProperty("target");
		expect(dnsTool.schema).toHaveProperty("queryType");
		expect(dnsTool.schema).toHaveProperty("resolver");
		expect(dnsTool.schema).toHaveProperty("trace");
	});
});
