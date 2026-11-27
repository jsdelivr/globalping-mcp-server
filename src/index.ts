import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as agentcat from "agentcat";
import { McpAgent } from "agents/mcp";
import { z } from "zod";
import { introspectToken } from "./api";
import app from "./app";
import { isAPITokenRequest, isValidAPIToken, sanitizeToken, withGrantStore } from "./auth";
import { AGENTCAT_CONFIG, MCP_CONFIG, OAUTH_CONFIG } from "./config";
import { getCorsOptionsForRequest, redactAgentCatEvent, validateHost, validateOrigin } from "./lib";
import { registerGlobalpingTools } from "./mcp";
import type { GlobalpingEnv, Props, State } from "./types";

export { GrantStore } from "./auth";

export class GlobalpingMCP extends McpAgent<GlobalpingEnv, State, Props> {
	server = new McpServer(
		{
			name: MCP_CONFIG.NAME,
			version: MCP_CONFIG.VERSION,
			icons: MCP_CONFIG.ICONS,
			websiteUrl: MCP_CONFIG.WEBSITE_URL,
		},
		{
			capabilities: {
				tools: {
					listChanged: true,
				},
			},
			instructions: `Globalping runs ping, traceroute, DNS, MTR and HTTP measurements from thousands of probes worldwide.

- Authentication: You can authenticate via OAuth (prompted automatically) or by providing a Globalping API token in the 'Authorization' header (Bearer <token>) for higher rate limits.
- If a user asks for 'latency' or 'reachability', use 'ping'.
- If a user asks about 'routing' or 'hops', use 'traceroute' or 'mtr'.
- If a user asks about 'website availability', use 'http'.
- If a user asks about 'dns propagation', use 'dns'.
- Only when a user asks to view, open, or share a measurement, present its results URL as https://globalping.io?measurement=<measurement-id>.`,
		},
	);

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

		// Initialize AgentCat tracking if project ID is configured
		if (this.env.MCPCAT_PROJECT_ID && AGENTCAT_CONFIG.ENABLED) {
			try {
				agentcat.track(this.server, this.env.MCPCAT_PROJECT_ID, {
					enableToolCallContext: false,
					redactEvent: redactAgentCatEvent,
					resolveSessionId: () => this.getSessionId(),
					// Identify users with generic labels
					identify: async () => {
						return this.getUserIdentification();
					},
				});

				console.log("✓ AgentCat tracking initialized");
			} catch (error) {
				console.warn("⚠ AgentCat tracking initialization failed (non-fatal):", error);
			}
		} else {
			console.log("✗ AgentCat tracking disabled (no project ID or disabled in config)");
		}

		// Register all the Globalping tools
		registerGlobalpingTools(this, () => {
			const raw = this.getToken() ?? "";
			return sanitizeToken(raw);
		});

