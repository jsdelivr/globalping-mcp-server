import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Hono } from "hono";
import { layout, homeContent } from "./utils";
import { registerGlobalpingTools } from "./globalping/tools";

type Bindings = Env;

const app = new Hono<{
	Bindings: Bindings;
}>();

type Props = {
	bearerToken: string;
};

// Define custom state for storing previous measurements
type State = {
	lastMeasurementId?: string;
	measurements: Record<string, any>;
};

export class MyMCP extends McpAgent<Bindings, State, Props> {
	server = new McpServer({
		name: "Globalping MCP",
		version: "1.0.0",
	});

	// Initialize the state
	initialState: State = {
		measurements: {}
	};

	async init() {
		// Register the sample tools from the original codebase
		this.server.tool("add", { a: z.number(), b: z.number() }, async ({ a, b }) => ({
			content: [{ type: "text", text: String(a + b) }],
		}));

		// Tool that returns the user's bearer token
		// This is just for demonstration purposes, don't actually create a tool that does this!
		this.server.tool("getToken", {}, async () => ({
			content: [{ type: "text", text: String(`User's token: ${this.props.bearerToken}`) }],
		}));

		// Register all the Globalping tools
		registerGlobalpingTools(this.server);
		
		// Tool to retrieve previous measurement by ID
		this.server.tool(
			"getMeasurement",
			{
				id: z.string().describe("The ID of a previously run measurement")
			},
			async ({ id }) => {
				// Check if we have this measurement cached in state
				if (this.state.measurements[id]) {
					const measurement = this.state.measurements[id];
					return {
						content: [{ 
							type: "text", 
							text: `Cached measurement found:\n\n${JSON.stringify(measurement, null, 2)}` 
						}]
					};
				}
				
				return {
					content: [{ 
						type: "text", 
						text: "Measurement not found in cache. Use one of the globalping tools to generate a new measurement." 
					}]
				};
			}
		);
		
		// Tool to get help about the available tools
		this.server.tool(
			"help",
			{},
			async () => {
				const helpText = `
Globalping MCP Server Help

This MCP server provides access to the Globalping API, which allows you to monitor, debug, and benchmark internet infrastructure using a globally distributed network of probes.

Available Tools:

1. ping - Perform a ping test to a target
   Example: ping to google.com from US locations
   
2. traceroute - Perform a traceroute test to a target
   Example: traceroute to 1.1.1.1 using TCP protocol
   
3. dns - Perform a DNS lookup for a domain
   Example: dns lookup for example.com querying MX records
   
4. mtr - Perform an MTR (My Traceroute) test to a target
   Example: mtr to cloudflare.com using 5 packets per hop
   
5. http - Perform an HTTP request to a URL
   Example: http request to https://example.com using GET method
   
6. locations - List all available Globalping probe locations
   Example: locations

7. limits - Show your current rate limits for the Globalping API
   Example: limits
   
8. globalping - Smart tool that automatically selects the appropriate measurement type
   Example: globalping ping google.com from Europe
   
9. getMeasurement - Retrieve a previously run measurement by ID
   Example: getMeasurement with ID abc123
   
10. add - Simple addition tool (from original demo)
    Example: add 2+2
    
11. getToken - Returns your bearer token (from original demo)
    Example: getToken

Each tool accepts various parameters to customize the test. Use the location parameter to specify where tests should run from.

To compare results from multiple locations, use the locations parameter to specify an array of locations like ["US", "Europe", "AS13335"].

For more information, visit: https://www.globalping.io
`;

				return {
					content: [{ type: "text", text: helpText }]
				};
			}
		);
	}
	
	// Override onStateUpdate to handle state persistence
	onStateUpdate(state: State) {
		// Optional: add logging or validation for state updates
		console.log(`State updated. Cached ${Object.keys(state.measurements).length} measurements.`);
	}
}

// Render a basic homepage placeholder to make sure the app is up
app.get("/", async (c) => {
	const content = await homeContent(c.req.raw);
	return c.html(layout(content, "Globalping MCP Server"));
});

app.mount("/", (req, env, ctx) => {
	// Get the authorization header - this could include a token from the client
	const authHeader = req.headers.get("authorization");
	
	// Check for a GLOBALPING_TOKEN environment variable passed by the client
	// This will be available in header 'x-mcp-env-GLOBALPING_TOKEN' if provided by the client
	const envToken = req.headers.get("x-mcp-env-GLOBALPING_TOKEN");
	
	// Use the authorization header if present, otherwise create a bearer token from the env token
	ctx.props = {
		bearerToken: authHeader || (envToken ? `Bearer ${envToken}` : ""),
	};

	// Mount the MCP agent and pass the request to it
	return MyMCP.mount("/sse").fetch(req, env, ctx);
});

export default app;
