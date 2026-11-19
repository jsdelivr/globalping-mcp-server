/**
 * Formatting of measurement responses as text
 */
import { findCommonHeaders, formatCommonHeaders, formatHttpResult } from "./format-http";
import { formatPingTotals } from "./format-ping";
import { formatMs } from "./helpers";

// Above this length the default output is one line per probe.
const MAX_FULL_OUTPUT_LENGTH = 30_000;

/**
 * Format a measurement response as text
 * @param measurement The measurement response
 * @param output "summary" is one line per probe, "full" is the raw output of every probe,
 * "headers" is "full" without the response body of HTTP.
 * The default is "full" ("headers" for HTTP) when it is short enough, else "summary".
 * @param probes Numbers of the probes to print, the first probe is 1. The default is all probes.
 * @returns Formatted text
 */
export function formatMeasurement(
	measurement: any,
	output?: "summary" | "headers" | "full",
	probes?: number[],
): string {
	checkProbesExist(measurement, probes);

	const header = formatHeader(measurement);

	if (output === "summary") {
		return header + formatSummary(measurement, probes);
	}

	const level = output ?? (measurement.type === "http" ? "headers" : "full");
	const details = header + formatFull(measurement, level, probes);

	if (output || details.length <= MAX_FULL_OUTPUT_LENGTH) {
		return details;
	}

	return header + formatSummary(measurement, probes);
}

function checkProbesExist(measurement: any, probes?: number[]): void {
	const probesCount = measurement.results.length;
	const missingProbe = probes?.find((number) => number > probesCount);

	if (missingProbe) {
		throw new Error(
			`Probe ${missingProbe} does not exist. This measurement has probe numbers from 1 to ${probesCount}.`,
		);
	}
}

function isSelected(index: number, probes?: number[]): boolean {
	return !probes || probes.includes(index + 1);
}

function formatHeader(measurement: any): string {
	let header = `Measurement ID: ${measurement.id}\n`;
	header += `Type: ${measurement.type}\n`;
	header += `Target: ${measurement.target}\n`;
	header += `Status: ${measurement.status}\n`;
	header += `Created: ${measurement.createdAt}\n`;
	header += `Updated: ${measurement.updatedAt}\n`;

	for (const [label, value] of [
		["Locations", measurement.locations],
		["Limit", measurement.limit],
		["Options", measurement.measurementOptions],
	]) {
		if (value != null) {
			header += `${label}: ${typeof value === "object" ? JSON.stringify(value) : value}\n`;
		}
	}

	header += `Probes: ${measurement.probesCount}\n`;

	if (measurement.type === "ping") {
		header += formatPingTotals(measurement.results);
	}

	return header;
}

function formatFull(measurement: any, level: "headers" | "full", probes?: number[]): string {
	if (measurement.type === "http") {
		return formatHttpFull(measurement, level, probes);
	}

	return formatProbesFull(measurement, formatRawOutput, probes);
}

function formatHttpFull(measurement: any, level: "headers" | "full", probes?: number[]): string {
	const commonHeaders = findCommonHeaders(measurement.results);
	const formatResult = (result: any) => formatHttpResult(result, level, commonHeaders);

	return formatCommonHeaders(commonHeaders) + formatProbesFull(measurement, formatResult, probes);
}

// A probe that did not finish has no result, only a status and what the tool printed so far.
function formatProbesFull(
	measurement: any,
	formatResult: (result: any) => string,
	probes?: number[],
): string {
	return measurement.results
		.map(({ probe, result }: any, index: number) => {
			const title = `\nProbe ${index + 1}: ${formatProbeLocation(probe)}\n`;

			if (result.status === "finished") {
				return title + formatResult(result);
			}

			return `${title}Status: ${formatProbeStatus(result)}\n${formatRawOutput(result)}`;
		})
		.filter((_text: string, index: number) => isSelected(index, probes))
		.join("");
}

function formatRawOutput(result: any): string {
	return result.rawOutput ? `${result.rawOutput}\n` : "";
}

function formatSummary(measurement: any, probes?: number[]): string {
	const lines = measurement.results
		.map(
			({ probe, result }: any, index: number) =>
				`${index + 1}: ${formatProbeLocation(probe)} | ${formatProbeSummary(measurement.type, result)}\n`,
		)
		.filter((_line: string, index: number) => isSelected(index, probes));

	const levels = measurement.type === "http" ? '"headers" or "full"' : '"full"';

	return `\nResults, one line per probe:\n${lines.join("")}\nFor details call getMeasurement with "probes" and output ${levels}.\n`;
}

function formatProbeSummary(type: string, result: any): string {
	if (result.status === "in-progress") {
		return result.status;
	}

	if (result.status !== "finished") {
		const status = formatProbeStatus(result);
		const output = result.rawOutput?.trim() ?? "";
		const isOneLine = output !== "" && !output.includes("\n");
		return isOneLine ? `${status}: ${output}` : status;
	}

	return summaryByType[type]?.(result) ?? result.status;
}

const summaryByType: Record<string, (result: any) => string> = {
	ping: (result) => `loss ${result.stats.loss}%, avg ${formatMs(result.stats.avg)}`,
	traceroute: (result) =>
		`${result.hops.length} hops, rtt ${formatMs(result.hops.at(-1)?.timings[0]?.rtt)}`,
	mtr: (result) => {
		const stats = result.hops.at(-1)?.stats;
		return `${result.hops.length} hops, loss ${stats?.loss}%, avg ${formatMs(stats?.avg)}`;
	},
	dns: (result) => {
		// A trace has the final answers in its last hop.
		const { answers, timings } = result.hops ? result.hops.at(-1) : result;
		const values = answers.map((answer: any) => answer.value).join(", ");
		return `${values || result.statusCodeName || "no answers"}, total ${formatMs(timings.total)}`;
	},
	http: (result) =>
		`${result.statusCode} ${result.statusCodeName}, total ${formatMs(result.timings.total)}`,
};

function formatProbeStatus(result: any): string {
	return result.failureSource ? `${result.status} (${result.failureSource})` : result.status;
}

function formatProbeLocation(probe: any): string {
	let location = probe.city;

	if (probe.state) {
		location += ` (${probe.state})`;
	}

	for (const part of [probe.country, probe.continent, probe.network]) {
		if (part) {
			location += `, ${part}`;
		}
	}

	if (probe.asn !== undefined && probe.asn !== null) {
		location += ` (AS${probe.asn})`;
	}

	return location;
}
