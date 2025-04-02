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
import { createMeasurement, pollForResult, MeasurementRequest, MeasurementResult } from './globalping/api.js';

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
 * Generic handler to create and poll for Globalping measurements.
 * @param type Measurement type ('ping', 'traceroute', etc.)
 * @param params Parameters received from the MCP tool call.
 * @param measurementOptions Specific options for the measurement type.
 * @returns MCP CallToolResult content.
 */
async function handleGlobalpingRequest(
    type: MeasurementRequest['type'],
    params: Record<string, unknown>,
    measurementOptions: MeasurementRequest['measurementOptions'] = {}
): Promise<{ content: { type: "text"; text: string }[], isError?: boolean }> {
    const target = params.target as string; // Assume target is always present and string
    const apiToken = process.env.GLOBALPING_API_TOKEN; // Read token from environment

    console.error(`[MCP Tool Handler] Processing ${type} for target: ${target}`); // Log to stderr

    // Construct the request payload for Globalping API
    const requestPayload: MeasurementRequest = {
        type: type,
        target: target,
        locations: params.locations as MeasurementRequest['locations'] || undefined, // Cast or validate
        limit: (params.limit as number) ?? DEFAULT_PROBE_LIMIT, // Use default if not provided
        measurementOptions: {
            packets: params.packets as number || (type === 'ping' || type === 'traceroute' || type === 'mtr' ? 3 : undefined), // Default packets for relevant types
            port: params.port as number || undefined,
            protocol: params.protocol as string || undefined,
            ipVersion: params.ipVersion as (4 | 6) || undefined,
            // DNS specific
            type: params.queryType as string || undefined, // queryType maps to 'type' in measurementOptions for DNS
            resolver: params.resolver as string || undefined,
            // HTTP specific
            method: params.method as string || undefined,
            path: params.path as string || undefined,
            headers: params.headers as Record<string, string> || undefined,
            ...measurementOptions // Include any additional specific options
        },
    };

    // Remove undefined options to keep payload clean
    Object.keys(requestPayload.measurementOptions || {}).forEach(key => {
        if (requestPayload.measurementOptions && requestPayload.measurementOptions[key] === undefined) {
            delete requestPayload.measurementOptions[key];
        }
    });
    if (requestPayload.measurementOptions && Object.keys(requestPayload.measurementOptions).length === 0) {
        delete requestPayload.measurementOptions;
    }

    try {
        // 1. Create the measurement
        const createResponse = await createMeasurement(requestPayload, apiToken);
        if (!createResponse) {
            return { 
                content: [{ type: "text", text: `Failed to create ${type} measurement for ${target}. Check server logs.` }], 
                isError: true 
            };
        }

        // 2. Poll for the result
        const finalResult = await pollForResult(createResponse.id, apiToken);
        if (!finalResult) {
            return { 
                content: [{ type: "text", text: `Polling timed out or failed for ${type} measurement ${createResponse.id} for ${target}.` }], 
                isError: true 
            };
        }

        // 3. Format and return the result
        // Format based on the measurement type
        let formattedResult = formatMeasurementResult(finalResult, type, target);

        return { 
            content: [{ type: "text", text: formattedResult }], 
            isError: finalResult.status === 'failed' 
        };

    } catch (error) {
        console.error(`[MCP Tool Handler] Unhandled error during ${type} for ${target}:`, error); // Log to stderr
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { 
            content: [{ type: "text", text: `An internal error occurred while processing the ${type} request for ${target}: ${errorMessage}` }], 
            isError: true 
        };
    }
}

/**
 * Formats the measurement result based on the type of measurement
 * @param result The measurement result from the Globalping API
 * @param type The type of measurement (ping, traceroute, etc.)
 * @param target The target of the measurement
 * @returns A formatted string representation of the result
 */
