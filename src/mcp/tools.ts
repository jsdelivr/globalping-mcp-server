/**
 * Globalping MCP Tools Registration
 */
import { z } from "zod";
import { runMeasurement, getLocations, getRateLimits } from "../api";
import { parseLocations, formatMeasurementSummary } from "./helpers";
import type { GlobalpingMCP } from "../index";

/**
 * Register all Globalping tools on the MCP server
 * @param agent The GlobalpingMCP instance
 * @param getToken Function to retrieve the current auth token
 */
export function registerGlobalpingTools(agent: GlobalpingMCP, getToken: () => string) {
	// Common measurement parameters
	const baseParams = {
		target: z.string().describe("Domain name or IP to test (e.g., 'google.com', '1.1.1.1')"),
		locations: z
			.union([z.array(z.string()), z.string()])
			.optional()
			.describe(
				"Specific locations to run the test from using the magic field syntax. Examples: ['US', 'Europe', 'AS13335', 'London+UK']. You can also use a previous measurement ID to compare results with the same probes.",
			),
		limit: z
			.number()
			.min(1)
			.max(100)
			.optional()
			.describe("Number of probes to use (default: 3, max: 100)"),
	};

	// Ping tool
	agent.server.tool(
		"ping",
		{
			...baseParams,
			packets: z.number().optional().describe("Number of packets to send (default: 3)"),
		},
		async ({ target, locations, limit, packets }) => {
			const token = getToken();
			const parsedLocations = parseLocations(locations);

			const result = await runMeasurement(
				agent,
				{
					type: "ping",
					target,
					locations: parsedLocations,
					limit: limit || 3, // Default to 3 probes if not specified
					measurementOptions: {
						packets: packets || 3,
					},
				},
				token,
			);

			// Cache the measurement
			agent.state.measurements[result.id] = result;
			agent.state.lastMeasurementId = result.id;

			const summary = formatMeasurementSummary(result);

			return {
				content: [
					{
						type: "text",
						text: summary,
					},
					{
						type: "text",
						text: `Raw data is available by calling getMeasurement with ID: ${result.id}`,
					},
				],
			};
		},
	);

	// Traceroute tool
	agent.server.tool(
		"traceroute",
		{
			...baseParams,
			protocol: z
				.enum(["ICMP", "TCP", "UDP"])
				.optional()
				.describe("Protocol to use (default: ICMP)"),
			port: z.number().optional().describe("Port number for TCP/UDP (default: 80)"),
		},
		async ({ target, locations, limit, protocol, port }) => {
			const token = getToken();
			const parsedLocations = parseLocations(locations);

			const result = await runMeasurement(
				agent,
				{
					type: "traceroute",
					target,
					locations: parsedLocations,
					limit: limit || 3,
					measurementOptions: {
						protocol: protocol as any,
						port: port || 80,
					},
				},
				token,
			);

			agent.state.measurements[result.id] = result;
			agent.state.lastMeasurementId = result.id;

			const summary = formatMeasurementSummary(result);

			return {
				content: [
					{
						type: "text",
						text: summary,
					},
					{
						type: "text",
						text: `Raw data is available by calling getMeasurement with ID: ${result.id}`,
					},
				],
			};
		},
	);

	// DNS tool
	agent.server.tool(
		"dns",
		{
			...baseParams,
			queryType: z
				.enum([
					"A",
					"AAAA",
					"ANY",
					"CNAME",
					"DNSKEY",
					"DS",
					"HTTPS",
					"MX",
					"NS",
					"NSEC",
					"PTR",
					"RRSIG",
					"SOA",
					"TXT",
					"SRV",
					"SVCB",
				])
				.optional()
				.describe("DNS record type (default: A)"),
			resolver: z
				.string()
				.optional()
				.describe("Custom resolver to use (e.g., '1.1.1.1', '8.8.8.8')"),
			trace: z
				.boolean()
				.optional()
				.describe("Trace delegation path from root servers (default: false)"),
		},
		async ({ target, locations, limit, queryType, resolver, trace }) => {
			const token = getToken();
			const parsedLocations = parseLocations(locations);

			const result = await runMeasurement(
				agent,
				{
					type: "dns",
					target,
					locations: parsedLocations,
					limit: limit || 3,
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

			agent.state.measurements[result.id] = result;
			agent.state.lastMeasurementId = result.id;

			const summary = formatMeasurementSummary(result);

			return {
				content: [
					{
						type: "text",
						text: summary,
					},
					{
						type: "text",
						text: `Raw data is available by calling getMeasurement with ID: ${result.id}`,
					},
				],
			};
		},
	);

	// MTR tool
	agent.server.tool(
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
		async ({ target, locations, limit, protocol, port, packets }) => {
			const token = getToken();
			const parsedLocations = parseLocations(locations);

			const result = await runMeasurement(
				agent,
				{
					type: "mtr",
					target,
					locations: parsedLocations,
					limit: limit || 3,
					measurementOptions: {
						protocol: protocol as any,
						port: port || 80,
						packets: packets || 3,
					},
				},
				token,
			);

			agent.state.measurements[result.id] = result;
			agent.state.lastMeasurementId = result.id;

			const summary = formatMeasurementSummary(result);

			return {
				content: [
					{
						type: "text",
						text: summary,
					},
					{
						type: "text",
						text: `Raw data is available by calling getMeasurement with ID: ${result.id}`,
					},
				],
			};
		},
	);

	// HTTP tool
	agent.server.tool(
		"http",
		{
			...baseParams,
			method: z
				.enum(["GET", "HEAD", "OPTIONS"])
				.optional()
				.describe("HTTP method (default: GET)"),
			protocol: z
				.enum(["HTTP", "HTTPS"])
				.optional()
				.describe("Protocol to use (default: auto-detect from URL)"),
			path: z
				.string()
				.optional()
				.describe("Path component of the URL (e.g., '/api/v1/status')"),
			port: z.number().optional().describe("Port number for TCP/UDP (default: 80)"),
			query: z.string().optional().describe("Query string (e.g., 'param=value&another=123')"),
		},
		async ({ target, locations, limit, method, protocol, path, query, port }) => {
			const token = getToken();
			const parsedLocations = parseLocations(locations);
			if (!protocol) {
				protocol = "HTTPS";
			}

			const result = await runMeasurement(
				agent,
				{
					type: "http",
					target,
					locations: parsedLocations,
					limit: limit || 3,
					measurementOptions: {
						request: {
							method: method || "GET",
							path,
							query,
						},
						protocol: protocol,
						port: port || (protocol === "HTTPS" ? 443 : 80),
					},
				},
				token,
			);

			agent.state.measurements[result.id] = result;
			agent.state.lastMeasurementId = result.id;

			const summary = formatMeasurementSummary(result);

			return {
				content: [
					{
						type: "text",
						text: summary,
					},
					{
						type: "text",
						text: `Raw data is available by calling getMeasurement with ID: ${result.id}`,
					},
				],
			};
		},
	);

	// Locations tool
	agent.server.tool("locations", {}, async () => {
		const token = getToken();
		const probes = await getLocations(agent, token);

		// Group probes by continent and country
		const grouped: Record<string, Record<string, any[]>> = {};

		for (const probe of probes) {
			const continent = probe.location.continent;
			const country = probe.location.country;

			if (!grouped[continent]) {
				grouped[continent] = {};
			}

			if (!grouped[continent][country]) {
				grouped[continent][country] = [];
			}

			grouped[continent][country].push(probe);
		}

		// Format the output
		let output = "Available Globalping Probe Locations:\n\n";

		for (const [continent, countries] of Object.entries(grouped)) {
			output += `${continent}:\n`;

			for (const [country, probes] of Object.entries(countries)) {
				const cities = [...new Set(probes.map((p) => p.location.city))];
				output += `  ${country}: ${cities.join(", ")}\n`;
			}

			output += "\n";
		}

		output += `\nTotal Probes: ${probes.length}\n`;
		output +=
			'\nNote: To specify locations, use the "magic" field syntax in the locations parameter. ';
		output += 'For example: ["US", "Europe", "AS13335", "London+UK"]\n';

		return {
			content: [
				{
					type: "text",
					text: output,
				},
			],
		};
	});

	// Rate limits tool
	agent.server.tool("limits", {}, async () => {
		const token = getToken();
		const limits = await getRateLimits(agent, token);

		let output = "Globalping Rate Limits:\n\n";

		// Add authentication status to the output
		output += `Authentication Status: ${agent.getIsAuthenticated() ? "Authenticated" : "Unauthenticated"}\n`;

		// Only show first few characters of token for security if present
		if (token) {
			const tokenPreview = token.startsWith("Bearer ")
				? `Bearer ${token.substring(7, 15)}...`
				: `${token.substring(0, 8)}...`;
			output += `Token: ${tokenPreview}\n`;
		} else {
			output += "Token: None\n";
		}

		// Add the raw API response to the output
		output += `\nAPI Response:\n${JSON.stringify(limits, null, 2)}\n\n`;

		// Format parsed data
		const rateLimit = limits.rateLimit.measurements.create;

		output += `Type: ${rateLimit.type}\n`;
		output += `Limit: ${rateLimit.limit} measurements\n`;
		output += `Remaining: ${rateLimit.remaining} measurements\n`;
		output += `Reset: in ${rateLimit.reset} seconds\n\n`;

		if (limits.credits) {
			output += `Credits Remaining: ${limits.credits.remaining}\n`;
		}

		return {
			content: [
				{
					type: "text",
					text: output,
				},
			],
		};
	});
}
