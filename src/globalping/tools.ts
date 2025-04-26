/**
 * Globalping MCP Tools
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { runMeasurement, getLocations, getRateLimits } from "./api";

// Helper to calculate average values from a ping measurement
function calculateAverages(results: any) {
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
		(item: any) => item.result.status === "finished" && item.result.stats,
	);

	summary.successfulProbes = successfulResults.length;

	if (successfulResults.length === 0) {
		return summary;
	}

	// Calculate sum of all stats
	for (const item of successfulResults) {
		summary.totalPackets += item.result.stats.total;
		summary.totalReceived += item.result.stats.rcv;
		summary.totalDropped += item.result.stats.drop;

		if (item.result.stats.min !== null) {
			summary.minRtt =
				summary.minRtt === null
					? item.result.stats.min
					: Math.min(summary.minRtt, item.result.stats.min);
		}

		if (item.result.stats.max !== null) {
			summary.maxRtt =
				summary.maxRtt === null
					? item.result.stats.max
					: Math.max(summary.maxRtt, item.result.stats.max);
		}
	}

	// Calculate averages
	summary.averageLoss =
		summary.totalPackets > 0 ? (summary.totalDropped / summary.totalPackets) * 100 : 0;

	// Calculate average RTT across all probes
	let totalAvgRtt = 0;
	let avgRttCount = 0;

	for (const item of successfulResults) {
		if (item.result.stats.avg !== null) {
			totalAvgRtt += item.result.stats.avg;
			avgRttCount++;
		}
	}

	summary.avgRtt = avgRttCount > 0 ? totalAvgRtt / avgRttCount : null;

	return summary;
}

// Function to format a measurement response into a user-friendly summary
function formatMeasurementSummary(measurement: any) {
	const { type } = measurement;

	let summary = `Measurement ID: ${measurement.id}\n`;
	summary += `Type: ${type}\n`;
	summary += `Target: ${measurement.target}\n`;
	summary += `Status: ${measurement.status}\n`;
	summary += `Probes: ${measurement.probesCount}\n\n`;

	// Type-specific formatting
	switch (type) {
		case "ping":
			const pingStats = calculateAverages(measurement.results);
			summary += `Ping Results:\n`;
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
			summary += `\nDetailed Results:\n`;
			measurement.results.forEach((result: any, index: number) => {
				const probe = result.probe;
				const testResult = result.result;

				summary += `Probe ${index + 1}: ${probe.city}, ${probe.country} (${probe.asn})\n`;

				if (testResult.status === "finished") {
					summary += `  Status: ${testResult.status}\n`;
					summary += `  RTT min/avg/max: ${testResult.stats.min ?? "N/A"}/${testResult.stats.avg ?? "N/A"}/${testResult.stats.max ?? "N/A"} ms\n`;
					summary += `  Packet Loss: ${testResult.stats.loss.toFixed(2)}%\n`;
				} else {
					summary += `  Status: ${testResult.status}\n`;
				}
			});
			break;

		case "traceroute":
			summary += `Traceroute Results:\n\n`;

			measurement.results.forEach((result: any, index: number) => {
				const probe = result.probe;
				const testResult = result.result;

				summary += `Probe ${index + 1}: ${probe.city}, ${probe.country} (${probe.asn})\n`;
				summary += `  Status: ${testResult.status}\n`;

				if (testResult.status === "finished" && testResult.hops) {
					testResult.hops.forEach((hop: any, hopIndex: number) => {
						const hostname = hop.resolvedHostname || hop.resolvedAddress || "Unknown";
						const rtt =
							hop.timings && hop.timings[0]
								? `${hop.timings[0].rtt.toFixed(2)} ms`
								: "N/A";
						summary += `  ${hopIndex + 1}. ${hostname} - ${rtt}\n`;
					});
				}

				summary += "\n";
			});
			break;

		case "dns":
			summary += `DNS Results:\n\n`;

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
								summary += `    Answers:\n`;
								hop.answers.forEach((answer: any) => {
									summary += `      ${answer.name} ${answer.ttl} ${answer.class} ${answer.type} ${answer.value}\n`;
								});
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
							summary += `  Answers:\n`;
							testResult.answers.forEach((answer: any) => {
								summary += `    ${answer.name} ${answer.ttl} ${answer.class} ${answer.type} ${answer.value}\n`;
							});
						} else {
							summary += "  No answers\n";
						}
					}
				}

				summary += "\n";
			});
			break;

		case "mtr":
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

		case "http":
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

		default:
			summary += `Detailed results are available in the raw data.\n`;
	}

	return summary;
}

/**
 * Register Globalping tools on the MCP server
 * @param server The MCP server instance
 * @param getToken Function to retrieve the current auth token
 * @returns The updated server with Globalping tools
 */
