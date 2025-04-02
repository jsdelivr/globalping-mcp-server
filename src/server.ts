/**
 * Globalping MCP Server
 * 
 * This is the main entry point for the Globalping MCP Server.
 * It initializes the MCP server, connects via stdio transport,
 * and registers tools for interacting with the Globalping API.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from 'dotenv';
import { z } from "zod";
import { createMeasurement, pollForResult, MeasurementRequest } from './globalping/api.js';

// Load environment variables from .env file
dotenv.config();

// Create the MCP Server instance
const server = new McpServer({
    name: "globalping-mcp-server",
    version: require("../package.json").version, // Use version from package.json
    capabilities: {
        // Declare potential capabilities. We'll add specifics later.
        tools: {},
        resources: {}, // Not used in this project, but good practice to declare
        prompts: {},   // Not used in this project
    },
});

console.error("Globalping MCP Server starting..."); // Log to stderr

// --- Tool Registration ---

/**
 * Common schema definitions for Globalping measurement tools
 * These schemas define the shared properties across different measurement types
 */

// Common schema for location filtering
const locationSchema = z.object({
    country: z.string().length(2, "Must be a 2-letter country code (ISO 3166-1 alpha-2)").optional(),
    continent: z.string().optional(),
    region: z.string().optional(),
    city: z.string().optional(),
    asn: z.number().int().positive().optional(),
    network: z.string().optional(),
    tag: z.string().optional(),
    limit: z.number().int().positive().optional().describe("Max number of probes from this location spec"),
}).optional().describe("Specify geographic locations or networks for probes");

// Common schema for global limit
const globalLimitSchema = z.number().int().positive().optional().describe("Overall maximum number of probes for the measurement");
const ipVersionSchema = z.enum(['4', '6']).optional().describe("IP version to use (4 or 6)");

// Default number of probes if not specified by user/client
const DEFAULT_PROBE_LIMIT = 3;

/**
 * Globalping Ping Tool
 * Performs ICMP ping measurements to a target host or IP address from specified locations
 */
server.tool(
    "globalping-ping", // Tool name
    "Perform ICMP ping measurements to a target host or IP address from specified locations.", // Description
    { // Input schema using Zod
        target: z.string().describe("The hostname or IP address to ping."),
        locations: z.array(locationSchema).optional().describe("Array of location specifications."),
        limit: globalLimitSchema,
        packets: z.number().int().positive().optional().describe("Number of ping packets to send (default: 3)."),
        ipVersion: ipVersionSchema,
    },
    async (params) => { // Placeholder handler
        console.error(`[MCP Tool] Received 'globalping-ping' request for target: ${params.target}`);
        // TODO: Implement Globalping API call and result handling in Step 4
        return { content: [{ type: "text", text: `Placeholder: Ping tool called for ${params.target}. Results pending implementation.` }] };
    }
);

/**
 * Globalping Traceroute Tool
 * Performs traceroute measurements to trace the network path to a target host or IP address
 */
server.tool(
    "globalping-traceroute",
    "Perform traceroute measurements to trace the network path to a target host or IP address.",
    {
        target: z.string().describe("The hostname or IP address for the traceroute."),
        locations: z.array(locationSchema).optional(),
        limit: globalLimitSchema,
        port: z.number().int().positive().optional().describe("Destination port for UDP/TCP traceroute."),
        protocol: z.enum(['ICMP', 'UDP', 'TCP']).optional().describe("Traceroute protocol (default: ICMP)."),
        packets: z.number().int().positive().optional().describe("Number of packets per hop (default: 3)."),
        ipVersion: ipVersionSchema,
    },
    async (params) => { // Placeholder handler
        console.error(`[MCP Tool] Received 'globalping-traceroute' request for target: ${params.target}`);
        // TODO: Implement Globalping API call and result handling in Step 4
        return { content: [{ type: "text", text: `Placeholder: Traceroute tool called for ${params.target}. Results pending implementation.` }] };
    }
);

/**
 * Globalping DNS Tool
 * Performs DNS lookups for a domain name from specified locations
 */
