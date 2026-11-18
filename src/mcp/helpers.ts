/**
 * MCP tool helper functions
 */

/**
 * Parse locations parameter into the correct format
 * @param locations Array of location strings or single string
 * @returns Parsed locations
 */
export function parseLocations(locations?: string[] | string): { magic: string }[] | undefined {
	if (!locations) return undefined;

	if (typeof locations === "string") {
		return [{ magic: locations }];
	}

	return locations.map((loc) => ({ magic: loc }));
}

/**
 * Calculate average values from ping measurement results
 * @param results The measurement results
 * @returns Summary statistics
 */
export function calculateAverages(results: any) {
	const summary = {
		totalPackets: 0,
		totalReceived: 0,
		totalDropped: 0,
		averageLoss: 0,
		minRtt: null as number | null,
		maxRtt: null as number | null,
		avgRtt: null as number | null,
		probeCount: results.length,
		successfulProbes: 0,
	};

	// Only process finished ping results
	const successfulResults = results.filter(
		(item: any) =>
			item.result.status === "finished" && item.result.stats && item.result.stats.total > 0,
	);

	summary.successfulProbes = successfulResults.length;

	if (successfulResults.length === 0) {
		return summary;
	}

	// Calculate sum of all stats
	for (const item of successfulResults) {
		const stats = item.result.stats;
		summary.totalPackets += stats.total || 0;
		summary.totalReceived += stats.rcv || 0;
		summary.totalDropped += stats.drop || 0;

		if (typeof stats.min === "number") {
			summary.minRtt =
				summary.minRtt === null ? stats.min : Math.min(summary.minRtt, stats.min);
		}

		if (typeof stats.max === "number") {
			summary.maxRtt =
				summary.maxRtt === null ? stats.max : Math.max(summary.maxRtt, stats.max);
		}
	}

	// Calculate averages
	summary.averageLoss =
		summary.totalPackets > 0 ? (summary.totalDropped / summary.totalPackets) * 100 : 0;

	// Calculate average RTT across all probes
	let totalAvgRtt = 0;
	let avgRttCount = 0;

	for (const item of successfulResults) {
		if (typeof item.result.stats.avg === "number") {
			totalAvgRtt += item.result.stats.avg;
			avgRttCount++;
		}
	}

	summary.avgRtt = avgRttCount > 0 ? totalAvgRtt / avgRttCount : null;

	return summary;
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

// Above this length the default output is one line per probe.
const MAX_FULL_OUTPUT_LENGTH = 30_000;

function formatMs(value?: number | null): string {
	return value == null ? "N/A" : `${value} ms`;
}

function formatPingTotals(results: any): string {
	const pingStats = calculateAverages(results);
	let text = `\n- Successful Probes: ${pingStats.successfulProbes}/${pingStats.probeCount}\n`;
	text += `- Total Packets: ${pingStats.totalPackets}\n`;
	text += `- Received: ${pingStats.totalReceived}\n`;
	text += `- Dropped: ${pingStats.totalDropped}\n`;
	text += `- Average Loss: ${pingStats.averageLoss.toFixed(2)}%\n`;

	if (pingStats.minRtt !== null) {
		text += `- Min RTT: ${pingStats.minRtt.toFixed(2)} ms\n`;
	}

	if (pingStats.avgRtt !== null) {
		text += `- Avg RTT: ${pingStats.avgRtt.toFixed(2)} ms\n`;
	}

	if (pingStats.maxRtt !== null) {
		text += `- Max RTT: ${pingStats.maxRtt.toFixed(2)} ms\n`;
	}

	return text;
}

// The raw output of HTTP has no timings and no TLS details.
function formatHttpDetails(result: any): string {
	let text = "";

	if (result.resolvedAddress) {
		text += `Resolved IP: ${result.resolvedAddress}\n`;
	}

	if (result.timings) {
		const timings = ["total", "dns", "tcp", "tls", "firstByte", "download"]
			.map((name) => `${name} ${formatMs(result.timings[name])}`)
			.join(", ");
		text += `Timings: ${timings}\n`;
	}

	if (result.tls) {
		text += `TLS: ${result.tls.protocol}, ${result.tls.cipherName}, ${result.tls.authorized ? "valid" : "not valid"}\n`;
	}

	return text;
}

function formatProbeSummary(type: string, result: any): string {
	if (result.status !== "finished") {
		const reason = result.rawOutput?.split("\n")[0];
		return reason ? `${result.status}: ${reason}` : result.status;
	}

	switch (type) {
		case "ping":
			return `loss ${result.stats.loss}%, avg ${formatMs(result.stats.avg)}`;
		case "traceroute":
			return `${result.hops.length} hops, ${formatMs(result.hops.at(-1)?.timings[0]?.rtt)}`;
		case "mtr": {
			const stats = result.hops.at(-1)?.stats;
			return `${result.hops.length} hops, loss ${stats?.loss}%, avg ${formatMs(stats?.avg)}`;
		}
		case "dns": {
			// A trace has the final answers in its last hop.
			const { answers, timings } = result.hops ? result.hops.at(-1) : result;
			const values = answers.map((answer: any) => answer.value).join(", ");
			return `${values || result.statusCodeName || "no answers"}, ${formatMs(timings.total)}`;
		}
		case "http":
			return `${result.statusCode} ${result.statusCodeName}, ${formatMs(result.timings.total)}`;
		default:
			return result.status;
	}
}

function formatFullResults(measurement: any): string {
	let text = "";

	measurement.results.forEach(({ probe, result }: any, index: number) => {
		text += `\nProbe ${index + 1}: ${formatProbeLocation(probe)}\n`;

		if (result.status !== "finished") {
			text += `Status: ${result.status}\n`;
		}

		if (measurement.type === "http" && result.status === "finished") {
			text += formatHttpDetails(result);
		}

		if (result.rawOutput) {
			text += `${result.rawOutput}\n`;
		}
	});

	return text;
}

/**
 * Format a measurement response as text
 * @param measurement The measurement response
 * @param output "full" is the raw output of every probe, "summary" is one line per probe.
 * The default is "full" when it is short enough, else "summary".
 * @returns Formatted text
 */
export function formatMeasurement(measurement: any, output?: "summary" | "full"): string {
	let header = `Measurement ID: ${measurement.id}\n`;
	header += `Type: ${measurement.type}\n`;
	header += `Target: ${measurement.target}\n`;
	header += `Status: ${measurement.status}\n`;
	header += `Probes: ${measurement.probesCount}\n`;

	if (measurement.type === "ping") {
		header += formatPingTotals(measurement.results);
	}

	let note = 'One line per probe. Use output "full" for the raw output of every probe.';

	if (output !== "summary") {
		const full = header + formatFullResults(measurement);

		if (output === "full" || full.length <= MAX_FULL_OUTPUT_LENGTH) {
			return full;
		}

		note = `The full output has ${full.length} characters, so this is one line per probe. Use output "full" to get it anyway.`;
	}

	const lines = measurement.results.map(
		({ probe, result }: any, index: number) =>
			`${index + 1}: ${formatProbeLocation(probe)} | ${formatProbeSummary(measurement.type, result)}\n`,
	);

	return `${header}\n${lines.join("")}\n${note}\n`;
}