function formatMeasurementResult(result: MeasurementResult, type: string, target: string): string {
    // Header with basic info
    let output = `Globalping ${type} results for ${target} (ID: ${result.id})\n`;
    output += `Status: ${result.status}\n`;
    output += `Created: ${result.createdAt}\n`;
    output += `Updated: ${result.updatedAt}\n`;
    output += `Probes: ${result.probesCount}\n\n`;
    
    // Customize the output based on the measurement type
    switch (type) {
        case 'ping':
            // For ping, highlight min/max/avg times
            output += formatPingResults(result.results);
            break;
        case 'traceroute':
            // For traceroute, show the path and hop details
            output += formatTracerouteResults(result.results);
            break;
        case 'dns':
            // For DNS, show the resolved records
            output += formatDnsResults(result.results);
            break;
        case 'mtr':
            // For MTR, show the combined ping and traceroute statistics
            output += formatMtrResults(result.results);
            break;
        case 'http':
            // For HTTP, show status codes, headers, and response timing
            output += formatHttpResults(result.results);
            break;
        default:
            // Default formatting for any other type
            output += JSON.stringify(result.results, null, 2);
    }
    
    return output;
}

/**
 * Format ping results with a focus on min/max/avg times
 */
function formatPingResults(results: any[]): string {
    let output = '';
    
    if (!results || results.length === 0) {
        return 'No results returned.';
    }
    
    // Iterate through each probe's results
    results.forEach((probe, index) => {
        output += `Probe ${index + 1} - Location: ${probe.location?.city || 'Unknown'}, ${probe.location?.country || 'Unknown'}\n`;
        
        if (probe.result?.stats) {
            const stats = probe.result.stats;
            output += `  Min: ${stats.min}ms, Max: ${stats.max}ms, Avg: ${stats.avg}ms\n`;
            output += `  Packet Loss: ${stats.packetLoss}%, Jitter: ${stats.stddev}ms\n`;
        } else {
            output += `  No statistics available\n`;
        }
        
        if (probe.result?.packets) {
            output += `  Individual packets:\n`;
            probe.result.packets.forEach((packet: any, i: number) => {
                output += `    #${i + 1}: ${packet.rtt}ms\n`;
            });
        }
        
        output += '\n';
    });
    
    return output;
}

/**
 * Format traceroute results to show the network path
 */
function formatTracerouteResults(results: any[]): string {
    let output = '';
    
    if (!results || results.length === 0) {
        return 'No results returned.';
    }
    
    // Iterate through each probe's results
    results.forEach((probe, index) => {
        output += `Probe ${index + 1} - Location: ${probe.location?.city || 'Unknown'}, ${probe.location?.country || 'Unknown'}\n`;
        
        if (probe.result?.hops && Array.isArray(probe.result.hops)) {
            output += `  Hop  IP Address        RTT     Location\n`;
            output += `  ---- ---------------- ------- -----------------\n`;
            
            probe.result.hops.forEach((hop: any) => {
                const hopNum = hop.hop.toString().padEnd(4);
                const ip = (hop.ip || '*').padEnd(16);
                const rtt = (hop.rtt ? `${hop.rtt}ms` : '*').padEnd(7);
                const location = hop.location ? `${hop.location.city || ''}, ${hop.location.country || ''}` : '';
                
                output += `  ${hopNum} ${ip} ${rtt} ${location}\n`;
            });
        } else {
            output += `  No hop information available\n`;
        }
        
        output += '\n';
    });
    
    return output;
}

/**
 * Format DNS results to show the resolved records
 */
function formatDnsResults(results: any[]): string {
    let output = '';
    
    if (!results || results.length === 0) {
        return 'No results returned.';
    }
    
    // Iterate through each probe's results
    results.forEach((probe, index) => {
        output += `Probe ${index + 1} - Location: ${probe.location?.city || 'Unknown'}, ${probe.location?.country || 'Unknown'}\n`;
        
        if (probe.result?.answers && Array.isArray(probe.result.answers)) {
            output += `  DNS Records:\n`;
            
            probe.result.answers.forEach((answer: any) => {
                output += `  Type: ${answer.type}, TTL: ${answer.ttl}\n`;
                output += `  Data: ${answer.data}\n\n`;
            });
        } else {
            output += `  No DNS records available\n`;
        }
        
        output += '\n';
    });
    
    return output;
}

