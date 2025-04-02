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

/**
 * --- Role of this MCP Server ---
 * This server provides tools to execute specific Globalping measurements (ping, traceroute, dns, mtr, http).
 * It fetches and returns the raw or processed data from the Globalping network.
 * 
 * It does NOT perform comparisons (e.g., "is site A faster than site B?") or complex analysis
 * (e.g., "summarize the DNS resolution path").
 * 
 * Such comparative or analytical tasks are the responsibility of the AI client connecting to this server.
 * The client should make one or more calls to the tools provided here, receive the results,
 * and then perform the comparison or analysis based on the returned data.
 * 
 * For example:
 * - For "Is google.com faster than bing.com?", the AI client would call the globalping-http tool twice 
 *   (once for each site) and then compare the timing results itself.
 * - For "How does example.com resolve in Europe?", the AI client would call globalping-dns with 
 *   appropriate target and location, then interpret the returned DNS records.
 * 
 * The tool descriptions are designed to help the AI client choose the right tools for gathering
 * the specific data needed to answer the user's question.
 * --- End Role Explanation ---
 */

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
    country: z.string().length(2, "Must be a 2-letter country code (ISO 3166-1 alpha-2)").optional().describe("Two-letter ISO country code (e.g., 'US', 'DE', 'JP'). Used to select probes from a specific country."),
    continent: z.string().optional().describe("Continent name (e.g., 'Europe', 'North America', 'Asia'). Used to select probes from an entire continent."),
    region: z.string().optional().describe("Geographic region within a continent (e.g., 'Western Europe', 'Southeast Asia'). More specific than continent but less specific than country."),
    city: z.string().optional().describe("City name (e.g., 'New York', 'London', 'Tokyo'). Used to select probes from a specific metropolitan area."),
    asn: z.number().int().positive().optional().describe("Autonomous System Number, identifying a specific network operator (e.g., 13335 for Cloudflare). Used to test from a specific provider's network."),
    network: z.string().optional().describe("Network name or identifier. Alternative to ASN for selecting probes from specific network providers."),
    tag: z.string().optional().describe("Special tag identifier for groups of probes with specific characteristics (e.g., 'residential', 'datacenter')."),
    limit: z.number().int().positive().optional().describe("Maximum number of probes to use *from this specific location definition* (e.g., limit 2 probes from 'Europe'). Each location can have its own limit."),
}).optional().describe("Specify geographic locations or networks for measurement probes. Multiple locations can be combined to create a diverse measurement profile.");

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
    "Measures network latency (round-trip time) to a target host or IP address using ICMP Echo requests. Executes from multiple Globalping probes distributed globally or in specified locations. Useful for checking reachability and basic network performance.", // Description
    { // Input schema using Zod
        target: z.string().describe("The hostname or IP address to ping. Can be a domain name (e.g., 'example.com') or an IP address (e.g., '192.168.1.1')."),
        locations: z.array(locationSchema).optional().describe("Array of location specifications defining where the probes should run from. If omitted, probes will be selected from diverse global locations."),
        limit: globalLimitSchema.describe("Overall maximum number of probes to use for this measurement. Default is 3 if unspecified."),
        packets: z.number().int().min(1).max(16).optional().describe("Number of ICMP Echo request packets to send per probe. Default is 3 if unspecified. More packets provide more reliable statistics."),
        ipVersion: ipVersionSchema.describe("IP version to use for the measurement - either '4' for IPv4 or '6' for IPv6. If omitted, the probe will select the appropriate version based on target resolution."),
    },
    async (params) => handleGlobalpingRequest('ping', params)
);

/**
 * Globalping Traceroute Tool
 * Performs traceroute measurements to trace the network path to a target host or IP address
 */
server.tool(
    "globalping-traceroute",
    "Maps the network path packets take to reach a target host or IP address, showing each router hop along the route and their response times. Useful for diagnosing routing issues, identifying bottlenecks, and understanding network topology between Globalping probes and the target.",
    {
        target: z.string().describe("The hostname or IP address for the traceroute. Can be a domain name (e.g., 'example.com') or an IP address (e.g., '192.168.1.1')."),
        locations: z.array(locationSchema).optional().describe("Array of location specifications defining where the probes should run from. If omitted, probes will be selected from diverse global locations."),
        limit: globalLimitSchema.describe("Overall maximum number of probes to use for this measurement. Default is 3 if unspecified."),
        port: z.number().int().positive().optional().describe("Destination port for UDP/TCP traceroute. Only relevant when protocol is UDP or TCP. For web servers, common values are 80 (HTTP) or 443 (HTTPS)."),
        protocol: z.enum(['ICMP', 'UDP', 'TCP']).optional().describe("Protocol to use for traceroute packets. ICMP is most common and reliable, UDP works through most firewalls, TCP tests specific services. Default is ICMP."),
        packets: z.number().int().min(1).max(16).optional().describe("Number of probe packets to send per hop. Default is 3. More packets provide more reliable per-hop statistics."),
        ipVersion: ipVersionSchema.describe("IP version to use for the measurement - either '4' for IPv4 or '6' for IPv6. If omitted, the probe will select the appropriate version based on target resolution."),
    },
    async (params) => handleGlobalpingRequest('traceroute', params)
);

/**
 * Globalping DNS Tool
 * Performs DNS lookups for a domain name from specified locations
 */
