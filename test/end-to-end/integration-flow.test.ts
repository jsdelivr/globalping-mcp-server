/**
 * End-to-End Integration Tests
 *
 * Tests complete user flows with the Globalping API mock
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockEnv, createGlobalpingAPIFetch, cleanupMocks } from "./helpers";

// Mock fetch with Globalping API
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe("Integration Flow - API Key Measurement Flow", () => {
	let env: ReturnType<typeof createMockEnv>;

	beforeEach(() => {
		env = createMockEnv();
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanupMocks(env);
	});

	it("should create and retrieve measurement with API key", async () => {
		const apiKey = "abcdefghijklmnopqrstuvwxyz123456";
		const apiFetch = createGlobalpingAPIFetch();
		mockFetch.mockImplementation(apiFetch as any);

		// Create measurement
		const createResponse = await apiFetch("https://api.globalping.io/v1/measurements", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				type: "dns",
				target: "cloudflare.com",
				limit: 5,
				measurementOptions: {
					query: { type: "A" },
					resolver: "1.1.1.1",
				},
			}),
		});

		expect(createResponse.ok).toBe(true);
		const createData = await createResponse.json();

		// Retrieve results
		const measurementResponse = await apiFetch(
			`https://api.globalping.io/v1/measurements/${createData.id}`,
			{
				headers: {
					Authorization: `Bearer ${apiKey}`,
				},
			},
		);

		expect(measurementResponse.ok).toBe(true);
		const measurementData = await measurementResponse.json();
		expect(measurementData.type).toBe("dns");
		expect(measurementData.status).toBe("finished");
	});

	it("should handle multiple measurements in sequence", async () => {
		const apiKey = "abcdefghijklmnopqrstuvwxyz123456";
		const apiFetch = createGlobalpingAPIFetch();
		mockFetch.mockImplementation(apiFetch as any);

		const measurements = [
			{ type: "ping" as const, target: "google.com" },
			{ type: "traceroute" as const, target: "cloudflare.com" },
			{ type: "http" as const, target: "example.com" },
		];

		const results = [];

		for (const measurement of measurements) {
			const createResponse = await apiFetch("https://api.globalping.io/v1/measurements", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					...measurement,
					limit: 3,
				}),
			});

			const createData = await createResponse.json();

			const measurementResponse = await apiFetch(
				`https://api.globalping.io/v1/measurements/${createData.id}`,
				{
					headers: {
						Authorization: `Bearer ${apiKey}`,
					},
				},
			);

			const measurementData = await measurementResponse.json();
			results.push(measurementData);
		}

		expect(results).toHaveLength(3);
		expect(results[0].type).toBe("ping");
		expect(results[1].type).toBe("traceroute");
		expect(results[2].type).toBe("http");
	});
});
