import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { registerGlobalpingTools } from "./globalping/tools";
import OAuthProvider from "@cloudflare/workers-oauth-provider";
import app, { refreshToken } from "./app";
import { GlobalpingEnv } from "./types/globalping";
import { env } from "cloudflare:workers";

type Bindings = GlobalpingEnv;

type Props = {
	accessToken: string;
	refreshToken: string;
	state: string;
	userName: string;
};

// Define custom state for storing previous measurements
type State = {
	lastMeasurementId?: string;
	measurements: Record<string, any>;
	storage?: DurableObjectStorage;
};

export class GlobalpingMCP extends McpAgent<Bindings, State, Props> {
	server = new McpServer({
		name: "Globalping MCP",
		version: "1.0.0",
	});

	// Initialize the state
	initialState: State = {
		measurements: {},
	};

	// Override to access props from user context in tools
	async getToolContext() {
		return { props: this.props };
	}

	async init() {
		// Register all the Globalping tools and pass the getToken function
		registerGlobalpingTools(this.server, () => `Bearer ${this.props.accessToken}`);

		// Tool to retrieve previous measurement by ID
		this.server.tool(
			"getMeasurement",
			{
				id: z.string().describe("The ID of a previously run measurement (e.g., '01HT4DGF5ZS7B2M93QP5ZTS3DN')"),
			},
			async ({ id }) => {
				// Check if we have this measurement cached in state
				if (this.state.measurements[id]) {
					const measurement = this.state.measurements[id];
					return {
						content: [
							{
								type: "text",
								text: `Cached measurement found:\n\n${JSON.stringify(measurement, null, 2)}`,
							},
						],
					};
				}

				return {
					content: [
						{
							type: "text",
							text: "Measurement not found in cache. Use one of the measurement tools (ping, traceroute, dns, mtr, http) to generate a new measurement.",
						},
					],
				};
			},
		);

		// Tool to explain comparison measurements
		this.server.tool("compareLocations", {}, async () => {
			const helpText = `
Globalping Comparison Measurements Guide

When you need to compare network measurements across different locations or between different targets, you can use measurement IDs to ensure the same probes are used.

## Using a Previous Measurement ID

To use the same probes as a previous measurement:

1. First, run a measurement to establish your baseline, for example:
   \`ping target="google.com" locations=["US+Cloudflare"]\`

2. When the measurement completes, note the measurement ID (shown in the results)

3. For your comparison measurement, use the measurement ID as the location:
   \`ping target="cloudflare.com" locations=["MEASUREMENT_ID"]\`

This ensures the exact same probes are used for both measurements, allowing for a direct comparison of results.

## Tips for Accurate Comparisons

- Make sure the second measurement is done shortly after the first one
- Use the same measurement type for both tests (ping vs ping, traceroute vs traceroute)
- The probes' online status may change between measurements
- Any probe that went offline will show as "offline" in the results

## Example Workflow

1. \`ping target="google.com" locations=["New York", "London", "Tokyo"]\`
   Result: Measurement ID abc123 with 3 probes

2. \`ping target="cloudflare.com" locations=["abc123"]\`
   Result: Same 3 probes from New York, London, and Tokyo are used

This approach allows for direct side-by-side comparisons of different targets using the exact same network vantage points.
`;

			return {
				content: [{ type: "text", text: helpText }],
			};
		});

		// Tool to get help about the available tools
		this.server.tool("help", {}, async () => {
			const helpText = `
Globalping MCP Server Help

This MCP server provides access to the Globalping API, which allows you to monitor, debug, and benchmark internet infrastructure using a globally distributed network of probes.

Available Tools:

1. ping - Perform a ping test to a target
   Parameters:
     - target: Domain name or IP to test (e.g., 'google.com', '1.1.1.1')
     - locations: Array of locations using magic field syntax (e.g., ['US', 'Europe', 'AS13335', 'London+UK'])
     - limit: Number of probes to use (default: 3, max: 100)
     - packets: Number of packets to send (default: 3)
   
2. traceroute - Perform a traceroute test to a target
   Parameters:
     - target: Domain name or IP to test (e.g., 'cloudflare.com', '1.1.1.1')
     - locations: Array of locations using magic field syntax
     - limit: Number of probes to use (default: 3, max: 100)
     - protocol: Protocol to use - "ICMP", "TCP", or "UDP" (default: ICMP)
     - port: Port number for TCP/UDP (default: 80)
   
3. dns - Perform a DNS lookup for a domain
   Parameters:
     - target: Domain name to resolve (e.g., 'example.com')
     - locations: Array of locations using magic field syntax
     - limit: Number of probes to use (default: 3, max: 100)
     - queryType: DNS record type - "A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA", "CAA" (default: A)
     - resolver: Custom resolver to use (e.g., '1.1.1.1', '8.8.8.8')
     - trace: Trace delegation path from root servers (default: false)
   
4. mtr - Perform an MTR (My Traceroute) test to a target
   Parameters:
     - target: Domain name or IP to test (e.g., 'google.com', '8.8.8.8')
     - locations: Array of locations using magic field syntax
     - limit: Number of probes to use (default: 3, max: 100)
     - protocol: Protocol to use - "ICMP", "TCP", or "UDP" (default: ICMP)
     - port: Port number for TCP/UDP (default: 80)
     - packets: Number of packets to send to each hop (default: 3)
   
5. http - Perform an HTTP request to a URL
   Parameters:
     - target: Domain name or IP to test (e.g., 'example.com')
     - locations: Array of locations using magic field syntax
     - limit: Number of probes to use (default: 3, max: 100)
     - method: HTTP method - "GET" or "HEAD" (default: GET)
     - protocol: Protocol to use - "HTTP" or "HTTPS" (default: auto-detect)
     - path: Path component of the URL (e.g., '/api/v1/status')
     - query: Query string (e.g., 'param=value&another=123')
   
6. locations - List all available Globalping probe locations
   No parameters required
   Returns a list of probe locations grouped by continent and country

7. limits - Show your current rate limits for the Globalping API
   No parameters required
   Returns rate limit information for the Globalping API
   
8. getMeasurement - Retrieve a previously run measurement by ID
   Parameters:
     - id: The ID of a previously run measurement (e.g., '01HT4DGF5ZS7B2M93QP5ZTS3DN')
   
9. compareLocations - Guide on how to run comparison measurements using the same probes
   No parameters required
   Returns instructions for comparing measurements across locations

Location Formats:
When specifying locations, use the magic field format in an array. Examples:
- Continents: ["EU", "NA", "AS"]
- Countries: ["US", "DE", "JP"]
- Cities: ["London", "Tokyo", "New York"]
- Networks: ["Cloudflare", "Google"]
- ASNs: ["AS13335", "AS15169"] 
- Combinations: ["London+UK", "Cloudflare+US"]
- Previous measurement IDs (for comparison): ["01HT4DGF5ZS7B2M93QP5ZTS3DN"]

For more information, visit: https://www.globalping.io
`;

			return {
				content: [{ type: "text", text: helpText }],
			};
		});

		this.server.tool("authStatus", {}, async () => {
			const token = this.props.accessToken;
			let status = "Not authenticated";
			let message = "Your are not authenticated with Globalping. Use the /login route to authenticate.";

			if (token) {
				status = "Authenticated";
				message = "You are authenticated with Globalping.";
				if (token.startsWith("Bearer ")) {
					message += " Your token is of type: Bearer";
				}
			}

			return {
				content: [
					{
						type: "text",
						text: `Authentication Status: ${status}\n\n${message}`,
					},
				],
			};
		});
	}

