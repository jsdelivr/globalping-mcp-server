import { McpAgent } from "agents/mcp";
import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { isAPITokenRequest, isValidAPIToken } from "./auth";
import app from "./app";
import { MCP_CONFIG, OAUTH_CONFIG, MCPCAT_CONFIG } from "./config";
import type { GlobalpingEnv, Props, State } from "./types";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { registerGlobalpingTools } from "./mcp";
import { sanitizeToken } from "./auth";
import { validateOrigin, validateHost, getCorsOptionsForRequest } from "./lib";

export class GlobalpingMCP extends McpAgent<GlobalpingEnv, State, Props> {
	server = new McpServer({
		name: MCP_CONFIG.NAME,
		version: MCP_CONFIG.VERSION,
		icons: MCP_CONFIG.ICONS,
		websiteUrl: MCP_CONFIG.WEBSITE_URL,
		instructions: `You have access to Globalping, a global network measurement platform. Use it to run ping, traceroute, DNS, MTR, and HTTP tests from thousands of locations worldwide.

Key guidelines:
- Always use the 'locations' argument to specify where to run tests from (e.g., 'London', 'US', 'AWS').
- Use 'world' as a location for globally diverse results; increase the 'limit' to get a wider distribution.
- Use 'compareLocations' to understand how to benchmark performance.
- Authentication: You can authenticate via OAuth (prompted automatically) or by providing a Globalping API token in the 'Authorization' header (Bearer <token>) for higher rate limits.
- If a user asks for 'latency' or 'reachability', use 'ping'.
- If a user asks about 'routing' or 'hops', use 'traceroute' or 'mtr'.
- If a user asks about 'website availability', use 'http'.
- If a user asks about 'dns propagation', use 'dns'.`,
		capabilities: {
			tools: {
				listChanged: true,
			},
			resources: {},
			prompts: {},
			logging: {},
		},
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

		// Initialize MCPcat tracking if project ID is configured
		if (this.env.MCPCAT_PROJECT_ID && MCPCAT_CONFIG.ENABLED) {
			try {
				// Dynamic import to avoid loading mcpcat in environments where it's not needed
				// This prevents errors when mcpcat dependencies (like node:os) aren't available
				const mcpcat = await import("mcpcat");
				mcpcat.track(this.server, this.env.MCPCAT_PROJECT_ID, {
					// Identify users with generic labels
					identify: async () => {
						return this.getUserIdentification();
					},
				});

				console.log("✓ MCPcat tracking initialized");
			} catch (error) {
				console.error("✗ Failed to initialize MCPcat tracking:", error);
			}
		} else {
			console.log(
				"✗ MCPcat tracking disabled (no project ID or disabled in config)",
			);
		}

		// Register all the Globalping tools
		registerGlobalpingTools(this, () => {
			const raw = this.getToken() ?? "";
			return sanitizeToken(raw);
		});

		// Tool to retrieve previous measurement by ID
		this.server.registerTool(
			"getMeasurement",
			{
				title: "Get Previous Measurement",
				description:
					"Retrieve the full details of a past measurement using its ID. Use this tool to access raw JSON data, individual probe results, or cached measurements when the initial summary is insufficient.",
				annotations: {
					readOnlyHint: true,
				},
				inputSchema: {
					id: z
						.string()
						.describe(
							"The ID of a previously run measurement (e.g., '01HT4DGF5ZS7B2M93QP5ZTS3DN')",
						),
				},
				outputSchema: {
					measurement: z.object({}),
				},
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
						structuredContent: { measurement },
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
		this.server.registerTool(
			"compareLocations",
			{
				title: "Compare Locations Guide",
				description:
					"Get a guide on how to run comparison tests using the exact same probes as a previous measurement. Use this tool when you need to benchmark different targets from the same vantage points.",
				annotations: {
					readOnlyHint: true,
				},
				inputSchema: {},
				outputSchema: {
					guide: z.string(),
				},
			},
			async () => {
				const helpText = `
Globalping Comparison Measurements Guide

When you need to compare network measurements across different locations or between different targets, you can use measurement IDs to ensure the same probes are used.

## Using a Previous Measurement ID

To use the same probes as a previous measurement:

1. First, run a measurement to establish your baseline, for example:
   \`ping target="google.com" locations=["US+eyeball"]\`

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
					structuredContent: { guide: helpText },
				};
			},
		);

		// Tool to get help about the available tools
		this.server.registerTool(
			"help",
			{
				title: "Globalping MCP Help",
				description:
					"Get a comprehensive guide to the Globalping MCP server. Use this tool to learn about available tools, understand location formatting (magic fields), or see example usage patterns.",
				annotations: {
					readOnlyHint: true,
				},
				inputSchema: {},
				outputSchema: {
					helpText: z.string(),
				},
			},
			async () => {
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
- Global diversity: ["world"] (increase 'limit' for more locations)
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
					structuredContent: { helpText },
				};
			},
		);

		// Tool to check authentication status
		this.server.registerTool(
			"authStatus",
			{
				title: "Authentication Status",
				description:
					"Check the current authentication status. Use this tool to verify if the user is logged in and has a valid token for executing measurements.",
				annotations: {
					readOnlyHint: true,
				},
				inputSchema: {},
				outputSchema: {
					authenticated: z.boolean(),
					status: z.string(),
					message: z.string(),
				},
			},
			async () => {
				let status = "Not authenticated";
				let message =
					"You are not authenticated with Globalping. Use the /login route to authenticate.";

				if (this.props?.isAuthenticated) {
					status = "Authenticated";
					message = "You are authenticated with Globalping.";
				}

				const output = {
					authenticated: !!this.props?.isAuthenticated,
					status,
					message,
				};

				return {
					content: [
						{
							type: "text",
							text: `Authentication Status: ${status}\n\n${message}`,
						},
					],
					structuredContent: output,
				};
			},
		);
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

	/**
	 * Returns generic user identification for MCPcat analytics
	 * Does not expose PII - uses generic labels only
	 */
	private getUserIdentification(): {
		userId: string;
		userName: string;
		userData: Record<string, any>;
	} {
		const isAuth = this.props?.isAuthenticated;
		const hasAPIToken =
			this.props?.accessToken && isValidAPIToken(this.props.accessToken);

		// Check API token first (most specific) to prevent misclassification
		// as OAuth when API token flow sets isAuthenticated and userName
		if (hasAPIToken) {
			return {
				userId: "api_token_user",
				userName: "API Token User",
				userData: {
					authMethod: "api_token",
				},
			};
		}

		if (isAuth && this.props?.userName) {
			return {
				userId: "oauth_user",
				userName: "OAuth User",
				userData: {
					authMethod: "oauth",
					clientId: this.props.clientId || "unknown",
				},
			};
		}

		return {
			userId: "anonymous_user",
			userName: "Anonymous User",
			userData: {
				authMethod: "none",
			},
		};
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

	// Validate Host header to prevent DNS rebinding attacks (first layer)
	// This check happens before Origin validation for defense-in-depth
	const host = req.headers.get("Host");
	if (!validateHost(host)) {
		console.error(`[Security] Rejected request with invalid Host header: ${host}`);
		return new Response("Forbidden: Invalid Host", {
			status: 403,
			headers: {
				"Content-Type": "text/plain",
			},
		});
	}

	// Validate Origin header for all MCP requests to prevent DNS rebinding attacks
	// Required by MCP specification for Streamable HTTP transport
	// Note: We only validate when Origin header is present. Browser requests
	// will always include Origin, while non-browser MCP clients (Claude Desktop,
	// VSCode extension) may not send this header.
	const origin = req.headers.get("Origin");
	if (origin && !validateOrigin(origin)) {
		console.error(`[Security] Rejected request with invalid Origin header: ${origin}`);
		return new Response("Forbidden: Invalid Origin", {
			status: 403,
			headers: {
				"Content-Type": "text/plain",
			},
		});
	}

	if (pathname === MCP_CONFIG.ROUTES.SSE || pathname === MCP_CONFIG.ROUTES.SSE_MESSAGE) {
		return GlobalpingMCP.serveSSE(MCP_CONFIG.ROUTES.SSE, {
			binding: MCP_CONFIG.BINDING_NAME,
			corsOptions: getCorsOptionsForRequest(req),
		}).fetch(req, env, ctx);
	}

	if (pathname === MCP_CONFIG.ROUTES.MCP || pathname === MCP_CONFIG.ROUTES.STREAMABLE_HTTP) {
		return GlobalpingMCP.serve(MCP_CONFIG.ROUTES.MCP, {
			binding: MCP_CONFIG.BINDING_NAME,
			corsOptions: getCorsOptionsForRequest(req),
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

	// Validate Host header to prevent DNS rebinding attacks (first layer)
	// This check happens before Origin validation for defense-in-depth
	const host = req.headers.get("Host");
	if (!validateHost(host)) {
		console.error(`[Security] Rejected API token request with invalid Host header: ${host}`);
		return new Response("Forbidden: Invalid Host", {
			status: 403,
			headers: {
				"Content-Type": "text/plain",
			},
		});
	}

	// Validate Origin header to prevent DNS rebinding attacks
	// Note: We only validate when Origin header is present. Browser requests
	// will always include Origin, while non-browser MCP clients may not.
	const origin = req.headers.get("Origin");
	if (origin && !validateOrigin(origin)) {
		console.error(
			`[Security] Rejected API token request with invalid Origin header: ${origin}`,
		);
		return new Response("Forbidden: Invalid Origin", {
			status: 403,
			headers: {
				"Content-Type": "text/plain",
			},
		});
	}

	const authHeader = req.headers.get("Authorization");
	if (!authHeader) {
		return new Response("Unauthorized", { status: 401 });
	}

	const [type, tokenStr] = authHeader.split(" ");
	if (!type || type.toLowerCase() !== "bearer") {
		return new Response("Unauthorized", { status: 401 });
	}

	const token = tokenStr;
	if (!token || !isValidAPIToken(token)) {
		return new Response("Unauthorized", { status: 401 });
	}

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
			.serveSSE(MCP_CONFIG.ROUTES.SSE, {
				binding: MCP_CONFIG.BINDING_NAME,
				corsOptions: getCorsOptionsForRequest(req),
			})
			.fetch(req, env, ctx);
	}

	if (pathname === MCP_CONFIG.ROUTES.MCP || pathname === MCP_CONFIG.ROUTES.STREAMABLE_HTTP) {
		return agent
			.serve(MCP_CONFIG.ROUTES.MCP, {
				binding: MCP_CONFIG.BINDING_NAME,
				corsOptions: getCorsOptionsForRequest(req),
			})
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
