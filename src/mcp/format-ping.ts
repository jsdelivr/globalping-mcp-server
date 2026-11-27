/**
 * Ping parts of the measurement text
 */

const EXCLUDED_LABELS: Record<string, string> = {
	offline: "offline",
	internal: "internal error",
	resolver: "resolver error",
};

export function formatPingTotals(results: any): string {
	const pingStats = calculateAverages(results);
	const excluded: string[] = results
		.map(({ result }: any) => EXCLUDED_LABELS[result.failureSource ?? result.status])
		.filter(Boolean);
	let text = "\nPing Results:\n";
	text += `- Successful Probes: ${pingStats.successfulProbes}/${results.length - excluded.length}\n`;

	if (excluded.length > 0) {
		const counts = Object.entries(Object.groupBy(excluded, (label) => label))
			.map(([label, group]: any) => `${label}: ${group.length}`)
			.join(", ");
		text += `- Excluded Probes: ${excluded.length} (${counts})\n`;
	}

	if (pingStats.successfulProbes === 0) {
		return text;
	}

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

/**
 * Calculate average values from ping measurement results
 * @param results The measurement results
 * @returns Statistics over all probes
 */
export function calculateAverages(results: any) {
	const stats = {
		totalPackets: 0,
		totalReceived: 0,
		totalDropped: 0,
		averageLoss: 0,
		minRtt: null as number | null,
		maxRtt: null as number | null,
		avgRtt: null as number | null,
		successfulProbes: 0,
	};

	// Only process finished ping results
	const successfulResults = results.filter(
		(item: any) =>
			item.result.status === "finished" && item.result.stats && item.result.stats.total > 0,
	);

	stats.successfulProbes = successfulResults.length;

	if (successfulResults.length === 0) {
		return stats;
	}

	// Calculate sum of all stats
	for (const item of successfulResults) {
		const probeStats = item.result.stats;
		stats.totalPackets += probeStats.total || 0;
		stats.totalReceived += probeStats.rcv || 0;
		stats.totalDropped += probeStats.drop || 0;

		if (typeof probeStats.min === "number") {
			stats.minRtt =
				stats.minRtt === null ? probeStats.min : Math.min(stats.minRtt, probeStats.min);
		}

		if (typeof probeStats.max === "number") {
			stats.maxRtt =
				stats.maxRtt === null ? probeStats.max : Math.max(stats.maxRtt, probeStats.max);
		}
	}

	// Calculate averages
	stats.averageLoss =
		stats.totalPackets > 0 ? (stats.totalDropped / stats.totalPackets) * 100 : 0;

	// Calculate average RTT across all probes
	let totalAvgRtt = 0;
	let avgRttCount = 0;

	for (const item of successfulResults) {
		if (typeof item.result.stats.avg === "number") {
			totalAvgRtt += item.result.stats.avg;
			avgRttCount++;
		}
	}

	stats.avgRtt = avgRttCount > 0 ? totalAvgRtt / avgRttCount : null;

	return stats;
}