	async setOAuthState(state: any): Promise<any> {
		// Store the state in the Durable Object's storage
		return await this.ctx.storage?.put("oauth_state", state);
	}

	async getOAuthState(): Promise<any> {
		return await this.ctx.storage?.get("oauth_state");
	}

	// Override onStateUpdate to handle state persistence
	onStateUpdate(state: State) {
		// Optional: add logging or validation for state updates
		console.log(
			`State updated. Cached ${Object.keys(state.measurements).length} measurements.`,
		);
	}
}

export default new OAuthProvider({
	apiRoute: "/sse",
	// @ts-ignore
	apiHandler: GlobalpingMCP.mount("/sse", { binding: "globalping_mcp_object" }),
	// @ts-ignore
	defaultHandler: app,
	authorizeEndpoint: "/authorize",
	tokenEndpoint: "/token",
	clientRegistrationEndpoint: "/register",
	scopesSupported: ["measurements"],
	tokenExchangeCallback: async (options) => {

		if (options.grantType === 'refresh_token') {
			// For refresh token exchanges, might want to refresh upstream tokens too
			const upstreamTokens = await refreshToken(env, options.props.refreshToken);

			return {
				accessTokenProps: {
					...options.props,
					upstreamAccessToken: upstreamTokens.access_token
				},
				newProps: {
					...options.props,
					upstreamRefreshToken: upstreamTokens.refresh_token || options.props.upstreamRefreshToken
				},
				// Optionally override the default access token TTL to match the upstream token
				accessTokenTTL: upstreamTokens.expires_in
			};
		}

	}
});