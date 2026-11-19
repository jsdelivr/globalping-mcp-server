/**
 * Formatting of measurement responses as text
 */
import { formatHttpDetails } from "./format-http";
import { formatPingTotals } from "./format-ping";
import { formatMs } from "./helpers";

// Above this length the default output is one line per probe.
const MAX_FULL_OUTPUT_LENGTH = 30_000;

/**
 * Format a measurement response as text
 * @param measurement The measurement response
 * @param output "full" is the raw output of every probe, "summary" is one line per probe.
 * The default is "full" when it is short enough, else "summary".
 * @returns Formatted text
 */
export function formatMeasurement(measurement: any, output?: "summary" | "full"): string {
	const header = formatHeader(measurement);

	if (output === "summary") {
		return header + formatSummary(measurement);
	}

	const full = header + formatFull(measurement);

	if (output === "full" || full.length <= MAX_FULL_OUTPUT_LENGTH) {
		return full;
	}

	return header + formatSummary(measurement);
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

function formatFull(measurement: any): string {
	return measurement.results
		.map((item: any, index: number) => formatProbeFull(measurement.type, item, index))
		.join("");
}

function formatProbeFull(type: string, { probe, result }: any, index: number): string {
	let text = `\nProbe ${index + 1}: ${formatProbeLocation(probe)}\n`;

	if (result.status !== "finished") {
		text += `Status: ${formatProbeStatus(result)}\n`;
	}

	if (type === "http" && result.status === "finished") {
		text += formatHttpDetails(result);
	}

	if (result.rawOutput) {
		text += `${result.rawOutput}\n`;
	}

	if (result.truncated) {
		text += "The response body is truncated.\n";
	}

	return text;
}

function formatSummary(measurement: any): string {
	const lines = measurement.results.map(
		({ probe, result }: any, index: number) =>
			`${index + 1}: ${formatProbeLocation(probe)} | ${formatProbeSummary(measurement.type, result)}\n`,
	);

	return `\n${lines.join("")}\nOne line per probe. Use output "full" for the raw output of every probe.\n`;
}

function formatProbeSummary(type: string, result: any): string {
	if (result.status === "in-progress") {
		return result.status;
	}

	if (result.status !== "finished") {
		const reason = result.rawOutput?.split("\n")[0];
		return reason ? `${formatProbeStatus(result)}: ${reason}` : formatProbeStatus(result);
	}

	return summaryByType[type]?.(result) ?? result.status;
}

const summaryByType: Record<string, (result: any) => string> = {
	ping: (result) => `loss ${result.stats.loss}%, avg ${formatMs(result.stats.avg)}`,
	traceroute: (result) =>
		`${result.hops.length} hops, ${formatMs(result.hops.at(-1)?.timings[0]?.rtt)}`,
	mtr: (result) => {
		const stats = result.hops.at(-1)?.stats;
		return `${result.hops.length} hops, loss ${stats?.loss}%, avg ${formatMs(stats?.avg)}`;
	},
	dns: (result) => {
		// A trace has the final answers in its last hop.
		const { answers, timings } = result.hops ? result.hops.at(-1) : result;
		const values = answers.map((answer: any) => answer.value).join(", ");
		return `${values || result.statusCodeName || "no answers"}, ${formatMs(timings.total)}`;
	},
	http: (result) =>
		`${result.statusCode} ${result.statusCodeName}, ${formatMs(result.timings.total)}`,
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