export function registerGlobalpingTools(server: McpServer, getToken?: () => string) {
	// Common measurement parameters
	const baseParams = {
		target: z.string().describe("Domain name or IP to test (e.g., 'google.com', '1.1.1.1')"),
		locations: z
			.array(z.string())
			.optional()
			.describe("Specific locations to run the test from using the magic field syntax. Examples: ['US', 'Europe', 'AS13335', 'London+UK']. You can also use a previous measurement ID to compare results with the same probes."),
		limit: z
			.number()
			.min(1)
			.max(100)
			.optional()
			.describe("Number of probes to use (default: 3, max: 100)"),
	};

	// Ping tool
	server.tool(
		"ping",
		{
			...baseParams,
			packets: z.number().optional().describe("Number of packets to send (default: 3)"),
		},
		async ({ target, locations, limit, packets }, ctx) => {
			const token = extractApiToken(ctx, getToken);

			const result = await runMeasurement(
				{
					type: "ping",
					target,
					locations: locations ? locations.map((loc) => ({ magic: loc })) : undefined,
					limit: limit || 3, // Default to 3 probes if not specified
					measurementOptions: {
						packets: packets || 3,
					},
				},
				token,
			);

			const summary = formatMeasurementSummary(result);

			return {
				content: [{ type: "text", text: summary }],
			};
		},
	);

	// Traceroute tool
	server.tool(
		"traceroute",
		{
			...baseParams,
			protocol: z
				.enum(["ICMP", "TCP", "UDP"])
				.optional()
				.describe("Protocol to use (default: ICMP)"),
			port: z.number().optional().describe("Port number for TCP/UDP (default: 80)"),
		},
		async ({ target, locations, limit, protocol, port }, ctx) => {
			const token = extractApiToken(ctx);

			const result = await runMeasurement(
				{
					type: "traceroute",
					target,
					locations: locations ? locations.map((loc) => ({ magic: loc })) : undefined,
					limit: limit || 3, // Default to 3 probes if not specified
					measurementOptions: {
						protocol: protocol as any,
						port: port || 80,
					},
				},
				token,
			);

			const summary = formatMeasurementSummary(result);

			return {
				content: [{ type: "text", text: summary }],
			};
		},
	);

	// DNS tool
	server.tool(
		"dns",
		{
			...baseParams,
			queryType: z
				.enum(["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA", "CAA"])
				.optional()
				.describe("DNS record type (default: A)"),
			resolver: z.string().optional().describe("Custom resolver to use (e.g., '1.1.1.1', '8.8.8.8')"),
			trace: z
				.boolean()
				.optional()
				.describe("Trace delegation path from root servers (default: false)"),
		},
		async ({ target, locations, limit, queryType, resolver, trace }, ctx) => {
			const token = extractApiToken(ctx);

			const result = await runMeasurement(
				{
					type: "dns",
					target,
					locations: locations ? locations.map((loc) => ({ magic: loc })) : undefined,
					limit: limit || 3, // Default to 3 probes if not specified
					measurementOptions: {
						query: {
							type: queryType || "A",
						},
						resolver,
						trace: trace || false,
					},
				},
				token,
			);

			const summary = formatMeasurementSummary(result);

			return {
				content: [{ type: "text", text: summary }],
			};
		},
	);

	// MTR tool
	server.tool(
		"mtr",
		{
			...baseParams,
			protocol: z
				.enum(["ICMP", "TCP", "UDP"])
				.optional()
				.describe("Protocol to use (default: ICMP)"),
			port: z.number().optional().describe("Port number for TCP/UDP (default: 80)"),
			packets: z
				.number()
				.optional()
				.describe("Number of packets to send to each hop (default: 3)"),
		},
		async ({ target, locations, limit, protocol, port, packets }, ctx) => {
			const token = extractApiToken(ctx);

			const result = await runMeasurement(
				{
					type: "mtr",
					target,
					locations: locations ? locations.map((loc) => ({ magic: loc })) : undefined,
					limit: limit || 3, // Default to 3 probes if not specified
					measurementOptions: {
						protocol: protocol as any,
						port: port || 80,
						packets: packets || 3,
					},
				},
				token,
			);

			const summary = formatMeasurementSummary(result);

			return {
				content: [{ type: "text", text: summary }],
			};
		},
	);

	// HTTP tool
	server.tool(
		"http",
		{
			...baseParams,
			method: z.enum(["GET", "HEAD"]).optional().describe("HTTP method (default: GET)"),
			protocol: z
				.enum(["HTTP", "HTTPS"])
				.optional()
				.describe("Protocol to use (default: auto-detect from URL)"),
			path: z.string().optional().describe("Path component of the URL (e.g., '/api/v1/status')"),
			query: z.string().optional().describe("Query string (e.g., 'param=value&another=123')"),
		},
		async ({ target, locations, limit, method, protocol, path, query }, ctx) => {
			const token = extractApiToken(ctx);

			const result = await runMeasurement(
				{
					type: "http",
					target,
					locations: locations ? locations.map((loc) => ({ magic: loc })) : undefined,
					limit: limit || 3, // Default to 3 probes if not specified
					measurementOptions: {
						request: {
							method: method || "GET",
							path,
							query,
						},
						protocol: protocol as any,
					},
				},
				token,
			);

			const summary = formatMeasurementSummary(result);

			return {
				content: [{ type: "text", text: summary }],
			};
		},
	);

	// Locations tool
	server.tool("locations", {}, async (_, ctx) => {
		const token = extractApiToken(ctx);
		const locations = await getLocations(token);

		let summary = "Available Globalping Probe Locations:\n\n";

		// Organize probes by continent and country
		const continents: Record<string, Record<string, number>> = {};

		locations.forEach((probe: any) => {
			const continent = probe.location.continent;
			const country = probe.location.country;

			if (!continents[continent]) {
				continents[continent] = {};
			}

			if (!continents[continent][country]) {
				continents[continent][country] = 0;
			}

			continents[continent][country]++;
		});

		// Build summary
		Object.entries(continents).forEach(([continent, countries]) => {
			summary += `${continent}:\n`;

			Object.entries(countries).forEach(([country, count]) => {
				summary += `  ${country}: ${count} probes\n`;
			});

			summary += "\n";
		});

		summary += `Total probes: ${locations.length}\n`;
		summary += `\nNote: To specify locations, use the "magic" field syntax in the locations parameter. `;
		summary += `For example: ["US", "Europe", "AS13335", "London+UK"]\n`;

		return {
			content: [{ type: "text", text: summary }],
		};
	});

	// Limits tool
	server.tool("limits", {}, async (_, ctx) => {
		// Log the raw context data for debugging
		console.log("Context props:", ctx.props);
		
		// Try to get token using the provided function
		let token = undefined;
		try {
			token = getToken ? getToken() : undefined;
			console.log("Token from getToken():", token ? `${token.substring(0, 15)}...` : "None");
		} catch (e) {
			console.log("Error getting token:", e);
		}
		
		// If no token from getToken, try the context as fallback
		if (!token) {
			token = extractApiToken(ctx);
			console.log("Extracted token from ctx:", token ? `${token.substring(0, 15)}...` : "None");
		}
		
		// Make the API call
		console.log("Calling Globalping API with token:", token ? "Yes" : "No");
		const limits = await getRateLimits(token);
		console.log("API response received");

		let summary = "Globalping Rate Limits:\n\n";

		// Add context and token debugging information
		summary += `Context Data:\n`;
		summary += `- Has props: ${ctx.props ? "Yes" : "No"}\n`;
		summary += `- Has bearerToken: ${ctx.props?.accessToken ? "Yes" : "No"}\n`;
		if (ctx.props?.accessToken) {
			summary += `- Raw bearerToken: ${ctx.props.accessToken.substring(0, 15)}...\n`;
		}
		
		// Debug the raw context
		summary += `- Raw context keys: ${Object.keys(ctx || {}).join(", ")}\n`;
		if (ctx) {
			for (const key of Object.keys(ctx)) {
				summary += `  - ${key}: ${typeof ctx[key]} ${ctx[key] ? "(has value)" : "(empty)"}\n`;
			}
		}
		
		summary += `\n`;
		
		// Add authentication status to the output
		summary += `Authentication Status: ${token ? "Authenticated" : "Unauthenticated"}\n`;
		
		// Only show first few characters of token for security if present
		if (token) {
			const tokenPreview = token.startsWith("Bearer ") 
				? `Bearer ${token.substring(7, 15)}...` 
				: `${token.substring(0, 8)}...`;
			summary += `Token: ${tokenPreview}\n`;
		} else {
			summary += `Token: None\n`;
		}
		
		// Debug header information if available
		if (ctx?.props?.debugHeaders && Array.isArray(ctx.props.debugHeaders)) {
			summary += `\nRequest Headers Debug:\n`;
			ctx.props.debugHeaders.forEach((header: string) => {
				// Avoid showing the full token value in logs
				if (header.toLowerCase().includes("token") || header.toLowerCase().includes("auth")) {
					const parts = header.split(": ");
					if (parts.length === 2) {
						const value = parts[1];
						const safeValue = value.length > 10 ? `${value.substring(0, 10)}...` : value;
						summary += `${parts[0]}: ${safeValue}\n`;
					} else {
						summary += `${header}\n`;
					}
				} else {
					summary += `${header}\n`;
				}
			});
			summary += `\n`;
		}
		
		summary += `\n`;

		// Log the raw limits data
		console.log("API Response (limits):", JSON.stringify(limits));
		
		// Add the raw API response to the output
		summary += `\nAPI Response:\n${JSON.stringify(limits, null, 2)}\n\n`;
		
		// Format parsed data
		const rateLimit = limits.rateLimit.measurements.create;

		summary += `Type: ${rateLimit.type}\n`;
		summary += `Limit: ${rateLimit.limit} measurements\n`;
		summary += `Remaining: ${rateLimit.remaining} measurements\n`;
		summary += `Reset: in ${rateLimit.reset} seconds\n\n`;

		if (limits.credits) {
			summary += `Credits Remaining: ${limits.credits.remaining}\n`;
		}

		return {
			content: [{ type: "text", text: summary }],
		};
	});

	return server;
}

