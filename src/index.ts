import { McpAgent } from "agents/mcp";
import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { isAPITokenRequest } from "./auth";
import app from "./app";
import { MCP_CONFIG, OAUTH_CONFIG } from "./config";
import type { GlobalpingEnv, Props, State } from "./types";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { registerGlobalpingTools } from "./mcp";
import { sanitizeToken } from "./auth";

export class GlobalpingMCP extends McpAgent<GlobalpingEnv, State, Props> {
	server = new McpServer({
		name: MCP_CONFIG.NAME,
		version: MCP_CONFIG.VERSION,
		icons: MCP_CONFIG.ICONS,
		websiteUrl: MCP_CONFIG.WEBSITE_URL,
	});

	// Initialize the state
	initialState: State = {
		measurements: {},
		oAuth: {},
	};

	// Override to access props from user context in tools
	async getToolContext() {
		return { props: this.props };
	}

	async init() {
		console.log("Initializing Globalping MCP...");

		// Register all the Globalping tools
		registerGlobalpingTools(this, () => {
			const raw = this.getToken() ?? "";
			return sanitizeToken(raw);
		});

		// Tool to retrieve previous measurement by ID
		this.server.tool(
			"getMeasurement",
			{
				id: z
					.string()
					.describe(
						"The ID of a previously run measurement (e.g., '01HT4DGF5ZS7B2M93QP5ZTS3DN')",
					),
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

		// Tool to check authentication status
		this.server.tool("authStatus", {}, async () => {
			let status = "Not authenticated";
			let message =
				"You are not authenticated with Globalping. Use the /login route to authenticate.";

			if (this.props?.isAuthenticated) {
				status = "Authenticated";
				message = "You are authenticated with Globalping.";
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
		if (this.state) {
			return this.setState({
				...this.state,
				oAuth: state,
			});
		}
		return this.setState({
			...this.initialState,
			oAuth: state,
		});
	}

	async getOAuthState(): Promise<any> {
		return this.state.oAuth;
	}

	async removeOAuthData(): Promise<void> {
		try {
			if (!this.props) return;

			// Find and remove grants by userId
			const responseGrant = await this.env.OAUTH_KV.list({
				prefix: `grant:${this.props.userName}`,
			});
			for (const { name } of responseGrant.keys) {
				await this.env.OAUTH_KV.delete(name);
			}

			// Find and remove tokens
			const responseToken = await this.env.OAUTH_KV.list({
				prefix: `token:${this.props.userName}`,
			});
			for (const { name } of responseToken.keys) {
				await this.env.OAUTH_KV.delete(name);
			}
		} catch (error) {
			console.error("Error removing OAuth data:", error);
		}
	}

	getToken(): string | undefined {
		// Return the access token from the props
		return this.props?.accessToken;
	}

	setIsAuthenticated(isAuthenticated: boolean): void {
		if (!this.props) return;
		this.props.isAuthenticated = isAuthenticated;
	}

	getIsAuthenticated(): boolean {
		return !!this.props?.isAuthenticated;
	}

	// Override onStateUpdate to handle state persistence
	onStateUpdate(state: State) {
		// Optional: add logging or validation for state updates
		console.log(
			`State updated. Cached ${Object.keys(state.measurements).length} measurements.`,
		);
	}
}

/**
 * Handle MCP requests (SSE and HTTP transports)
 */
async function handleMcpRequest(req: Request, env: GlobalpingEnv, ctx: ExecutionContext) {
	const { pathname } = new URL(req.url);

	if (pathname === MCP_CONFIG.ROUTES.SSE || pathname === MCP_CONFIG.ROUTES.SSE_MESSAGE) {
		return GlobalpingMCP.serveSSE(MCP_CONFIG.ROUTES.SSE, {
			binding: MCP_CONFIG.BINDING_NAME,
		}).fetch(req, env, ctx);
	}

	if (pathname === MCP_CONFIG.ROUTES.MCP || pathname === MCP_CONFIG.ROUTES.STREAMABLE_HTTP) {
		return GlobalpingMCP.serve(MCP_CONFIG.ROUTES.MCP, {
			binding: MCP_CONFIG.BINDING_NAME,
		}).fetch(req, env, ctx);
	}

	return new Response("Not found", { status: 404 });
}

/**
 * Handle API token requests (direct API access without OAuth)
 */
async function handleAPITokenRequest<
	T extends typeof McpAgent<unknown, unknown, Record<string, unknown>>,
>(agent: T, req: Request, env: GlobalpingEnv, ctx: ExecutionContext) {
	const { pathname } = new URL(req.url);

	const authHeader = req.headers.get("Authorization");
	if (!authHeader) {
		throw new Error("Authorization header is required");
	}

	const [type, tokenStr] = authHeader.split(" ");
	if (type !== "Bearer") {
		throw new Error("Invalid authorization type, must be Bearer");
	}

	const token = tokenStr;

	// Set props for API token user
	// @ts-ignore
	ctx.props = {
		accessToken: `Bearer ${token}`,
		refreshToken: "",
		state: "",
		userName: "API Token User",
		clientId: "",
		isAuthenticated: true,
	} satisfies Props;

	if (pathname === MCP_CONFIG.ROUTES.SSE || pathname === MCP_CONFIG.ROUTES.SSE_MESSAGE) {
		return agent
			.serveSSE(MCP_CONFIG.ROUTES.SSE, { binding: MCP_CONFIG.BINDING_NAME })
			.fetch(req, env, ctx);
	}

	if (pathname === MCP_CONFIG.ROUTES.MCP || pathname === MCP_CONFIG.ROUTES.STREAMABLE_HTTP) {
		return agent
			.serve(MCP_CONFIG.ROUTES.MCP, { binding: MCP_CONFIG.BINDING_NAME })
			.fetch(req, env, ctx);
	}

	return new Response("Not found", { status: 404 });
}

/**
 * Main fetch handler
 */
export default {
	fetch: async (req: Request, env: GlobalpingEnv, ctx: ExecutionContext) => {
		// Check if this is an API token request
		if (await isAPITokenRequest(req)) {
			return handleAPITokenRequest(GlobalpingMCP, req, env, ctx);
		}

		// Otherwise, use OAuth provider
		return new OAuthProvider({
			apiRoute: OAUTH_CONFIG.API_ROUTES,
			apiHandler: { fetch: handleMcpRequest as any },
			// @ts-ignore
			defaultHandler: app,
			authorizeEndpoint: OAUTH_CONFIG.ENDPOINTS.AUTHORIZE,
			tokenEndpoint: OAUTH_CONFIG.ENDPOINTS.TOKEN,
			clientRegistrationEndpoint: OAUTH_CONFIG.ENDPOINTS.REGISTER,
			scopesSupported: OAUTH_CONFIG.SCOPES,
		}).fetch(req, env, ctx);
	},
};
