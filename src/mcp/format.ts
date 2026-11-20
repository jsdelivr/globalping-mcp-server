/**
 * Formatting of measurement responses as text
 */
import { GLOBALPING_API } from "../config";
import {
	findCommonHeaders,
	findSameBodyProbes,
	formatCommonHeaders,
	formatHttpResult,
} from "./format-http";
import { formatPingTotals } from "./format-ping";
import { formatMs, isSelected } from "./helpers";

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

	try {
		return formatText(measurement, output, probes);
	} catch (error: any) {
		const url = `${GLOBALPING_API.BASE_URL}${GLOBALPING_API.ENDPOINTS.MEASUREMENTS}/${measurement.id}`;
		throw new Error(
			`The results of measurement ${measurement.id} could not be formatted: ${error.message}. You can read the measurement by URL: ${url}`,
		);
	}
}

function formatText(
	measurement: any,
	output?: "summary" | "headers" | "full",
	probes?: number[],
): string {
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
	const sameBodyProbes = findSameBodyProbes(measurement.results, probes);
	const formatResult = (result: any, number: number) =>
		formatHttpResult(result, level, commonHeaders, sameBodyProbes.get(number));

	return formatCommonHeaders(commonHeaders) + formatProbesFull(measurement, formatResult, probes);
}

// A probe that did not finish has no result, only a status and what the tool printed so far.
function formatProbesFull(
	measurement: any,
	formatResult: (result: any, number: number) => string,
	probes?: number[],
): string {
	return measurement.results
		.map(({ probe, result }: any, index: number) => {
			const title = `\nProbe ${index + 1}: ${formatProbeLocation(probe)}\n`;

			if (result.status === "finished") {
				return title + formatResult(result, index + 1);
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
	ping: (result) => `loss ${result.stats.loss}%, rtt ${formatMs(result.stats.avg)}`,
	traceroute: (result) => {
		const rtts: number[] = result.hops.at(-1)?.timings.map((timing: any) => timing.rtt) ?? [];

		if (rtts.length === 0) {
			return `${result.hops.length} hops, no reply from target`;
		}

		const sum = rtts.reduce((total, rtt) => total + rtt, 0);
		const avg = Number((sum / rtts.length).toFixed(3));
		return `${result.hops.length} hops, rtt ${avg} ms`;
	},
	mtr: (result) => {
		const stats = result.hops.at(-1)?.stats;

		if (stats?.avg == null) {
			return `${result.hops.length} hops, no reply from target`;
		}

		return `${result.hops.length} hops, loss ${stats.loss}%, rtt ${stats.avg} ms`;
	},
	dns: (result) => {
		// A trace has the final answers in its last hop.
		const { answers, timings } = result.hops ? result.hops.at(-1) : result;
		const answersByType = Object.groupBy(answers, (answer: any) => answer.type);
		const records = Object.entries(answersByType)
			.map(
				([type, group]: any) =>
					`${type} ${group.map((answer: any) => answer.value).join(", ")}`,
			)
			.join("; ");
		return `${records || result.statusCodeName || "no answers"}, total ${formatMs(timings.total)}`;
	},
	http: (result) => {
		const statusName = result.statusCodeName ? ` ${result.statusCodeName}` : "";
		return `${result.statusCode}${statusName}, total ${formatMs(result.timings.total)}`;
	},
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