/**
 * Extract the Globalping API token from various sources
 * @param ctx The MCP server context
 * @returns The API token if available
 */
function extractApiToken(ctx: any, getToken: any): string | undefined {
	// First try to get the token from the getter function
	try {
		if (getToken) {
			const token = getToken();
			if (token && token.trim() !== "") {
				return formatToken(token);
			}
		}
	} catch (e) {
		console.log("Error getting token from getter:", e);
	}
	
	// Then try from context props
	if (ctx?.props?.accessToken && ctx.props.accessToken.trim() !== "") {
		return formatToken(ctx.props.accessToken);
	}

	// If no token is available, return undefined - the API will use unauthenticated access
	return undefined;
}

/**
 * Format a token to ensure it has the correct Bearer prefix
 * @param token The token to format
 * @returns The formatted token
 */
function formatToken(token: string): string | undefined {
	const trimmedToken = token.trim();
	
	// If token has a Bearer prefix, remove any extra spaces that might be present
	if (trimmedToken.toLowerCase().startsWith("bearer")) {
		// Extract the token part, trim whitespace, and reconstitute with proper spacing
		const tokenPart = trimmedToken.substring(6).trim();
		if (tokenPart) {
			return `Bearer ${tokenPart}`;
		}
	} else {
		// If no Bearer prefix, add one
		return `Bearer ${trimmedToken}`;
	}
	
	// If token is just "Bearer" with no actual token, return undefined
	return undefined;
}