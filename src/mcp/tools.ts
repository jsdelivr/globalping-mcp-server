/**
 * Globalping MCP Tools Registration
 */
import { z } from "zod";
import { runMeasurement, getLocations, getRateLimits } from "../api";
import { parseLocations, formatMeasurementSummary } from "./helpers";
import type { GlobalpingMCP } from "../index";
import { maskToken } from "../auth";

/**
 * Helper to wrap tool execution with error handling
 */
async function handleToolExecution(
	operation: () => Promise<any>,
	errorMessagePrefix: string
) {
	try {
		return await operation();
	} catch (error: any) {
		return {
			content: [
				{
					type: "text",
					text: `${errorMessagePrefix}: ${error.message || String(error)}`,
				},
			],
			isError: true,
		};
	}
}

/**
 * Register all Globalping tools on the MCP server
 * @param agent The GlobalpingMCP instance
 * @param getToken Function to retrieve the current auth token
 */
export function registerGlobalpingTools(agent: GlobalpingMCP, getToken: () => string) {
	// Ping tool
	agent.server.registerTool(
		"ping",
		{
			title: "Ping Test",
			description:
				"Measure network latency, packet loss, and reachability to a target (domain or IP) from globally distributed probes. Use this tool to check if a server is online, debug connection issues, or assess global performance.",
			annotations: {
				readOnlyHint: true,
			},
			inputSchema: {
				target: z
					.string()
					.describe("Domain name or IP to test (e.g., 'google.com', '1.1.1.1')"),
				locations: z
					.union([z.array(z.string()), z.string()])
					.optional()
					.describe(
						"Specific locations to run the test from using the Globalping magic field syntax. Use 'world' to select a diverse set of probes globally. It supports Globalping magic field syntax: ['US', 'Europe', 'AS13335', 'London+UK', 'Amazon+Germany', 'Greece']. You can also use a previous measurement ID to compare results with the same probes.",
					),
				limit: z
					.number()
					.min(1)
					.max(100)
					.optional()
					.describe("Number of probes to use (default: 3, max: 100)"),
				packets: z.number().optional().describe("Number of packets to send (default: 3)"),
			},
			outputSchema: {
				measurementId: z.string(),
				type: z.string(),
				status: z.string(),
				target: z.string(),
				probesCount: z.number(),
				results: z.array(z.any()),
			},
		},
		async ({ target, locations, limit, packets }) => {
			return handleToolExecution(async () => {
				const token = getToken();
				const parsedLocations = parseLocations(locations);

				const result = await runMeasurement(
					agent,
					{
						type: "ping",
						target,
						locations: parsedLocations,
						limit: limit || 3,
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

				const output = {
					measurementId: result.id,
					type: result.type,
					status: result.status,
					target: result.target,
					probesCount: result.probesCount,
					results: result.results,
				};

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
					structuredContent: output,
				};
			}, "Ping test failed");
		},
	);

	// Traceroute tool
	agent.server.registerTool(
		"traceroute",
		{
			title: "Traceroute Test",
			description:
				"Trace the network path to a target (domain or IP) from global locations. Use this tool to identify where packets are being dropped, analyze routing paths, or pinpoint latency sources in the network.",
			annotations: {
				readOnlyHint: true,
			},
			inputSchema: {
				target: z
					.string()
					.describe("Domain name or IP to test (e.g., 'cloudflare.com', '1.1.1.1')"),
				locations: z
					.union([z.array(z.string()), z.string()])
					.optional()
					.describe(
						"Specific locations to run the test from using the Globalping magic field syntax. Use 'world' to select a diverse set of probes globally. It supports Globalping magic field syntax: ['US', 'Europe', 'AS13335', 'London+UK', 'Amazon+Germany', 'Greece']. You can also use a previous measurement ID to compare results with the same probes.",
					),
				limit: z
					.number()
					.min(1)
					.max(100)
					.optional()
					.describe(
						"Number of probes to use (default: 3, max: 100). Higher limits provide more diverse results when using 'world' location.",
					),

				protocol: z
					.enum(["ICMP", "TCP", "UDP"])
					.optional()
					.describe("Protocol to use (default: ICMP)"),
				port: z.number().optional().describe("Port number for TCP/UDP (default: 80)"),
			},
			outputSchema: {
				measurementId: z.string(),
				type: z.string(),
				status: z.string(),
				target: z.string(),
				probesCount: z.number(),
				results: z.array(z.any()),
			},
		},
		async ({ target, locations, limit, protocol, port }) => {
			return handleToolExecution(async () => {
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

				const output = {
					measurementId: result.id,
					type: result.type,
					status: result.status,
					target: result.target,
					probesCount: result.probesCount,
					results: result.results,
				};

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
					structuredContent: output,
				};
			}, "Traceroute test failed");
		},
	);

	// DNS tool
	agent.server.registerTool(
		"dns",
		{
			title: "DNS Lookup",
			description:
				"Resolve DNS records (A, AAAA, MX, etc.) for a domain from global locations. Use this tool to verify DNS propagation, troubleshoot resolution failures, or check if users in different regions are seeing the correct records.",
			annotations: {
				readOnlyHint: true,
			},
			inputSchema: {
				target: z.string().describe("Domain name to resolve (e.g., 'google.com')"),
				locations: z
					.union([z.array(z.string()), z.string()])
					.optional()
					.describe(
						"Specific locations to run the test from using the Globalping magic field syntax. Use 'world' to select a diverse set of probes globally. It supports Globalping magic field syntax: ['US', 'Europe', 'AS13335', 'London+UK', 'Amazon+Germany', 'Greece']. You can also use a previous measurement ID to compare results with the same probes.",
					),
				limit: z
					.number()
					.min(1)
					.max(100)
					.optional()
					.describe(
						"Number of probes to use (default: 3, max: 100). Higher limits provide more diverse results when using 'world' location.",
					),
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
			outputSchema: {
				measurementId: z.string(),
				type: z.string(),
				status: z.string(),
				target: z.string(),
				probesCount: z.number(),
				results: z.array(z.any()),
			},
		},
		async ({ target, locations, limit, queryType, resolver, trace }) => {
			return handleToolExecution(async () => {
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

				const output = {
					measurementId: result.id,
					type: result.type,
					status: result.status,
					target: result.target,
					probesCount: result.probesCount,
					results: result.results,
				};

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
					structuredContent: output,
				};
			}, "DNS lookup failed");
		},
	);

	// MTR tool
	agent.server.registerTool(
		"mtr",
		{
			title: "MTR Test",
			description:
				"Run an MTR (My Traceroute) diagnostic, which combines Ping and Traceroute. Use this tool to analyze packet loss and latency trends at every hop in the network path over time, helpful for spotting intermittent issues.",
			annotations: {
				readOnlyHint: true,
			},
			inputSchema: {
				target: z
					.string()
					.min(1)
					.describe("Destination hostname or IP to run the MTR against"),
				locations: z
					.union([z.array(z.string()), z.string()])
					.optional()
					.describe(
						"Specific locations to run the test from using the Globalping magic field syntax. Use 'world' to select a diverse set of probes globally. It supports Globalping magic field syntax: ['US', 'Europe', 'AS13335', 'London+UK', 'Amazon+Germany', 'Greece']. You can also use a previous measurement ID to compare results with the same probes.",
					),
				limit: z
					.number()
					.min(1)
					.max(100)
					.optional()
					.describe(
						"Number of probes to use (default: 3, max: 100). Higher limits provide more diverse results when using 'world' location.",
					),
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
			outputSchema: {
				measurementId: z.string(),
				type: z.string(),
				status: z.string(),
				target: z.string(),
				probesCount: z.number(),
				results: z.array(z.any()),
			},
		},
		async ({ target, locations, limit, protocol, port, packets }) => {
			return handleToolExecution(async () => {
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

				const output = {
					measurementId: result.id,
					type: result.type,
					status: result.status,
					target: result.target,
					probesCount: result.probesCount,
					results: result.results,
				};

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
					structuredContent: output,
				};
			}, "MTR test failed");
		},
	);

	// HTTP tool
	agent.server.registerTool(
		"http",
		{
			title: "HTTP Request",
			description:
				"Send HTTP/HTTPS requests (GET, HEAD or OPTIONS) to a URL from global locations. Use this tool to check website uptime, verify response status codes, analyze timing (TTFB, download), and debug CDN or caching issues.",
			annotations: {
				readOnlyHint: true,
			},
			inputSchema: {
				target: z.string().describe("Domain name or IP to test (e.g., 'example.com')"),
				locations: z
					.union([z.array(z.string()), z.string()])
					.optional()
					.describe(
						"Specific locations to run the test from using the Globalping magic field syntax. Use 'world' to select a diverse set of probes globally. It supports Globalping magic field syntax: ['US', 'Europe', 'AS13335', 'London+UK', 'Amazon+Germany', 'Greece']. You can also use a previous measurement ID to compare results with the same probes.",
					),
				limit: z
					.number()
					.min(1)
					.max(100)
					.optional()
					.describe(
						"Number of probes to use (default: 3, max: 100). Higher limits provide more diverse results when using 'world' location.",
					),
				method: z
					.enum(["GET", "HEAD", "OPTIONS"])
					.optional()
					.describe("HTTP method (default: GET)"),
				protocol: z
					.enum(["HTTP", "HTTPS"])
					.optional()
					.describe("Protocol to use (default: HTTPS)"),
				path: z
					.string()
					.optional()
					.describe("Path component of the URL (e.g., '/api/v1/status')"),
				port: z
					.number()
					.optional()
					.describe("Port number (default: 443 for HTTPS, 80 for HTTP)"),
				query: z
					.string()
					.optional()
					.describe("Query string (e.g., 'param=value&another=123')"),
			},
			outputSchema: {
				measurementId: z.string(),
				type: z.string(),
				status: z.string(),
				target: z.string(),
				probesCount: z.number(),
				results: z.array(z.any()),
			},
		},
		async ({ target, locations, limit, method, protocol, path, query, port }) => {
			return handleToolExecution(async () => {
				const token = getToken();
				const parsedLocations = parseLocations(locations);

				protocol = protocol ?? "HTTPS";

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

				const output = {
					measurementId: result.id,
					type: result.type,
					status: result.status,
					target: result.target,
					probesCount: result.probesCount,
					results: result.results,
				};

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
					structuredContent: output,
				};
			}, "HTTP request failed");
		},
	);

	// Locations tool
	agent.server.registerTool(
		"locations",
		{
			title: "List Probe Locations",
			description:
				"Retrieve the list of available Globalping probe locations. Use this tool to find specific countries, cities, or ASNs to use as the 'locations' argument in other measurement tools. Avoid using this tool unless absolutely necessary, instead simply provide the location you need to the tools above, the field is smart and will auto select the right probes.",
			annotations: {
				readOnlyHint: true,
			},
			inputSchema: {},
			outputSchema: {
				totalProbes: z.number(),
				continents: z.array(
					z.object({
						name: z.string(),
						countries: z.array(
							z.object({
								name: z.string(),
								cities: z.array(z.string()),
							}),
						),
					}),
				),
			},
		},
		async () => {
			return handleToolExecution(async () => {
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
				let textOutput = "Available Globalping Probe Locations:\n\n";

				const continents = [];
				for (const [continent, countries] of Object.entries(grouped)) {
					textOutput += `${continent}:\n`;

					const countryList = [];
					for (const [country, probes] of Object.entries(countries)) {
						const cities = [...new Set(probes.map((p) => p.location.city))];
						textOutput += `  ${country}: ${cities.join(", ")}\n`;
						countryList.push({
							name: country,
							cities: cities,
						});
					}

					continents.push({
						name: continent,
						countries: countryList,
					});

					textOutput += "\n";
				}

				textOutput += `\nTotal Probes: ${probes.length}\n`;
				textOutput +=
					'\nNote: To specify locations, use the "magic" field syntax in the locations parameter. ';
				textOutput += 'For example: ["US", "Europe", "AS13335", "London+UK"]\n';

				const output = {
					totalProbes: probes.length,
					continents: continents,
				};

				return {
					content: [
						{
							type: "text",
							text: textOutput,
						},
					],
					structuredContent: output,
				};
			}, "Failed to list locations");
		},
	);

	// Rate limits tool
	agent.server.registerTool(
		"limits",
		{
			title: "Check Rate Limits",
			description:
				"Check current API rate limits and remaining credits. Use this tool to monitor your usage quota and verify if you can perform additional measurements.",
			annotations: {
				readOnlyHint: true,
			},
			inputSchema: {},
			outputSchema: {
				authenticated: z.boolean(),
				rateLimit: z.object({
					type: z.string(),
					limit: z.number(),
					remaining: z.number(),
					reset: z.number(),
				}),
				credits: z
					.object({
						remaining: z.number(),
					})
					.optional(),
			},
		},
		async () => {
			return handleToolExecution(async () => {
				const token = getToken();
				const limits = await getRateLimits(agent, token);

				let textOutput = "Globalping Rate Limits:\n\n";

				// Add authentication status to the output
				textOutput += `Authentication Status: ${agent.getIsAuthenticated() ? "Authenticated" : "Unauthenticated"}\n`;

				// Only show first few characters of token for security if present
				if (token) {
					textOutput += `Token: ${maskToken(token)}\n`;
				} else {
					textOutput += "Token: None\n";
				}

				// Add the raw API response to the output
				textOutput += `\nAPI Response:\n${JSON.stringify(limits, null, 2)}\n\n`;

				// Format parsed data
				const rateLimit = limits.rateLimit.measurements.create;

				textOutput += `Type: ${rateLimit.type}\n`;
				textOutput += `Limit: ${rateLimit.limit} measurements\n`;
				textOutput += `Remaining: ${rateLimit.remaining} measurements\n`;
				textOutput += `Reset: in ${rateLimit.reset} seconds\n\n`;

				if (limits.credits) {
					textOutput += `Credits Remaining: ${limits.credits.remaining}\n`;
				}

				const output = {
					authenticated: agent.getIsAuthenticated(),
					rateLimit: {
						type: rateLimit.type,
						limit: rateLimit.limit,
						remaining: rateLimit.remaining,
						reset: rateLimit.reset,
					},
					credits: limits.credits
						? {
								remaining: limits.credits.remaining,
							}
						: undefined,
				};

				return {
					content: [
						{
							type: "text",
							text: textOutput,
						},
					],
					structuredContent: output,
				};
			}, "Failed to check rate limits");
		},
	);
}
