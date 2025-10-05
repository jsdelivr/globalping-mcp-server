/**
 * Tests for api/client.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	createMeasurement,
	pollMeasurementResult,
	runMeasurement,
	getLocations,
	getRateLimits,
} from "../../src/api/client";
import type {
	MeasurementOptions,
	CreateMeasurementResponse,
	MeasurementResponse,
	FinishedPingTestResult,
} from "../../src/types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

// Mock agent
const createMockAgent = () => ({
	setIsAuthenticated: vi.fn(),
});

describe("createMeasurement", () => {
	beforeEach(() => {
		mockFetch.mockClear();
	});

	it("should create measurement successfully", async () => {
		const agent = createMockAgent();
		const options: MeasurementOptions = {
			type: "ping",
			target: "google.com",
			limit: 3,
		};
		const token = "test-token-12345678901234567890";

		const mockResponse: CreateMeasurementResponse = {
			id: "measurement-id-123",
			probesCount: 3,
		};

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const result = await createMeasurement(agent as any, options, token);

		expect(result).toEqual(mockResponse);
		expect(mockFetch).toHaveBeenCalledWith(
			expect.stringContaining("/measurements"),
			expect.objectContaining({
				method: "POST",
				headers: expect.objectContaining({
					Authorization: expect.stringContaining("Bearer"),
				}),
				body: JSON.stringify(options),
			}),
		);
	});

	it("should throw error when no token provided", async () => {
		const agent = createMockAgent();
		const options: MeasurementOptions = {
			type: "ping",
			target: "google.com",
		};

		await expect(createMeasurement(agent as any, options, "")).rejects.toThrow(
			"No token provided",
		);
	});

	it("should handle API error response", async () => {
		const agent = createMockAgent();
		const options: MeasurementOptions = {
			type: "ping",
			target: "invalid",
		};
		const token = "test-token-12345678901234567890";

		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 400,
			json: async () => ({
				error: {
					type: "validation_error",
					message: "Invalid target",
				},
			}),
		});

		await expect(createMeasurement(agent as any, options, token)).rejects.toThrow(
			"Globalping API error (400)",
		);
	});

	it("should handle auth error (401)", async () => {
		const agent = createMockAgent();
		const options: MeasurementOptions = {
			type: "ping",
			target: "google.com",
		};
		const token = "invalid-token-12345678901234567890";

		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 401,
			json: async () => ({
				error: {
					type: "unauthorized",
					message: "Invalid token",
				},
			}),
		});

		await expect(createMeasurement(agent as any, options, token)).rejects.toThrow();
		expect(agent.setIsAuthenticated).toHaveBeenCalledWith(false);
	});

	it("should sanitize token before sending", async () => {
		const agent = createMockAgent();
		const options: MeasurementOptions = {
			type: "ping",
			target: "google.com",
		};
		const token = "test-token-12345678901234567890"; // without Bearer

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ id: "test-id", probesCount: 1 }),
		});

		await createMeasurement(agent as any, options, token);

		const callArgs = mockFetch.mock.calls[0];
		const headers = callArgs[1].headers as Record<string, string>;
		expect(headers.Authorization).toContain("Bearer");
	});
});

describe("pollMeasurementResult", () => {
	beforeEach(() => {
		mockFetch.mockClear();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should poll and return completed measurement", async () => {
		const agent = createMockAgent();
		const measurementId = "test-measurement-id";
		const token = "test-token-12345678901234567890";

		const completedMeasurement: MeasurementResponse = {
			id: measurementId,
			type: "ping",
			status: "finished",
			createdAt: "2024-01-01T00:00:00Z",
			updatedAt: "2024-01-01T00:00:10Z",
			target: "google.com",
			probesCount: 1,
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
						rawOutput: "PING google.com",
						resolvedAddress: "google.com",
						resolvedHostname: "google.com",
						stats: {
							min: 10.12,
							avg: 15.34,
							max: 20.56,
							total: 100,
							rcv: 3,
							drop: 0,
							loss: 0,
						},
						timings: [
							{
								rtt: 12.34,
								ttl: 64,
							},
						],
					} satisfies FinishedPingTestResult,
				},
			],
		};

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => completedMeasurement,
		});

		const promise = pollMeasurementResult(agent as any, measurementId, token, 10, 100);

		const result = await promise;

		expect(result).toEqual(completedMeasurement);
	});

	it("should retry on in-progress measurement", async () => {
		const agent = createMockAgent();
		const measurementId = "test-measurement-id";
		const token = "test-token-12345678901234567890";

		const inProgressMeasurement: MeasurementResponse = {
			id: measurementId,
			type: "ping",
			status: "in-progress",
			createdAt: "2024-01-01T00:00:00Z",
			updatedAt: "2024-01-01T00:00:05Z",
			target: "google.com",
			probesCount: 1,
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
						status: "in-progress",
						rawOutput: "",
					},
				},
			],
		};

		const completedMeasurement: MeasurementResponse = {
			...inProgressMeasurement,
			status: "finished",
			results: [
				{
					...inProgressMeasurement.results[0],
					result: {
						status: "finished",
						rawOutput: "PING google.com",
						resolvedAddress: "google.com",
						resolvedHostname: "google.com",
						stats: {
							min: 10.12,
							avg: 15.34,
							max: 20.56,
							total: 100,
							rcv: 3,
							drop: 0,
							loss: 0,
						},
						timings: [
							{
								rtt: 12.34,
								ttl: 64,
							},
						],
					} satisfies FinishedPingTestResult,
				},
			],
		};

		// First call returns in-progress, second returns finished
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => inProgressMeasurement,
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => completedMeasurement,
			});

		const promise = pollMeasurementResult(agent as any, measurementId, token, 10, 100);

		// Fast-forward time for the first delay
		await vi.advanceTimersByTimeAsync(100);

		const result = await promise;

		expect(result).toEqual(completedMeasurement);
		expect(mockFetch).toHaveBeenCalledTimes(2);
	});

	it("should throw timeout error after max attempts", async () => {
		const agent = createMockAgent();
		const measurementId = "test-measurement-id";
		const token = "test-token-12345678901234567890";

		const inProgressMeasurement: MeasurementResponse = {
			id: measurementId,
			type: "ping",
			status: "in-progress",
			createdAt: "2024-01-01T00:00:00Z",
			updatedAt: "2024-01-01T00:00:05Z",
			target: "google.com",
			probesCount: 1,
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
						status: "in-progress",
						rawOutput: "",
					},
				},
			],
		};

		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => inProgressMeasurement,
		});

		const promise = expect(
			pollMeasurementResult(agent as any, measurementId, token, 3, 5),
		).rejects.toThrow();

		// Fast-forward through all polling attempts (3 attempts × 5ms delay)
		await vi.advanceTimersByTimeAsync(15);

		await promise;
	});

	it("should throw error when no token provided", async () => {
		const agent = createMockAgent();

		await expect(pollMeasurementResult(agent as any, "id", "", 10, 100)).rejects.toThrow(
			"No token provided",
		);
	});

	it("should handle auth error during polling", async () => {
		const agent = createMockAgent();
		const measurementId = "test-measurement-id";
		const token = "invalid-token-12345678901234567890";

		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 401,
		});

		await expect(
			pollMeasurementResult(agent as any, measurementId, token, 10, 5),
		).rejects.toThrow(
			"Globalping API error: Authentication error - token may be invalid or expired",
		);
		expect(agent.setIsAuthenticated).toHaveBeenCalledWith(false);
	});
});

describe("runMeasurement", () => {
	beforeEach(() => {
		mockFetch.mockClear();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should create and poll measurement successfully", async () => {
		const agent = createMockAgent();
		const options: MeasurementOptions = {
			type: "ping",
			target: "google.com",
		};
		const token = "test-token-12345678901234567890";

		const createResponse: CreateMeasurementResponse = {
			id: "measurement-123",
			probesCount: 3,
		};

		const measurementResponse: MeasurementResponse = {
			id: "measurement-123",
			type: "ping",
			status: "finished",
			createdAt: "2024-01-01T00:00:00Z",
			updatedAt: "2024-01-01T00:00:10Z",
			target: "google.com",
			probesCount: 3,
			results: [],
		};

		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => createResponse,
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => measurementResponse,
			});

		const promise = runMeasurement(agent as any, options, token);

		const result = await promise;

		expect(result).toEqual(measurementResponse);
		expect(mockFetch).toHaveBeenCalledTimes(2);
	});

	it("should set default limit if not specified", async () => {
		const agent = createMockAgent();
		const options: MeasurementOptions = {
			type: "ping",
			target: "google.com",
		};
		const token = "test-token-12345678901234567890";

		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ id: "test", probesCount: 3 }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					id: "test",
					type: "ping",
					status: "finished",
					createdAt: "",
					updatedAt: "",
					target: "google.com",
					probesCount: 3,
					results: [],
				}),
			});

		await runMeasurement(agent as any, options, token);

		const callArgs = mockFetch.mock.calls[0];
		const body = JSON.parse(callArgs[1].body);
		expect(body.limit).toBe(3); // Default limit
	});

	it("should cap limit at maximum", async () => {
		const agent = createMockAgent();
		const options: MeasurementOptions = {
			type: "ping",
			target: "google.com",
			limit: 200, // Over the max of 100
		};
		const token = "test-token-12345678901234567890";

		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ id: "test", probesCount: 100 }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					id: "test",
					type: "ping",
					status: "finished",
					createdAt: "",
					updatedAt: "",
					target: "google.com",
					probesCount: 100,
					results: [],
				}),
			});

		await runMeasurement(agent as any, options, token);

		const callArgs = mockFetch.mock.calls[0];
		const body = JSON.parse(callArgs[1].body);
		expect(body.limit).toBe(100); // Capped at max
	});

	it("should set limit to default if below 1", async () => {
		const agent = createMockAgent();
		const options: MeasurementOptions = {
			type: "ping",
			target: "google.com",
			limit: 0,
		};
		const token = "test-token-12345678901234567890";

		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ id: "test", probesCount: 1 }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					id: "test",
					type: "ping",
					status: "finished",
					createdAt: "",
					updatedAt: "",
					target: "google.com",
					probesCount: 1,
					results: [],
				}),
			});

		await runMeasurement(agent as any, options, token);

		const callArgs = mockFetch.mock.calls[0];
		const body = JSON.parse(callArgs[1].body);
		expect(body.limit).toBe(3); // Set to minimum
	});
});

describe("getLocations", () => {
	beforeEach(() => {
		mockFetch.mockClear();
	});

	it("should fetch locations successfully", async () => {
		const agent = createMockAgent();
		const token = "test-token-12345678901234567890";

		const mockLocations = [
			{
				location: {
					continent: "NA",
					country: "US",
					city: "New York",
				},
			},
		];

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockLocations,
		});

		const result = await getLocations(agent as any, token);

		expect(result).toEqual(mockLocations);
		expect(mockFetch).toHaveBeenCalledWith(
			expect.stringContaining("/probes"),
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: expect.stringContaining("Bearer"),
				}),
			}),
		);
	});

	it("should throw error when no token provided", async () => {
		const agent = createMockAgent();

		await expect(getLocations(agent as any, "")).rejects.toThrow("No token provided");
	});

	it("should handle API error", async () => {
		const agent = createMockAgent();
		const token = "test-token-12345678901234567890";

		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 500,
			json: async () => ({
				error: {
					type: "internal_error",
					message: "Server error",
				},
			}),
		});

		await expect(getLocations(agent as any, token)).rejects.toThrow();
	});
});

describe("getRateLimits", () => {
	beforeEach(() => {
		mockFetch.mockClear();
	});

	it("should fetch rate limits successfully", async () => {
		const agent = createMockAgent();
		const token = "test-token-12345678901234567890";

		const mockLimits = {
			rateLimit: {
				measurements: {
					create: 100,
					remaining: 95,
					reset: 1234567890,
				},
			},
		};

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockLimits,
		});

		const result = await getRateLimits(agent as any, token);

		expect(result).toEqual(mockLimits);
		expect(mockFetch).toHaveBeenCalledWith(
			expect.stringContaining("/limits"),
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: expect.stringContaining("Bearer"),
				}),
			}),
		);
	});

	it("should throw error when no token provided", async () => {
		const agent = createMockAgent();

		await expect(getRateLimits(agent as any, "")).rejects.toThrow("No token provided");
	});

	it("should handle API error", async () => {
		const agent = createMockAgent();
		const token = "test-token-12345678901234567890";

		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 500,
			json: async () => ({
				error: {
					type: "internal_error",
					message: "Server error",
				},
			}),
		});

		await expect(getRateLimits(agent as any, token)).rejects.toThrow();
	});
});
