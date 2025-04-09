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
		measurements: {},
	};

	async init() {
		// Register all the Globalping tools
		registerGlobalpingTools(this.server);

		// Tool to retrieve previous measurement by ID
		this.server.tool(
			"getMeasurement",
			{
				id: z.string().describe("The ID of a previously run measurement"),
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
							text: "Measurement not found in cache. Use one of the globalping tools to generate a new measurement.",
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
   \`ping google.com from "US+Cloudflare"\`

2. When the measurement completes, note the measurement ID (shown in the results)

3. For your comparison measurement, use the measurement ID as the location:
   \`ping cloudflare.com with locations ["MEASUREMENT_ID"]\`

This ensures the exact same probes are used for both measurements, allowing for a direct comparison of results.

## Tips for Accurate Comparisons

- Make sure the second measurement is done shortly after the first one
- Use the same measurement type for both tests (ping vs ping, traceroute vs traceroute)
- The probes' online status may change between measurements
- Any probe that went offline will show as "offline" in the results

## Example Workflow

1. \`ping google.com with locations ["New York", "London", "Tokyo"]\`
   Result: Measurement ID abc123 with 3 probes

2. \`ping cloudflare.com with locations ["abc123"]\`
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
   
10. compareLocations - Guide on how to run comparison measurements using the same probes
   Example: compareLocations

Each tool accepts various parameters to customize the test. Use the location parameter to specify where tests should run from.

To compare results from multiple locations, use the locations parameter to specify an array of locations like ["US", "Europe", "AS13335"]. To use the same probes for two different measurements, use the measurement ID as a location in the second measurement: ["abc123"].

For more information, visit: https://www.globalping.io
`;

			return {
				content: [{ type: "text", text: helpText }],
			};
		});
	}

	// Override onStateUpdate to handle state persistence
	onStateUpdate(state: State) {
		// Optional: add logging or validation for state updates
		console.log(
			`State updated. Cached ${Object.keys(state.measurements).length} measurements.`,
		);
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