server.tool(
    "globalping-dns",
    "Perform DNS lookups for a domain name from specified locations.",
    {
        target: z.string().describe("The domain name to query."),
        locations: z.array(locationSchema).optional(),
        limit: globalLimitSchema,
        queryType: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'NS', 'PTR', 'SOA', 'SRV', 'TXT']).optional().describe("DNS record type to query (default: A)."),
        resolver: z.string().ip().optional().describe("Specific DNS resolver IP address to use."),
        protocol: z.enum(['UDP', 'TCP']).optional().describe("DNS protocol (default: UDP)."),
        port: z.number().int().positive().optional().describe("DNS resolver port (default: 53)."),
        ipVersion: ipVersionSchema,
    },
    async (params) => { // Placeholder handler
        console.error(`[MCP Tool] Received 'globalping-dns' request for target: ${params.target}`);
        // TODO: Implement Globalping API call and result handling in Step 4
        return { content: [{ type: "text", text: `Placeholder: DNS tool called for ${params.target}. Results pending implementation.` }] };
    }
);

/**
 * Globalping MTR Tool
 * Performs MTR (My Traceroute) measurements, combining ping and traceroute functionality
 */
server.tool(
    "globalping-mtr",
    "Perform MTR (My Traceroute) measurements, combining ping and traceroute, to a target host or IP.",
    {
        target: z.string().describe("The hostname or IP address for the MTR measurement."),
        locations: z.array(locationSchema).optional(),
        limit: globalLimitSchema,
        port: z.number().int().positive().optional().describe("Destination port for UDP/TCP MTR."),
        protocol: z.enum(['ICMP', 'UDP', 'TCP']).optional().describe("MTR protocol (default: ICMP)."),
        packets: z.number().int().positive().optional().describe("Number of packets per hop (default: 3)."),
        ipVersion: ipVersionSchema,
    },
    async (params) => { // Placeholder handler
        console.error(`[MCP Tool] Received 'globalping-mtr' request for target: ${params.target}`);
        // TODO: Implement Globalping API call and result handling in Step 4
        return { content: [{ type: "text", text: `Placeholder: MTR tool called for ${params.target}. Results pending implementation.` }] };
    }
);

/**
 * Globalping HTTP Tool
 * Performs HTTP(S) requests to a target URL from specified locations
 */
server.tool(
    "globalping-http",
    "Perform HTTP(S) requests to a target URL from specified locations.",
    {
        target: z.string().url("Must be a valid URL (e.g., https://example.com).").describe("The URL to request."),
        locations: z.array(locationSchema).optional(),
        limit: globalLimitSchema,
        method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']).optional().describe("HTTP method (default: GET)."),
        // Note: Globalping API might parse protocol/port/path from target URL automatically.
        // Explicit options might be needed for non-standard ports or specific overrides.
        protocol: z.enum(['HTTP', 'HTTPS']).optional().describe("Protocol (usually inferred from target URL)."),
        port: z.number().int().positive().optional().describe("Port (usually inferred from target URL)."),
        path: z.string().startsWith('/').optional().describe("Path (usually inferred from target URL)."),
        headers: z.record(z.string()).optional().describe("Custom HTTP headers as key-value pairs."),
        ipVersion: ipVersionSchema,
    },
    async (params) => { // Placeholder handler
        console.error(`[MCP Tool] Received 'globalping-http' request for target: ${params.target}`);
        // TODO: Implement Globalping API call and result handling in Step 4
        return { content: [{ type: "text", text: `Placeholder: HTTP tool called for ${params.target}. Results pending implementation.` }] };
    }
);

// --- End Tool Registration ---

// --- Server Connection ---
async function startServer() {
    try {
        // Use Standard Input/Output for communication
        const transport = new StdioServerTransport();

        // Connect the server instance to the transport layer
        await server.connect(transport);

        console.error("Globalping MCP Server connected via stdio and ready."); // Log to stderr

    } catch (error) {
        console.error("Failed to start Globalping MCP Server:", error); // Log to stderr
        process.exit(1); // Exit if connection fails
    }
}
// --- End Server Connection ---

// Start the server
startServer();
