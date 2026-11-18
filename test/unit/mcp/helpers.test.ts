/**
 * Tests for mcp/helpers.ts
 */
import { describe, it, expect } from "vitest";
import {
	calculateAverages,
	formatMeasurementSummary,
	parseLocations,
} from "../../../src/mcp/helpers";

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
	const probe = {
		city: "New York",
		state: "NY",
		country: "US",
		continent: "NA",
		network: "Verizon",
		asn: 12345,
	};
	const measurement = (type: string, result: any) => ({
		id: "test-id-123",
		type,
		target: "google.com",
		status: "finished",
		probesCount: 1,
		results: [{ probe, result }],
	});

	it("should print the header and the raw output of each probe", () => {
		const summary = formatMeasurementSummary(
			measurement("traceroute", {
				status: "finished",
				rawOutput: "traceroute to google.com",
			}),
		);

		expect(summary).toBe(
			"Measurement ID: test-id-123\nType: traceroute\nTarget: google.com\nStatus: finished\nProbes: 1\n" +
				"\nProbe 1: New York (NY), US, NA, Verizon (AS12345)\ntraceroute to google.com\n",
		);
	});

	it("should add totals over all probes to ping results", () => {
		const summary = formatMeasurementSummary(
			measurement("ping", {
				status: "finished",
				rawOutput: "PING google.com",
				stats: { min: 10, avg: 15, max: 20, total: 3, rcv: 3, drop: 0, loss: 0 },
			}),
		);

		expect(summary).toContain(
			"Probes: 1\n\n- Successful Probes: 1/1\n- Total Packets: 3\n- Received: 3\n- Dropped: 0\n" +
				"- Average Loss: 0.00%\n- Min RTT: 10.00 ms\n- Avg RTT: 15.00 ms\n- Max RTT: 20.00 ms\n" +
				"\nProbe 1:",
		);
	});

	it("should print the status of a probe that did not finish", () => {
		const summary = formatMeasurementSummary(
			measurement("ping", { status: "failed", rawOutput: "queryA ENOTFOUND google.com" }),
		);

		expect(summary).toContain("Status: failed\nqueryA ENOTFOUND google.com\n");
	});

	it("should handle a probe without raw output", () => {
		const summary = formatMeasurementSummary(measurement("ping", { status: "offline" }));

		expect(summary).toMatch(/AS12345\)\nStatus: offline\n$/);
	});

	it("should add resolved IP, timings and TLS to HTTP results", () => {
		const summary = formatMeasurementSummary(
			measurement("http", {
				status: "finished",
				rawOutput: "HTTP/1.1 301",
				resolvedAddress: "1.1.1.1",
				timings: { total: 23, dns: null, tcp: 2, tls: 9, firstByte: 12, download: 0 },
				tls: {
					protocol: "TLSv1.3",
					cipherName: "TLS_AES_256_GCM_SHA384",
					authorized: false,
				},
			}),
		);

		expect(summary).toContain(
			"Resolved IP: 1.1.1.1\n" +
				"Timings: total 23 ms, dns N/A, tcp 2 ms, tls 9 ms, firstByte 12 ms, download 0 ms\n" +
				"TLS: TLSv1.3, TLS_AES_256_GCM_SHA384, not valid\n" +
				"HTTP/1.1 301\n",
		);
	});
});
