/**
 * Tests for mcp/helpers.ts
 */
import { describe, it, expect } from "vitest";
import { parseLocations, calculateAverages, formatMeasurementSummary } from "../../../src/mcp/helpers";

describe("parseLocations", () => {
	it("should return undefined for undefined input", () => {
		const result = parseLocations(undefined);
		expect(result).toBeUndefined();
	});

	it("should parse single string location", () => {
		const result = parseLocations("US");
		expect(result).toEqual([{ magic: "US" }]);
	});

	it("should parse array of locations", () => {
		const result = parseLocations(["US", "Europe", "Asia"]);
		expect(result).toEqual([{ magic: "US" }, { magic: "Europe" }, { magic: "Asia" }]);
	});

	it("should parse empty array", () => {
		const result = parseLocations([]);
		expect(result).toEqual([]);
	});

	it("should parse single item array", () => {
		const result = parseLocations(["London"]);
		expect(result).toEqual([{ magic: "London" }]);
	});

	it("should parse locations with special characters", () => {
		const result = parseLocations(["London+UK", "AS13335"]);
		expect(result).toEqual([{ magic: "London+UK" }, { magic: "AS13335" }]);
	});

	it("should parse measurement ID as location", () => {
		const result = parseLocations(["01HT4DGF5ZS7B2M93QP5ZTS3DN"]);
		expect(result).toEqual([{ magic: "01HT4DGF5ZS7B2M93QP5ZTS3DN" }]);
	});

	it("should handle empty string", () => {
		const result = parseLocations("");
		expect(result).toEqual(undefined);
	});
});

describe("calculateAverages", () => {
	it("should calculate averages for successful ping results", () => {
		const results = [
			{
				result: {
					status: "finished",
					stats: {
						total: 3,
						rcv: 3,
						drop: 0,
						loss: 0,
						min: 10,
						avg: 15,
						max: 20,
					},
				},
			},
			{
				result: {
					status: "finished",
					stats: {
						total: 3,
						rcv: 2,
						drop: 1,
						loss: 33.33,
						min: 12,
						avg: 18,
						max: 24,
					},
				},
			},
		];

		const summary = calculateAverages(results);

		expect(summary.probeCount).toBe(2);
		expect(summary.successfulProbes).toBe(2);
		expect(summary.totalPackets).toBe(6);
		expect(summary.totalReceived).toBe(5);
		expect(summary.totalDropped).toBe(1);
		expect(summary.averageLoss).toBeCloseTo(16.67, 1);
		expect(summary.minRtt).toBe(10);
		expect(summary.maxRtt).toBe(24);
		expect(summary.avgRtt).toBeCloseTo(16.5, 1);
	});

	it("should handle empty results array", () => {
		const summary = calculateAverages([]);

		expect(summary.probeCount).toBe(0);
		expect(summary.successfulProbes).toBe(0);
		expect(summary.totalPackets).toBe(0);
		expect(summary.totalReceived).toBe(0);
		expect(summary.totalDropped).toBe(0);
		expect(summary.averageLoss).toBe(0);
		expect(summary.minRtt).toBeNull();
		expect(summary.maxRtt).toBeNull();
		expect(summary.avgRtt).toBeNull();
	});

	it("should filter out non-finished results", () => {
		const results = [
			{
				result: {
					status: "in-progress",
					stats: {
						total: 3,
						rcv: 3,
						drop: 0,
						loss: 0,
						min: 10,
						avg: 15,
						max: 20,
					},
				},
			},
			{
				result: {
					status: "finished",
					stats: {
						total: 3,
						rcv: 3,
						drop: 0,
						loss: 0,
						min: 10,
						avg: 15,
						max: 20,
					},
				},
			},
		];

		const summary = calculateAverages(results);

		expect(summary.probeCount).toBe(2);
		expect(summary.successfulProbes).toBe(1);
		expect(summary.totalPackets).toBe(3);
	});

	it("should filter out results without stats", () => {
		const results = [
			{
				result: {
					status: "finished",
				},
			},
			{
				result: {
					status: "finished",
					stats: {
						total: 3,
						rcv: 3,
						drop: 0,
						loss: 0,
						min: 10,
						avg: 15,
						max: 20,
					},
				},
			},
		];

		const summary = calculateAverages(results);

		expect(summary.probeCount).toBe(2);
		expect(summary.successfulProbes).toBe(1);
	});

	it("should handle null RTT values", () => {
		const results = [
			{
				result: {
					status: "finished",
					stats: {
						total: 3,
						rcv: 0,
						drop: 3,
						loss: 100,
						min: null,
						avg: null,
						max: null,
					},
				},
			},
		];

		const summary = calculateAverages(results);

		expect(summary.minRtt).toBeNull();
		expect(summary.maxRtt).toBeNull();
		expect(summary.avgRtt).toBeNull();
		expect(summary.averageLoss).toBe(100);
	});

	it("should calculate correct min RTT across multiple probes", () => {
		const results = [
			{
				result: {
					status: "finished",
					stats: {
						total: 3,
						rcv: 3,
						drop: 0,
						loss: 0,
						min: 25,
						avg: 30,
						max: 35,
					},
				},
			},
			{
				result: {
					status: "finished",
					stats: {
						total: 3,
						rcv: 3,
						drop: 0,
						loss: 0,
						min: 10,
						avg: 15,
						max: 20,
					},
				},
			},
		];

		const summary = calculateAverages(results);

		expect(summary.minRtt).toBe(10);
	});

	it("should calculate correct max RTT across multiple probes", () => {
		const results = [
			{
				result: {
					status: "finished",
					stats: {
						total: 3,
						rcv: 3,
						drop: 0,
						loss: 0,
						min: 10,
						avg: 15,
						max: 20,
					},
				},
			},
			{
				result: {
					status: "finished",
					stats: {
						total: 3,
						rcv: 3,
						drop: 0,
						loss: 0,
						min: 25,
						avg: 30,
						max: 50,
					},
				},
			},
		];

		const summary = calculateAverages(results);

		expect(summary.maxRtt).toBe(50);
	});

	it("should handle zero packets correctly", () => {
		const results = [
			{
				result: {
					status: "finished",
					stats: {
						total: 0,
						rcv: 0,
						drop: 0,
						loss: 0,
						min: null,
						avg: null,
						max: null,
					},
				},
			},
		];

		const summary = calculateAverages(results);

		expect(summary.averageLoss).toBe(0);
	});

	it("should calculate 100% packet loss correctly", () => {
		const results = [
			{
				result: {
					status: "finished",
					stats: {
						total: 10,
						rcv: 0,
						drop: 10,
						loss: 100,
						min: null,
						avg: null,
						max: null,
					},
				},
			},
		];

		const summary = calculateAverages(results);

		expect(summary.averageLoss).toBe(100);
	});
});

