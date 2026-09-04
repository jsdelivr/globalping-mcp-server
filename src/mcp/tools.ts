/**
 * Globalping MCP Tools Registration
 */
import { z } from "zod";
import { getLocations, getRateLimits, runMeasurement } from "../api";
import type { GlobalpingMCP } from "../index";
import { isPublicTarget } from "../lib";
import { formatMeasurementSummary, parseLocations } from "./helpers";

/**
 * Helper to wrap tool execution with error handling
 */
async function handleToolExecution(operation: () => Promise<any>, errorMessagePrefix: string) {
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
				"Measure network latency, packet loss, and reachability to a target (domain or IP) from globally distributed probes. Use this tool to check if a server is online, debug connection issues, or assess global performance. Note: Only public endpoints are supported. Private networks cannot be tested.",
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				openWorldHint: true,
			},
			inputSchema: {
				target: z
					.string()
					.describe(
						"Public domain name or IP address to test (e.g., 'google.com', '1.1.1.1'). Private IPs (RFC1918), localhost, and link-local addresses are not supported.",
					),
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
		async ({ target, locations, limit, packets }, { signal }) => {
			return handleToolExecution(async () => {
				// Validate target is public
				const validation = isPublicTarget(target);
				if (!validation.valid) {
					throw new Error(
						`Invalid target: ${validation.reason}. Globalping only supports public endpoints. Private IP addresses (RFC1918), localhost, and link-local addresses are not allowed.`,
					);
				}

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
					signal,
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
				"Trace the network path to a target (domain or IP) from global locations. Use this tool to identify where packets are being dropped, analyze routing paths, or pinpoint latency sources in the network. Note: Only public endpoints are supported. Private networks cannot be tested.",
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				openWorldHint: true,
			},
			inputSchema: {
				target: z
					.string()
					.describe(
						"Public domain name or IP address to test (e.g., 'cloudflare.com', '1.1.1.1'). Private IPs (RFC1918), localhost, and link-local addresses are not supported.",
					),
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
		async ({ target, locations, limit, protocol, port }, { signal }) => {
			return handleToolExecution(async () => {
				// Validate target is public
				const validation = isPublicTarget(target);
				if (!validation.valid) {
					throw new Error(
						`Invalid target: ${validation.reason}. Globalping only supports public endpoints. Private IP addresses (RFC1918), localhost, and link-local addresses are not allowed.`,
					);
				}

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
					signal,
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
				"Resolve DNS records (A, AAAA, MX, etc.) for a domain from global locations. Use this tool to verify DNS propagation, troubleshoot resolution failures, or check if users in different regions are seeing the correct records. Note: Only public endpoints are supported. Private networks cannot be tested.",
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				openWorldHint: true,
			},
			inputSchema: {
				target: z
					.string()
					.describe(
						"Public domain name to resolve (e.g., 'google.com'). Private domains, localhost, and link-local addresses are not supported.",
					),
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
		async ({ target, locations, limit, queryType, resolver, trace }, { signal }) => {
			return handleToolExecution(async () => {
				// Validate target is public
				const validation = isPublicTarget(target);
				if (!validation.valid) {
					throw new Error(
						`Invalid target: ${validation.reason}. Globalping only supports public endpoints. Private IP addresses (RFC1918), localhost, and link-local addresses are not allowed.`,
					);
				}

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
					signal,
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
				"Run an MTR (My Traceroute) diagnostic, which combines Ping and Traceroute. Use this tool to analyze packet loss and latency trends at every hop in the network path over time, helpful for spotting intermittent issues. Note: Only public endpoints are supported. Private networks cannot be tested.",
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				openWorldHint: true,
			},
			inputSchema: {
				target: z
					.string()
					.min(1)
					.describe(
						"Public destination hostname or IP address to run the MTR against. Private IPs (RFC1918), localhost, and link-local addresses are not supported.",
					),
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
		async ({ target, locations, limit, protocol, port, packets }, { signal }) => {
			return handleToolExecution(async () => {
				// Validate target is public
				const validation = isPublicTarget(target);
				if (!validation.valid) {
					throw new Error(
						`Invalid target: ${validation.reason}. Globalping only supports public endpoints. Private IP addresses (RFC1918), localhost, and link-local addresses are not allowed.`,
					);
				}

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
					signal,
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
				"Send HTTP/HTTPS requests (GET, HEAD or OPTIONS) to a URL from global locations. Use this tool to check website uptime, verify response status codes, analyze timing (TTFB, download), and debug CDN or caching issues. Note: Only public endpoints are supported. Private networks cannot be tested.",
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				openWorldHint: true,
			},
			inputSchema: {
				target: z
					.string()
					.describe(
						"Public domain name or IP address to test (e.g., 'example.com'). Private IPs (RFC1918), localhost, and link-local addresses are not supported.",
					),
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
		async ({ target, locations, limit, method, protocol, path, query, port }, { signal }) => {
			return handleToolExecution(async () => {
				// Validate target is public
				const validation = isPublicTarget(target);
				if (!validation.valid) {
					throw new Error(
						`Invalid target: ${validation.reason}. Globalping only supports public endpoints. Private IP addresses (RFC1918), localhost, and link-local addresses are not allowed.`,
					);
				}

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
					signal,
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
				destructiveHint: false,
				openWorldHint: true,
			},
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
				"Check the current free hourly test allowance and remaining credits. The rateLimit fields describe only the free allowance, not a hard cap: authenticated users with credits can run additional tests after it is exhausted by spending one credit per test.",
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				openWorldHint: true,
			},
			outputSchema: {
				authenticated: z.boolean(),
				rateLimit: z
					.object({
						type: z
							.string()
							.describe("Scope of the free test allowance, such as account or IP."),
						limit: z
							.number()
							.describe("Total free tests available in the current window."),
						remaining: z
							.number()
							.describe("Free tests remaining in the current window."),
						reset: z.number().describe("Seconds until the free test allowance resets."),
					})
					.describe("The free hourly test allowance."),
				credits: z
					.object({
						remaining: z
							.number()
							.describe(
								"Number of remaining credits. One credit pays for one additional test.",
							),
					})
					.describe("Credits available after the free allowance is exhausted.")
					.optional(),
			},
		},
		async () => {
			return handleToolExecution(async () => {
				const token = getToken();
				const limits = await getRateLimits(agent, token);

				const rateLimit = limits.rateLimit.measurements.create;
				const pluralize = (count: number, singular: string) =>
					`${count} ${singular}${count === 1 ? "" : "s"}`;
				const resetUnits = [
					{ threshold: 60, divisor: 1, unit: "second" },
					{ threshold: 3600, divisor: 60, unit: "minute" },
					{ threshold: 86400, divisor: 3600, unit: "hour" },
					{ threshold: Number.POSITIVE_INFINITY, divisor: 86400, unit: "day" },
				];
				const resetUnit = resetUnits.find(({ threshold }) => rateLimit.reset < threshold)!;
				const reset = pluralize(
					Math.round(rateLimit.reset / resetUnit.divisor),
					resetUnit.unit,
				);
				const consumed = rateLimit.limit - rateLimit.remaining;

				let textOutput = `Authentication: ${agent.getIsAuthenticated() ? "token" : "IP address"}\n\n`;
				textOutput += "Creating measurements:\n";
				textOutput += ` - ${pluralize(rateLimit.limit, "test")} per hour\n`;
				textOutput += ` - ${consumed} consumed, ${rateLimit.remaining} remaining\n`;

				if (rateLimit.reset > 0) {
					textOutput += ` - resets in ${reset}\n`;
				}

				if (limits.credits) {
					textOutput += "\nCredits:\n";
					textOutput += ` - ${pluralize(limits.credits.remaining, "credit")} remaining (may be used to create measurements above the hourly limits)\n`;
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
