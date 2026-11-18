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
			.map((name) => {
				const value = result.timings[name];
				return `${name} ${value === null ? "N/A" : `${value} ms`}`;
			})
			.join(", ");
		text += `Timings: ${timings}\n`;
	}

	if (result.tls) {
		text += `TLS: ${result.tls.protocol}, ${result.tls.cipherName}, ${result.tls.authorized ? "valid" : "not valid"}\n`;
	}

	return text;
}

/**
 * Format a measurement response as text: a header and the raw output of each probe
 * @param measurement The measurement response
 * @returns Formatted text
 */
export function formatMeasurementSummary(measurement: any): string {
	let summary = `Measurement ID: ${measurement.id}\n`;
	summary += `Type: ${measurement.type}\n`;
	summary += `Target: ${measurement.target}\n`;
	summary += `Status: ${measurement.status}\n`;
	summary += `Probes: ${measurement.probesCount}\n`;

	if (measurement.type === "ping") {
		summary += formatPingTotals(measurement.results);
	}

	measurement.results.forEach(({ probe, result }: any, index: number) => {
		summary += `\nProbe ${index + 1}: ${formatProbeLocation(probe)}\n`;

		if (result.status !== "finished") {
			summary += `Status: ${result.status}\n`;
		}

		if (measurement.type === "http" && result.status === "finished") {
			summary += formatHttpDetails(result);
		}

		if (result.rawOutput) {
			summary += `${result.rawOutput}\n`;
		}
	});

	return summary;
}
