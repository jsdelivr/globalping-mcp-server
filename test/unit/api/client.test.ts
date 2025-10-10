/**
 * Tests for api/client.ts (using official globalping library)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Globalping } from "globalping";
import {
	createMeasurement,
	pollMeasurementResult,
	runMeasurement,
	getLocations,
	getRateLimits,
} from "../../../src/api/client";
import type { MeasurementOptions } from "../../../src/types";

// Mock the Globalping module
vi.mock("globalping");

// Mock agent
const createMockAgent = () => ({
	setIsAuthenticated: vi.fn(),
});

describe("createMeasurement", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should create measurement successfully", async () => {
		const agent = createMockAgent();
		const options = {
			type: "ping" as const,
			target: "google.com",
			limit: 3,
		};
		const token = "test-token-123";

		const mockResult = {
			ok: true as const,
			data: { id: "measurement-123", probesCount: 3 },
		};

		const createMeasurementMock = vi.fn().mockResolvedValue(mockResult);
		vi.mocked(Globalping).mockImplementation(
			() =>
				({
					createMeasurement: createMeasurementMock,
				}) as any,
		);

		const result = await createMeasurement(agent as any, options, token);

		expect(result).toEqual({ id: "measurement-123", probesCount: 3 });
	});

	it("should throw error when no token provided", async () => {
		const agent = createMockAgent();
		const options = {
			type: "ping" as const,
			target: "google.com",
		};

		await expect(createMeasurement(agent as any, options, "")).rejects.toThrow(
			"No token provided",
		);
	});

	it("should handle API error response", async () => {
		const agent = createMockAgent();
		const options = {
			type: "ping" as const,
			target: "invalid",
		};
		const token = "test-token-123";

		const mockResult = {
			ok: false as const,
			data: { error: { type: "validation_error", message: "Invalid target" } },
			response: { status: 400 },
		};

		const createMeasurementMock = vi.fn().mockResolvedValue(mockResult);
		vi.mocked(Globalping).mockImplementation(
			() =>
				({
					createMeasurement: createMeasurementMock,
				}) as any,
		);
		vi.mocked(Globalping.isHttpStatus).mockReturnValue(false);

		await expect(createMeasurement(agent as any, options, token)).rejects.toThrow(
			"Globalping API error (400)",
		);
	});

	it("should handle auth error (401)", async () => {
		const agent = createMockAgent();
		const options = {
			type: "ping" as const,
			target: "google.com",
		};
		const token = "invalid-token";

		const mockResult = {
			ok: false as const,
			data: { error: { type: "unauthorized", message: "Invalid token" } },
			response: { status: 401 },
		};

		const createMeasurementMock = vi.fn().mockResolvedValue(mockResult);
		vi.mocked(Globalping).mockImplementation(
			() =>
				({
					createMeasurement: createMeasurementMock,
				}) as any,
		);
		vi.mocked(Globalping.isHttpStatus).mockReturnValueOnce(true);

		await expect(createMeasurement(agent as any, options, token)).rejects.toThrow();
		expect(agent.setIsAuthenticated).toHaveBeenCalledWith(false);
	});
});

describe("pollMeasurementResult", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should await measurement and return result", async () => {
		const agent = createMockAgent();
		const measurementId = "test-measurement-id";
		const token = "test-token-123";

		const mockResult = {
			ok: true as const,
			data: {
				id: measurementId,
				type: "ping",
				status: "finished",
				createdAt: "2024-01-01T00:00:00Z",
				updatedAt: "2024-01-01T00:00:10Z",
				target: "google.com",
				probesCount: 1,
				results: [],
			},
		};

		const awaitMeasurementMock = vi.fn().mockResolvedValue(mockResult);
		vi.mocked(Globalping).mockImplementation(
			() =>
				({
					awaitMeasurement: awaitMeasurementMock,
				}) as any,
		);

		const result = await pollMeasurementResult(agent as any, measurementId, token);

		expect(result).toEqual(mockResult.data);
	});

	it("should throw error when no token provided", async () => {
		const agent = createMockAgent();

		await expect(pollMeasurementResult(agent as any, "id", "")).rejects.toThrow(
			"No token provided",
		);
	});

	it("should handle auth error during polling", async () => {
		const agent = createMockAgent();
		const measurementId = "test-measurement-id";
		const token = "invalid-token";

		const mockResult = {
			ok: false as const,
			data: { error: { type: "unauthorized" } },
			response: { status: 401 },
		};

		const awaitMeasurementMock = vi.fn().mockResolvedValue(mockResult);
		vi.mocked(Globalping).mockImplementation(
			() =>
				({
					awaitMeasurement: awaitMeasurementMock,
				}) as any,
		);
		vi.mocked(Globalping.isHttpStatus).mockReturnValueOnce(true);

		await expect(pollMeasurementResult(agent as any, measurementId, token)).rejects.toThrow();
		expect(agent.setIsAuthenticated).toHaveBeenCalledWith(false);
	});
});

describe("runMeasurement", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should create and await measurement successfully", async () => {
		const agent = createMockAgent();
		const options: MeasurementOptions = {
			type: "ping",
			target: "google.com",
		};
		const token = "test-token-123";

		const createResult = {
			ok: true as const,
			data: { id: "measurement-123", probesCount: 3 },
		};

		const awaitResult = {
			ok: true as const,
			data: {
				id: "measurement-123",
				type: "ping",
				status: "finished",
				createdAt: "2024-01-01T00:00:00Z",
				updatedAt: "2024-01-01T00:00:10Z",
				target: "google.com",
				probesCount: 3,
				results: [],
			},
		};

		const createMeasurementMock = vi.fn().mockResolvedValue(createResult);
		const awaitMeasurementMock = vi.fn().mockResolvedValue(awaitResult);
		vi.mocked(Globalping).mockImplementation(
			() =>
				({
					createMeasurement: createMeasurementMock,
					awaitMeasurement: awaitMeasurementMock,
				}) as any,
		);

		const result = await runMeasurement(agent as any, options, token);

		expect(result).toEqual(awaitResult.data);
	});

	it("should set default limit if not specified", async () => {
		const agent = createMockAgent();
		const options: MeasurementOptions = {
			type: "ping",
			target: "google.com",
		};
		const token = "test-token-123";

		const createMeasurementMock = vi.fn().mockResolvedValue({
			ok: true as const,
			data: { id: "test", probesCount: 3 },
		});

		const awaitMeasurementMock = vi.fn().mockResolvedValue({
			ok: true as const,
			data: {
				id: "test",
				type: "ping",
				status: "finished",
				createdAt: "",
				updatedAt: "",
				target: "google.com",
				probesCount: 3,
				results: [],
			},
		});

		vi.mocked(Globalping).mockImplementation(
			() =>
				({
					createMeasurement: createMeasurementMock,
					awaitMeasurement: awaitMeasurementMock,
				}) as any,
		);

		await runMeasurement(agent as any, options, token);

		const createCall = createMeasurementMock.mock.calls[0][0];
		expect(createCall.limit).toBe(3); // Default limit
	});

	it("should cap limit at maximum", async () => {
		const agent = createMockAgent();
		const options: MeasurementOptions = {
			type: "ping",
			target: "google.com",
			limit: 200,
		};
		const token = "test-token-123";

		const createMeasurementMock = vi.fn().mockResolvedValue({
			ok: true as const,
			data: { id: "test", probesCount: 100 },
		});

		const awaitMeasurementMock = vi.fn().mockResolvedValue({
			ok: true as const,
			data: {
				id: "test",
				type: "ping",
				status: "finished",
				createdAt: "",
				updatedAt: "",
				target: "google.com",
				probesCount: 100,
				results: [],
			},
		});

		vi.mocked(Globalping).mockImplementation(
			() =>
				({
					createMeasurement: createMeasurementMock,
					awaitMeasurement: awaitMeasurementMock,
				}) as any,
		);

		await runMeasurement(agent as any, options, token);

		const createCall = createMeasurementMock.mock.calls[0][0];
		expect(createCall.limit).toBe(100); // Capped at max
	});

	it("should set limit to default if below 1", async () => {
		const agent = createMockAgent();
		const options: MeasurementOptions = {
			type: "ping",
			target: "google.com",
			limit: 0,
		};
		const token = "test-token-123";

		const createMeasurementMock = vi.fn().mockResolvedValue({
			ok: true as const,
			data: { id: "test", probesCount: 1 },
		});

		const awaitMeasurementMock = vi.fn().mockResolvedValue({
			ok: true as const,
			data: {
				id: "test",
				type: "ping",
				status: "finished",
				createdAt: "",
				updatedAt: "",
				target: "google.com",
				probesCount: 1,
				results: [],
			},
		});

		vi.mocked(Globalping).mockImplementation(
			() =>
				({
					createMeasurement: createMeasurementMock,
					awaitMeasurement: awaitMeasurementMock,
				}) as any,
		);

		await runMeasurement(agent as any, options, token);

		const createCall = createMeasurementMock.mock.calls[0][0];
		expect(createCall.limit).toBe(3); // Set to default
	});
});

describe("getLocations", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should fetch locations successfully", async () => {
		const agent = createMockAgent();
		const token = "test-token-123";

		const mockLocations = [
			{
				location: {
					continent: "NA",
					country: "US",
					city: "New York",
				},
			},
		];

		const listProbesMock = vi.fn().mockResolvedValue({
			ok: true as const,
			data: mockLocations,
		});

		vi.mocked(Globalping).mockImplementation(
			() =>
				({
					listProbes: listProbesMock,
				}) as any,
		);

		const result = await getLocations(agent as any, token);

		expect(result).toEqual(mockLocations);
	});

	it("should throw error when no token provided", async () => {
		const agent = createMockAgent();

		await expect(getLocations(agent as any, "")).rejects.toThrow("No token provided");
	});

	it("should handle API error", async () => {
		const agent = createMockAgent();
		const token = "test-token-123";

		const listProbesMock = vi.fn().mockResolvedValue({
			ok: false as const,
			data: { error: { type: "internal_error", message: "Server error" } },
			response: { status: 500 },
		});

		vi.mocked(Globalping).mockImplementation(
			() =>
				({
					listProbes: listProbesMock,
				}) as any,
		);
		vi.mocked(Globalping.isHttpStatus).mockReturnValue(false);

		await expect(getLocations(agent as any, token)).rejects.toThrow();
	});
});

describe("getRateLimits", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should fetch rate limits successfully", async () => {
		const agent = createMockAgent();
		const token = "test-token-123";

		const mockLimits = {
			rateLimit: {
				measurements: {
					create: { limit: 100, remaining: 95, reset: 1234567890 },
				},
			},
		};

		const getLimitsMock = vi.fn().mockResolvedValue({
			ok: true as const,
			data: mockLimits,
		});

		vi.mocked(Globalping).mockImplementation(
			() =>
				({
					getLimits: getLimitsMock,
				}) as any,
		);

		const result = await getRateLimits(agent as any, token);

		expect(result).toEqual(mockLimits);
	});

	it("should throw error when no token provided", async () => {
		const agent = createMockAgent();

		await expect(getRateLimits(agent as any, "")).rejects.toThrow("No token provided");
	});

	it("should handle API error", async () => {
		const agent = createMockAgent();
		const token = "test-token-123";

		const getLimitsMock = vi.fn().mockResolvedValue({
			ok: false as const,
			data: { error: { type: "internal_error", message: "Server error" } },
			response: { status: 500 },
		});

		vi.mocked(Globalping).mockImplementation(
			() =>
				({
					getLimits: getLimitsMock,
				}) as any,
		);
		vi.mocked(Globalping.isHttpStatus).mockReturnValue(false);

		await expect(getRateLimits(agent as any, token)).rejects.toThrow();
	});
});