describe("formatMeasurementSummary", () => {
	it("should format ping measurement summary", () => {
		const measurement = {
			id: "test-id-123",
			type: "ping",
			target: "google.com",
			status: "finished",
			probesCount: 2,
			results: [
				{
					probe: {
						city: "New York",
						country: "US",
						asn: 12345,
					},
					result: {
						status: "finished",
						stats: {
							min: 10,
							avg: 15,
							max: 20,
							loss: 0,
						},
					},
				},
			],
		};

		const summary = formatMeasurementSummary(measurement);

		expect(summary).toContain("Measurement ID: test-id-123");
		expect(summary).toContain("Type: ping");
		expect(summary).toContain("Target: google.com");
		expect(summary).toContain("Status: finished");
		expect(summary).toContain("Probes: 2");
		expect(summary).toContain("Ping Results:");
		expect(summary).toContain("New York, US (12345)");
	});

	it("should format traceroute measurement summary", () => {
		const measurement = {
			id: "trace-id-456",
			type: "traceroute",
			target: "cloudflare.com",
			status: "finished",
			probesCount: 1,
			results: [
				{
					probe: {
						city: "London",
						country: "GB",
						asn: 67890,
					},
					result: {
						status: "finished",
						hops: [
							{
								resolvedHostname: "router1.example.com",
								resolvedAddress: "192.168.1.1",
								timings: [{ rtt: 5 }],
							},
							{
								resolvedHostname: null,
								resolvedAddress: "10.0.0.1",
								timings: [{ rtt: 10 }],
							},
						],
					},
				},
			],
		};

		const summary = formatMeasurementSummary(measurement);

		expect(summary).toContain("Measurement ID: trace-id-456");
		expect(summary).toContain("Type: traceroute");
		expect(summary).toContain("Traceroute Results:");
		expect(summary).toContain("London, GB (67890)");
		expect(summary).toContain("router1.example.com");
		expect(summary).toContain("10.0.0.1");
	});

	it("should format DNS measurement summary", () => {
		const measurement = {
			id: "dns-id-789",
			type: "dns",
			target: "example.com",
			status: "finished",
			probesCount: 1,
			results: [
				{
					probe: {
						city: "Tokyo",
						country: "JP",
						asn: 11111,
					},
					result: {
						status: "finished",
						resolver: "8.8.8.8",
						timings: { total: 50 },
						statusCodeName: "NOERROR",
						statusCode: 0,
						answers: [
							{
								name: "example.com",
								ttl: 3600,
								class: "IN",
								type: "A",
								value: "93.184.216.34",
							},
						],
					},
				},
			],
		};

		const summary = formatMeasurementSummary(measurement);

		expect(summary).toContain("DNS Results:");
		expect(summary).toContain("Tokyo, JP (11111)");
		expect(summary).toContain("8.8.8.8");
		expect(summary).toContain("93.184.216.34");
	});

	it("should format MTR measurement summary", () => {
		const measurement = {
			id: "mtr-id-101",
			type: "mtr",
			target: "github.com",
			status: "finished",
			probesCount: 1,
			results: [
				{
					probe: {
						city: "Berlin",
						country: "DE",
						asn: 22222,
					},
					result: {
						status: "finished",
						hops: [
							{
								resolvedHostname: "gateway.example.com",
								resolvedAddress: "192.168.1.1",
								stats: {
									loss: 0,
									avg: 2.5,
								},
							},
						],
					},
				},
			],
		};

		const summary = formatMeasurementSummary(measurement);

		expect(summary).toContain("MTR Results:");
		expect(summary).toContain("Berlin, DE (22222)");
		expect(summary).toContain("gateway.example.com");
	});

	it("should format HTTP measurement summary", () => {
		const measurement = {
			id: "http-id-202",
			type: "http",
			target: "api.example.com",
			status: "finished",
			probesCount: 1,
			results: [
				{
					probe: {
						city: "Sydney",
						country: "AU",
						asn: 33333,
					},
					result: {
						status: "finished",
						statusCode: 200,
						statusCodeName: "OK",
						timings: {
							total: 150,
							dns: 10,
							tcp: 20,
							tls: 30,
							firstByte: 50,
							download: 40,
						},
						tls: {
							protocol: "TLSv1.3",
							cipherName: "TLS_AES_256_GCM_SHA384",
							authorized: true,
						},
					},
				},
			],
		};

		const summary = formatMeasurementSummary(measurement);

		expect(summary).toContain("HTTP Results:");
		expect(summary).toContain("Sydney, AU (33333)");
		expect(summary).toContain("HTTP Status: 200 OK");
		expect(summary).toContain("Timings:");
		expect(summary).toContain("TLS:");
		expect(summary).toContain("TLSv1.3");
	});

	it("should handle failed probe results", () => {
		const measurement = {
			id: "test-id-fail",
			type: "ping",
			target: "google.com",
			status: "finished",
			probesCount: 1,
			results: [
				{
					probe: {
						city: "Paris",
						country: "FR",
						asn: 44444,
					},
					result: {
						status: "failed",
					},
				},
			],
		};

		const summary = formatMeasurementSummary(measurement);

		expect(summary).toContain("Paris, FR (44444)");
		expect(summary).toContain("Status: failed");
	});

	it("should handle unknown measurement type", () => {
		const measurement = {
			id: "unknown-id",
			type: "unknown",
			target: "example.com",
			status: "finished",
			probesCount: 0,
			results: [],
		};

		const summary = formatMeasurementSummary(measurement);

		expect(summary).toContain("Measurement ID: unknown-id");
		expect(summary).toContain("Type: unknown");
		expect(summary).toContain("Detailed results are available in the raw data");
	});

	it("should handle DNS trace results", () => {
		const measurement = {
			id: "dns-trace-id",
			type: "dns",
			target: "example.com",
			status: "finished",
			probesCount: 1,
			results: [
				{
					probe: {
						city: "Mumbai",
						country: "IN",
						asn: 55555,
					},
					result: {
						status: "finished",
						hops: [
							{
								resolver: "root-server",
								timings: { total: 10 },
								answers: [
									{
										name: "example.com",
										ttl: 3600,
										class: "IN",
										type: "A",
										value: "93.184.216.34",
									},
								],
							},
						],
					},
				},
			],
		};

		const summary = formatMeasurementSummary(measurement);

		expect(summary).toContain("DNS Results:");
		expect(summary).toContain("Hop 1: root-server");
	});
});
