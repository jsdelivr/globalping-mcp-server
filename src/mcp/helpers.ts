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

/**
 * Format a measurement response into a user-friendly summary
 * @param measurement The measurement response
 * @returns Formatted summary string
 */
export function formatMeasurementSummary(measurement: any): string {
	const { type } = measurement;

	let summary = `Measurement ID: ${measurement.id}\n`;
	summary += `Type: ${type}\n`;
	summary += `Target: ${measurement.target}\n`;
	summary += `Status: ${measurement.status}\n`;
	summary += `Probes: ${measurement.probesCount}\n\n`;

	// Type-specific formatting
	switch (type) {
		case "ping": {
			const pingStats = calculateAverages(measurement.results);
			summary += "Ping Results:\n\n";
			summary += `- Successful Probes: ${pingStats.successfulProbes}/${pingStats.probeCount}\n`;
			summary += `- Total Packets: ${pingStats.totalPackets}\n`;
			summary += `- Received: ${pingStats.totalReceived}\n`;
			summary += `- Dropped: ${pingStats.totalDropped}\n`;
			summary += `- Average Loss: ${pingStats.averageLoss.toFixed(2)}%\n`;

			if (pingStats.minRtt !== null) {
				summary += `- Min RTT: ${pingStats.minRtt.toFixed(2)} ms\n`;
			}

			if (pingStats.avgRtt !== null) {
				summary += `- Avg RTT: ${pingStats.avgRtt.toFixed(2)} ms\n`;
			}

			if (pingStats.maxRtt !== null) {
				summary += `- Max RTT: ${pingStats.maxRtt.toFixed(2)} ms\n`;
			}

			// Add detailed results per probe
			summary += "\nDetailed Results:\n";
			measurement.results.forEach((result: any, index: number) => {
				const probe = result.probe;
				const testResult = result.result;

				summary += `Probe ${index + 1}: ${probe.city}, ${probe.country} (${probe.asn})\n`;

				if (testResult.status === "finished" && testResult.stats) {
					summary += `  Status: ${testResult.status}\n`;
					const min = testResult.stats.min !== undefined ? testResult.stats.min : "N/A";
					const avg = testResult.stats.avg !== undefined ? testResult.stats.avg : "N/A";
					const max = testResult.stats.max !== undefined ? testResult.stats.max : "N/A";
					const loss =
						typeof testResult.stats.loss === "number" && !isNaN(testResult.stats.loss)
							? testResult.stats.loss.toFixed(2)
							: "N/A";

					summary += `  RTT min/avg/max: ${min}/${avg}/${max} ms\n`;
					summary += `  Packet Loss: ${loss}%\n`;
				} else {
					summary += `  Status: ${testResult.status}\n`;
				}
			});
			break;
		}
		case "traceroute": {
			summary += "Traceroute Results:\n\n";

			measurement.results.forEach((result: any, index: number) => {
				const probe = result.probe;
				const testResult = result.result;

				summary += `Probe ${index + 1}: ${probe.city}, ${probe.country} (${probe.asn})\n`;
				summary += `  Status: ${testResult.status}\n`;

				if (testResult.status === "finished" && testResult.hops) {
					testResult.hops.forEach((hop: any, hopIndex: number) => {
						const hostname = hop.resolvedHostname || hop.resolvedAddress || "Unknown";
						const rtt = hop.timings?.[0]
							? `${hop.timings[0].rtt.toFixed(2)} ms`
							: "N/A";
						summary += `  ${hopIndex + 1}. ${hostname} - ${rtt}\n`;
					});
				}

				summary += "\n";
			});
			break;
		}
		case "dns": {
			summary += "DNS Results:\n\n";

			measurement.results.forEach((result: any, index: number) => {
				const probe = result.probe;
				const testResult = result.result;

				summary += `Probe ${index + 1}: ${probe.city}, ${probe.country} (${probe.asn})\n`;
				summary += `  Status: ${testResult.status}\n`;

				if (testResult.status === "finished") {
					if (testResult.hops) {
						// This is a trace DNS test
						testResult.hops.forEach((hop: any, hopIndex: number) => {
							summary += `  Hop ${hopIndex + 1}: ${hop.resolver}\n`;
							summary += `    Time: ${hop.timings.total} ms\n`;

							if (hop.answers && hop.answers.length > 0) {
								summary += "    Answers:\n";
								for (const answer of hop.answers) {
									summary += `      ${answer.name} ${answer.ttl} ${answer.class} ${answer.type} ${answer.value}\n`;
								}
							} else {
								summary += "    No answers\n";
							}
						});
					} else {
						// This is a simple DNS test
						summary += `  Resolver: ${testResult.resolver}\n`;
						summary += `  Time: ${testResult.timings.total} ms\n`;
						summary += `  Status: ${testResult.statusCodeName} (${testResult.statusCode})\n`;

						if (testResult.answers && testResult.answers.length > 0) {
							summary += "  Answers:\n";
							for (const answer of testResult.answers) {
								summary += `    ${answer.name} ${answer.ttl} ${answer.class} ${answer.type} ${answer.value}\n`;
							}
						} else {
							summary += "  No answers\n";
						}
					}
				}

				summary += "\n";
			});
			break;
		}
		case "mtr": {
			summary += "MTR Results:\n\n";

			measurement.results.forEach((result: any, index: number) => {
				const probe = result.probe;
				const testResult = result.result;

				summary += `Probe ${index + 1}: ${probe.city}, ${probe.country} (${probe.asn})\n`;
				summary += `  Status: ${testResult.status}\n`;

				if (testResult.status === "finished" && testResult.hops) {
					testResult.hops.forEach((hop: any, hopIndex: number) => {
						const hostname = hop.resolvedHostname || hop.resolvedAddress || "Unknown";
						summary += `  ${hopIndex + 1}. ${hostname}\n`;
						summary += `     Loss: ${hop.stats.loss.toFixed(2)}% | RTT: ${hop.stats.avg.toFixed(2)} ms\n`;
					});
				}

				summary += "\n";
			});
			break;
		}
		case "http": {
			summary += "HTTP Results:\n\n";

			measurement.results.forEach((result: any, index: number) => {
				const probe = result.probe;
				const testResult = result.result;

				summary += `Probe ${index + 1}: ${probe.city}, ${probe.country} (${probe.asn})\n`;
				summary += `  Status: ${testResult.status}\n`;

				if (testResult.status === "finished") {
					summary += `  HTTP Status: ${testResult.statusCode} ${testResult.statusCodeName}\n`;

					if (testResult.timings) {
						summary += "  Timings:\n";
						summary += `    Total: ${testResult.timings.total ?? "N/A"} ms\n`;
						summary += `    DNS: ${testResult.timings.dns ?? "N/A"} ms\n`;
						summary += `    TCP: ${testResult.timings.tcp ?? "N/A"} ms\n`;
						summary += `    TLS: ${testResult.timings.tls ?? "N/A"} ms\n`;
						summary += `    First Byte: ${testResult.timings.firstByte ?? "N/A"} ms\n`;
						summary += `    Download: ${testResult.timings.download ?? "N/A"} ms\n`;
					}

					if (testResult.tls) {
						summary += "  TLS:\n";
						summary += `    Protocol: ${testResult.tls.protocol}\n`;
						summary += `    Cipher: ${testResult.tls.cipherName}\n`;
						summary += `    Valid: ${testResult.tls.authorized ? "Yes" : "No"}\n`;
					}
				}

				summary += "\n";
			});
			break;
		}
		default:
			summary += "Detailed results are available in the raw data.\n";
	}

	return summary;
}