		// Tool to explain comparison measurements
		this.server.registerTool(
			"compareLocations",
			{
				title: "Compare Locations Guide",
				description:
					"Get a guide on how to run comparison tests using the exact same probes as a previous measurement. Use this tool when you need to benchmark different targets from the same vantage points.",
				annotations: {
					readOnlyHint: true,
					destructiveHint: false,
					openWorldHint: false,
				},
			},
			async () => {
				const helpText = `
Globalping Comparison Measurements Guide

When you need to compare network measurements across different locations or between different targets, you can use measurement IDs to ensure the same probes are used.

## Using a Previous Measurement ID

To use the same probes as a previous measurement:

1. First, run a measurement to establish your baseline, for example:
   \`ping target="google.com" locations=["US+eyeball-network"]\`

2. When the measurement completes, note the measurement ID (shown in the results)

3. For your comparison measurement, use the measurement ID as the location:
   \`ping target="cloudflare.com" locations=["MEASUREMENT_ID"]\`

This ensures the exact same probes are used for both measurements, allowing for a direct comparison of results.

## Tips for Accurate Comparisons

- Make sure the second measurement is done shortly after the first one
- For a like-for-like benchmark use the same measurement type and options
- A measurement ID works as a location only until the original measurement expires
- The probes' online status may change between measurements
- Any probe that went offline will show as "offline" in the results

## Example Workflow

1. \`ping target="google.com" locations=["New York", "London", "Tokyo"]\`
   Result: Measurement ID abc123 with 3 probes

2. \`ping target="cloudflare.com" locations=["abc123"]\`
   Result: Same 3 probes from New York, London, and Tokyo are used

This approach allows for direct side-by-side comparisons of different targets using the exact same network vantage points.
`.trim();

				return {
					content: [{ type: "text", text: helpText }],
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
					destructiveHint: false,
					openWorldHint: false,
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
     - limit: Number of probes to use (default: 3 or one per location, max: 100)
     - packets: Number of packets to send (default: 3)
     - protocol: Protocol to use - "ICMP" or "TCP" (default: ICMP)
     - port: Port number for TCP (default: 80)
     - ipVersion: IP version - 4 or 6 (default: 4), only for domain targets
     - output: How much to return for each probe - "summary" or "full" (default: "full", or "summary" when the output is longer than 30000 characters)

2. traceroute - Perform a traceroute test to a target
   Parameters:
     - target: Domain name or IP to test (e.g., 'cloudflare.com', '1.1.1.1')
     - locations: Array of locations using magic field syntax
     - limit: Number of probes to use (default: 3 or one per location, max: 100)
     - protocol: Protocol to use - "ICMP", "TCP", or "UDP" (default: ICMP)
     - port: Port number for TCP (default: 80)
     - ipVersion: IP version - 4 or 6 (default: 4), only for domain targets
     - output: How much to return for each probe - "summary" or "full" (default: "full", or "summary" when the output is longer than 30000 characters)

3. dns - Perform a DNS lookup for a domain
   Parameters:
     - target: Domain name to resolve (e.g., 'example.com')
     - locations: Array of locations using magic field syntax
     - limit: Number of probes to use (default: 3 or one per location, max: 100)
     - queryType: DNS record type - "A", "AAAA", "ANY", "CNAME", "DNSKEY", "DS", "HTTPS", "MX", "NS", "NSEC", "PTR", "RRSIG", "SOA", "TXT", "SRV", "SVCB" (default: A)
     - resolver: Custom resolver to use (e.g., '1.1.1.1', '8.8.8.8')
     - trace: Trace delegation path from root servers (default: false)
     - protocol: Protocol to use - "UDP" or "TCP" (default: UDP)
     - port: Port number (default: 53)
     - ipVersion: IP version - 4 or 6 (default: 4), only for a domain resolver
     - output: How much to return for each probe - "summary" or "full" (default: "full", or "summary" when the output is longer than 30000 characters)

4. mtr - Perform an MTR (My Traceroute) test to a target
   Parameters:
     - target: Domain name or IP to test (e.g., 'google.com', '8.8.8.8')
     - locations: Array of locations using magic field syntax
     - limit: Number of probes to use (default: 3 or one per location, max: 100)
     - protocol: Protocol to use - "ICMP", "TCP", or "UDP" (default: ICMP)
     - port: Port number for TCP/UDP (default: 80)
     - packets: Number of packets to send to each hop (default: 3)
     - ipVersion: IP version - 4 or 6 (default: 4), only for domain targets
     - output: How much to return for each probe - "summary" or "full" (default: "full", or "summary" when the output is longer than 30000 characters)

5. http - Perform an HTTP request to a host
   Parameters:
     - target: Domain name or IP to test, without protocol and path (e.g., 'example.com')
     - locations: Array of locations using magic field syntax
     - limit: Number of probes to use (default: 3 or one per location, max: 100)
     - method: HTTP method - "GET", "HEAD" or "OPTIONS" (default: GET)
     - protocol: Protocol to use - "HTTP", "HTTPS" or "HTTP2" (default: HTTPS)
     - path: Path component of the URL (e.g., '/api/v1/status')
     - port: Port number (default: 443 for HTTPS and HTTP2, 80 for HTTP)
     - query: Query string (e.g., 'param=value&another=123')
     - host: Host header value (default: the target)
     - headers: Request headers (e.g., { 'Accept-Encoding': 'br' })
     - resolver: IP address of the DNS resolver to use (e.g., '1.1.1.1')
     - ipVersion: IP version - 4 or 6 (default: 4), only for domain targets
     - output: How much to return for each probe - "summary", "headers" or "full" (default: "headers", or "summary" when the output is longer than 30000 characters)

6. locations - List the locations of Globalping probes
   Parameters:
     - country: Two-letter country code (e.g., 'US'). Optional
   Returns countries, the biggest networks and tags, or all cities, networks and tags of one country

7. limits - Show your current free test allowance and credits for the Globalping API
   No parameters required
   The rate limit is the free hourly allowance, not a hard cap: authenticated users with credits can run additional tests by spending one credit per test

8. getMeasurement - Retrieve the current status and results of a measurement by ID
   Parameters:
     - id: The ID of a measurement (e.g., '01HT4DGF5ZS7B2M93QP5ZTS3DN')
     - output: How much to return for each probe - "summary", "headers" (only for http measurements) or "full" (default: "full", "headers" for http measurements, or "summary" when the output is longer than 30000 characters)
     - probes: Which probes to return, by their number in the output, e.g. [2, 5] (default: all probes)

9. compareLocations - Guide on how to run comparison measurements using the same probes
   No parameters required
   Returns instructions for comparing measurements across locations

10. authStatus - Check the token and show the account it belongs to
   No parameters required

Location Formats:
When specifying locations, use the magic field format in an array. Examples:
- Global diversity: ["world"] (increase 'limit' for more locations)
- Continents: ["Europe", "North America", "Asia"]
- Countries: ["US", "DE", "JP"]
- Cities: ["London", "Tokyo", "New York"]
- Networks: ["Cloudflare", "Google"]
- ASNs: ["AS13335", "AS15169"]
- Combinations: ["London+UK", "Cloudflare+US"]
- Previous measurement IDs (for comparison): ["01HT4DGF5ZS7B2M93QP5ZTS3DN"]

For more information, visit: https://www.globalping.io
`.trim();

				return {
					content: [{ type: "text", text: helpText }],
				};
			},
		);

		// Tool to check authentication status
		this.server.registerTool(
			"authStatus",
			{
				title: "Authentication Status",
				description:
					"Check the token of this connection against Globalping. Use this tool to verify that the token is valid and to see the account it belongs to.",
				annotations: {
					readOnlyHint: true,
					destructiveHint: false,
					openWorldHint: false,
				},
				outputSchema: {
					authenticated: z.boolean(),
					status: z.string(),
					message: z.string(),
				},
			},
			async () => {
				const token = sanitizeToken(this.getToken() ?? "");
				const { active, username, organization } = token
					? await introspectToken(token)
					: { active: false };
				const account = organization ? `${organization} (via ${username})` : username;

				this.setIsAuthenticated(active);

				const authenticated = active;
				const status = authenticated ? "Authenticated" : "Not authenticated";
				const message = authenticated
					? `Logged in${account ? ` as ${account}` : ""}.`
					: "Not logged in.";

				const output = {
					authenticated,
					status,
					message,
				};

				return {
					content: [
						{
							type: "text",
							text: message,
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

	getToken(): string | undefined {
		// Return the access token from the props
		return this.props?.accessToken;
	}

	/**
	 * Returns generic user identification for AgentCat analytics
	 * Does not expose PII - uses generic labels only
	 */
	private getUserIdentification(): {
		userId: string;
		userName: string;
		userData: Record<string, any>;
	} {
		const isAuth = this.props?.isAuthenticated;
		const hasAPIToken = !this.props?.isOAuth;

		// Check API token first (most specific) to prevent misclassification
		// as OAuth when API token flow sets isAuthenticated
		if (hasAPIToken) {
			return {
				userId: "api_token_user",
				userName: "API Token User",
				userData: {
					authMethod: "api_token",
				},
			};
		}

		if (isAuth && this.props?.isOAuth) {
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
		return GlobalpingMCP.serve(pathname, {
			binding: MCP_CONFIG.BINDING_NAME,
			corsOptions: getCorsOptionsForRequest(req),
		}).fetch(req, env, ctx);
	}

	return new Response("Not found", { status: 404 });
}

/**
 * Handle API token requests (direct API access without OAuth)
 */
async function handleAPITokenRequest(
	agent: typeof GlobalpingMCP,
	req: Request,
	env: GlobalpingEnv,
	ctx: ExecutionContext,
) {
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
		clientId: "",
		isAuthenticated: true,
		isOAuth: false,
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
			.serve(pathname, {
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
		const requestUrl = new URL(req.url);
		const isLoopback =
			requestUrl.hostname === "localhost" ||
			requestUrl.hostname === "127.0.0.1" ||
			requestUrl.hostname === "[::1]";

		if (requestUrl.protocol !== "https:" && !isLoopback) {
			return new Response("HTTPS required", { status: 403 });
		}

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
			resourceMetadata: {
				...(requestUrl.protocol === "https:"
					? { authorization_servers: [requestUrl.origin] }
					: {}),
				scopes_supported: OAUTH_CONFIG.SCOPES,
			},
		}).fetch(req, withGrantStore(env), ctx);
	},
};