/**
 * Format MTR results combining ping and traceroute statistics
 */
function formatMtrResults(results: any[]): string {
    let output = '';
    
    if (!results || results.length === 0) {
        return 'No results returned.';
    }
    
    // Iterate through each probe's results
    results.forEach((probe, index) => {
        output += `Probe ${index + 1} - Location: ${probe.location?.city || 'Unknown'}, ${probe.location?.country || 'Unknown'}\n`;
        
        if (probe.result?.hops && Array.isArray(probe.result.hops)) {
            output += `  Hop  IP Address        Loss%   Sent  Recv  Best  Avg   Worst  Last\n`;
            output += `  ---- ---------------- ------ ----- ----- ----- ----- ----- -----\n`;
            
            probe.result.hops.forEach((hop: any) => {
                const hopNum = hop.hop.toString().padEnd(4);
                const ip = (hop.ip || '*').padEnd(16);
                const loss = (hop.loss ? `${hop.loss}%` : '*').padEnd(6);
                const sent = (hop.sent || '*').toString().padEnd(5);
                const recv = (hop.recv || '*').toString().padEnd(5);
                const best = (hop.best ? `${hop.best}ms` : '*').padEnd(5);
                const avg = (hop.avg ? `${hop.avg}ms` : '*').padEnd(5);
                const worst = (hop.worst ? `${hop.worst}ms` : '*').padEnd(5);
                const last = (hop.last ? `${hop.last}ms` : '*').padEnd(5);
                
                output += `  ${hopNum} ${ip} ${loss} ${sent} ${recv} ${best} ${avg} ${worst} ${last}\n`;
            });
        } else {
            output += `  No hop information available\n`;
        }
        
        output += '\n';
    });
    
    return output;
}

/**
 * Format HTTP results to show status codes and response timing
 */
function formatHttpResults(results: any[]): string {
    let output = '';
    
    if (!results || results.length === 0) {
        return 'No results returned.';
    }
    
    // Iterate through each probe's results
    results.forEach((probe, index) => {
        output += `Probe ${index + 1} - Location: ${probe.location?.city || 'Unknown'}, ${probe.location?.country || 'Unknown'}\n`;
        
        if (probe.result) {
            const statusCode = probe.result.statusCode || 'Unknown';
            const totalTime = probe.result.timings?.total || 'Unknown';
            
            output += `  Status Code: ${statusCode}\n`;
            output += `  Total Time: ${totalTime}ms\n`;
            
            if (probe.result.timings) {
                output += `  Timing Breakdown:\n`;
                output += `    DNS: ${probe.result.timings.dns || 0}ms\n`;
                output += `    Connect: ${probe.result.timings.connect || 0}ms\n`;
                output += `    TLS: ${probe.result.timings.tls || 0}ms\n`;
                output += `    TTFB: ${probe.result.timings.ttfb || 0}ms\n`;
                output += `    Download: ${probe.result.timings.download || 0}ms\n`;
            }
            
            if (probe.result.headers) {
                output += `  Response Headers:\n`;
                for (const [key, value] of Object.entries(probe.result.headers)) {
                    output += `    ${key}: ${value}\n`;
                }
            }
        } else {
            output += `  No HTTP result available\n`;
        }
        
        output += '\n';
    });
    
    return output;
}

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
    async (params) => handleGlobalpingRequest('ping', params)
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
    async (params) => handleGlobalpingRequest('traceroute', params)
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
    async (params) => handleGlobalpingRequest('dns', params)
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
    async (params) => handleGlobalpingRequest('mtr', params)
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
    async (params) => handleGlobalpingRequest('http', params)
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

// Export functions for testing
export { formatMeasurementResult };

// For testing purposes only
export const __test__ = {
    handleGlobalpingRequest
};
