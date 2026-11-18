/**
 * Tests for mcp/format-ping.ts
 */
import { describe, expect, it } from "vitest";
import { calculateAverages } from "../../../src/mcp/format-ping";

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