server.tool(
    "globalping-dns",
    "Performs DNS resolution queries from distributed Globalping probes to retrieve DNS records for a domain. Useful for verifying DNS propagation, troubleshooting DNS configuration, and checking how domain names resolve from different global locations or networks.",
    {
        target: z.string().describe("The domain name to query (e.g., 'example.com'). For reverse DNS lookups, use the IP address when queryType is 'PTR'."),
        locations: z.array(locationSchema).optional().describe("Array of location specifications defining where the DNS resolvers should run from. If omitted, resolvers will be selected from diverse global locations."),
        limit: globalLimitSchema.describe("Overall maximum number of probes to use for this measurement. Default is 3 if unspecified."),
        queryType: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'NS', 'PTR', 'SOA', 'SRV', 'TXT']).optional().describe("The type of DNS record to query (e.g., A for IPv4 addresses, AAAA for IPv6 addresses, MX for mail servers, TXT for text records). Defaults to 'A' if unspecified."),
        resolver: z.string().ip().optional().describe("Specific DNS resolver IP address to use instead of the probe's default resolver. Useful for testing specific DNS providers."),
        protocol: z.enum(['UDP', 'TCP']).optional().describe("DNS protocol to use. UDP is faster and standard for most queries, while TCP is used for larger responses and may bypass certain restrictions. Default is UDP."),
        port: z.number().int().positive().optional().describe("DNS resolver port to connect to. Standard DNS port is 53, but some resolvers use alternative ports such as 5353 or 853 (for DNS over TLS)."),
        ipVersion: ipVersionSchema.describe("IP version to use for connecting to the resolver - either '4' for IPv4 or '6' for IPv6. If omitted, the probe will use the appropriate version based on resolver availability."),
    },
    async (params) => handleGlobalpingRequest('dns', params)
);

/**
 * Globalping MTR Tool
 * Performs MTR (My Traceroute) measurements, combining ping and traceroute functionality
 */
server.tool(
    "globalping-mtr",
    "Combines the functionality of ping and traceroute into a single diagnostic tool that provides continuous statistics for each network hop. MTR (My Traceroute) shows packet loss, latency, and jitter at each router in the path. Ideal for comprehensive network path analysis and identifying intermittent issues along routes.",
    {
        target: z.string().describe("The hostname or IP address for the MTR measurement. Can be a domain name (e.g., 'example.com') or an IP address (e.g., '192.168.1.1')."),
        locations: z.array(locationSchema).optional().describe("Array of location specifications defining where the probes should run from. If omitted, probes will be selected from diverse global locations."),
        limit: globalLimitSchema.describe("Overall maximum number of probes to use for this measurement. Default is 3 if unspecified."),
        port: z.number().int().positive().optional().describe("Destination port for UDP/TCP MTR. Only relevant when protocol is UDP or TCP. For web servers, common values are 80 (HTTP) or 443 (HTTPS)."),
        protocol: z.enum(['ICMP', 'UDP', 'TCP']).optional().describe("Protocol to use for MTR packets. ICMP is most common and reliable, UDP works through most firewalls, TCP tests specific services. Default is ICMP."),
        packets: z.number().int().min(1).max(16).optional().describe("Number of packets to send to each hop for gathering statistics. Default is 3. Higher values provide more accurate statistical information but take longer to complete."),
        ipVersion: ipVersionSchema.describe("IP version to use for the measurement - either '4' for IPv4 or '6' for IPv6. If omitted, the probe will select the appropriate version based on target resolution."),
    },
    async (params) => handleGlobalpingRequest('mtr', params)
);

/**
 * Globalping HTTP Tool
 * Performs HTTP(S) requests to a target URL from specified locations
 */
server.tool(
    "globalping-http",
    "Makes HTTP/HTTPS requests to URLs from distributed Globalping probes, measuring response times, status codes, and providing header information. Excellent for testing web application performance, CDN effectiveness, and availability from different regions. Provides detailed timing breakdown including DNS, connection, TLS handshake, and time to first byte (TTFB).",
    {
        target: z.string().url("Must be a valid URL (e.g., https://example.com).").describe("The complete URL to request, including protocol, hostname, path, and any query parameters (e.g., 'https://example.com/path?query=value')."),
        locations: z.array(locationSchema).optional().describe("Array of location specifications defining where the HTTP probes should run from. If omitted, probes will be selected from diverse global locations."),
        limit: globalLimitSchema.describe("Overall maximum number of probes to use for this measurement. Default is 3 if unspecified."),
        method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']).optional().describe("HTTP method to use for the request. GET is used to retrieve data, POST to submit data, etc. Default is GET if unspecified."),
        // Note: Globalping API might parse protocol/port/path from target URL automatically.
        // Explicit options might be needed for non-standard ports or specific overrides.
        protocol: z.enum(['HTTP', 'HTTPS']).optional().describe("Protocol to use, overriding what's in the target URL. Rarely needed as this is normally inferred from the target URL."),
        port: z.number().int().positive().optional().describe("Port to connect to, overriding the default for the protocol (80 for HTTP, 443 for HTTPS) or what's specified in the target URL."),
        path: z.string().startsWith('/').optional().describe("Path component to use, overriding what's in the target URL. Should start with a forward slash (e.g., '/api/v1/resource')."),
        headers: z.record(z.string()).optional().describe("Custom HTTP headers to include in the request as key-value pairs. Useful for testing with specific authorization, content types, or user agents."),
        ipVersion: ipVersionSchema.describe("IP version to use for the connection - either '4' for IPv4 or '6' for IPv6. If omitted, the probe will select the appropriate version based on target resolution."),
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

// Exports for testing purposes - this will allow tests to access these functions
// without initializing the server
export { formatMeasurementResult };

// For testing only - not used in production
export const __test__ = {
    handleGlobalpingRequest,
    formatPingResults,
    formatTracerouteResults,
    formatDnsResults,
    formatMtrResults,
    formatHttpResults
};

// Don't initialize the server if this file is being imported by tests
if (process.env.NODE_ENV !== 'test') {
    // Start the server
    startServer();
}
