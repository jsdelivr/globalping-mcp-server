/**
 * Globalping MCP Server Tools
 * 
 * This file contains the tool definitions and handlers for the Globalping MCP Server.
 * It registers the tools with the MCP server and provides the implementation for 
 * handling requests to the Globalping API.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { 
    createMeasurement, 
    pollForResult, 
    MeasurementRequest,
    MeasurementResult,
    NetworkMeasurementOptions,
    DnsMeasurementOptions,
    HttpMeasurementOptions,
    LocationSpecification
} from './globalping/api.js';
import {
    DEFAULT_PROBE_LIMIT,
    pingInputSchema,
    tracerouteInputSchema,
    dnsInputSchema,
    mtrInputSchema,
    httpInputSchema
} from './schemas.js';
import { formatMeasurementResult } from './formatter.js';
import { z } from 'zod';

// Define type for the parameters received from tool calls
type ToolParams = Record<string, unknown>;

// Type guard for HTTP measurement options
function isHttpOptions(options: any): options is HttpMeasurementOptions {
    return options && typeof options === 'object';
}

// Type guard for DNS measurement options
function isDnsOptions(options: any): options is DnsMeasurementOptions {
    return options && typeof options === 'object';
}

// Type guard for Network measurement options
function isNetworkOptions(options: any): options is NetworkMeasurementOptions {
    return options && typeof options === 'object';
}

// Helper function to safely cast string to enum types
function safeCast<T extends string>(value: unknown, allowedValues: readonly T[]): T | undefined {
    if (typeof value === 'string' && allowedValues.includes(value as T)) {
        return value as T;
    }
    return undefined;
}

/**
 * Generic handler function for Globalping measurement requests
 * Handles the common logic for all measurement types
 * 
 * @param type - Measurement type ('ping', 'traceroute', etc.)
 * @param params - Parameters received from the MCP tool call
 * @returns MCP CallToolResult content
 */
async function handleGlobalpingRequest(
    type: MeasurementRequest['type'],
    params: ToolParams
): Promise<{ content: { type: "text"; text: string }[], isError?: boolean }> {
    const target = params.target as string;
    const apiToken = process.env.GLOBALPING_API_TOKEN || params.apiToken as string;

    console.error(`[MCP Tool Handler] Processing ${type} for target: ${target}`);

    // Construct the request payload for Globalping API
    const requestPayload: MeasurementRequest = {
        type: type,
        target: target,
        locations: params.locations as LocationSpecification[] || undefined,
        limit: (params.limit as number) ?? DEFAULT_PROBE_LIMIT,
    };

    // Handle measurement-specific options differently based on type
    switch (type) {
        case 'ping':
        case 'traceroute':
        case 'mtr': {
            // Network protocols allowed values
            const allowedProtocols = ['ICMP', 'UDP', 'TCP'] as const;
            
            // Options common to ping, traceroute, and mtr
            const networkOptions: NetworkMeasurementOptions = {
                packets: typeof params.packets === 'number' ? params.packets : undefined,
                port: typeof params.port === 'number' ? params.port : undefined,
                protocol: safeCast(params.protocol, allowedProtocols),
                ipVersion: typeof params.ipVersion === 'number' ? params.ipVersion as 4 | 6 : undefined,
            };

            // Filter out undefined values
            const filteredOptions: Partial<NetworkMeasurementOptions> = {};
            for (const [key, value] of Object.entries(networkOptions)) {
                if (value !== undefined) {
                    // Type assertion to help TypeScript understand we're safely adding valid keys
                    (filteredOptions as any)[key] = value;
                }
            }

            if (Object.keys(filteredOptions).length > 0) {
                requestPayload.measurementOptions = filteredOptions as NetworkMeasurementOptions;
            }
            break;
        }

        case 'dns': {
            // DNS record types allowed values
            const allowedQueryTypes = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'PTR', 'SOA', 'SRV', 'TXT'] as const;
            // DNS protocols allowed values
            const allowedProtocols = ['UDP', 'TCP'] as const;
            
            // DNS-specific options
            const dnsOptions: DnsMeasurementOptions = {
                type: safeCast(params.queryType, allowedQueryTypes),
                resolver: typeof params.resolver === 'string' ? params.resolver : undefined,
                protocol: safeCast(params.protocol, allowedProtocols),
                port: typeof params.port === 'number' ? params.port : undefined,
                ipVersion: typeof params.ipVersion === 'number' ? params.ipVersion as 4 | 6 : undefined,
            };

            // Filter out undefined values
            const filteredOptions: Partial<DnsMeasurementOptions> = {};
            for (const [key, value] of Object.entries(dnsOptions)) {
                if (value !== undefined) {
                    // Type assertion to help TypeScript understand we're safely adding valid keys
                    (filteredOptions as any)[key] = value;
                }
            }

            if (Object.keys(filteredOptions).length > 0) {
                requestPayload.measurementOptions = filteredOptions as DnsMeasurementOptions;
            }
            break;
        }

        case 'http': {
            // HTTP methods allowed values
            const allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;
            // HTTP protocols allowed values
            const allowedProtocols = ['HTTP', 'HTTPS'] as const;
            
            // HTTP-specific options
            const httpOptions: HttpMeasurementOptions = {
                method: safeCast(params.method, allowedMethods),
                protocol: safeCast(params.protocol, allowedProtocols),
                port: typeof params.port === 'number' ? params.port : undefined,
                path: typeof params.path === 'string' ? params.path : undefined,
                ipVersion: typeof params.ipVersion === 'number' ? params.ipVersion as 4 | 6 : undefined,
            };

            // Handle headers separately
            if (params.headers && typeof params.headers === 'object') {
                httpOptions.headers = params.headers as Record<string, string>;
            }

            // Filter out undefined values
            const filteredOptions: Partial<HttpMeasurementOptions> = {};
            for (const [key, value] of Object.entries(httpOptions)) {
                if (value !== undefined) {
                    // Type assertion to help TypeScript understand we're safely adding valid keys
                    (filteredOptions as any)[key] = value;
                }
            }

            if (Object.keys(filteredOptions).length > 0) {
                requestPayload.measurementOptions = filteredOptions as HttpMeasurementOptions;
            }
            break;
        }
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
        // Use the formatter module to format the result based on measurement type
        const formattedResult = formatMeasurementResult(finalResult, type, target);
        
        return { 
            content: [{ type: "text", text: formattedResult }], 
            isError: finalResult.status === 'failed'
        };
    } catch (error) {
        console.error(`[MCP Tool Handler] Unhandled error during ${type} for ${target}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { 
            content: [{ type: "text", text: `An internal error occurred while processing the ${type} request for ${target}: ${errorMessage}` }], 
            isError: true 
        };
    }
}

/**
 * Registers all Globalping measurement tools with the MCP server
 * 
 * @param server - The MCP server to register tools with
 */
export function registerGlobalpingTools(server: McpServer): void {
    console.error("[Tool Registration] Registering Globalping tools...");

    // Register the ping tool
    server.tool(
        "globalping-ping",
        "Measures network latency (round-trip time) to a target host or IP address using ICMP Echo requests. Executes from multiple Globalping probes distributed globally or in specified locations. Useful for checking reachability and basic network performance.",
        {
            target: z.string().describe("The hostname or IP address to ping. Can be a domain name (e.g., 'example.com') or an IP address (e.g., '192.168.1.1')."),
            locations: z.array(z.any()).optional().describe("Array of location specifications defining where the probes should run from. If omitted, probes will be selected from diverse global locations."),
            limit: z.number().int().positive().optional().describe("Overall maximum number of probes for the measurement"),
            packets: z.number().int().min(1).max(16).optional().describe("Number of ICMP Echo packets to send (1-16). Default is 3."),
            ipVersion: z.enum(['4', '6']).optional().describe("IP version to use (4 or 6)"),
            apiToken: z.string().optional().describe("Optional Globalping API token to use for this measurement"),
        },
        async (params) => handleGlobalpingRequest('ping', params)
    );

    // Register the traceroute tool
    server.tool(
        "globalping-traceroute",
        "Performs traceroute measurements to map the network path between Globalping probes and a target host or IP. Shows router hops, latency at each hop, and can detect routing issues. Supports multiple protocols (ICMP, UDP, TCP) and can run from diverse global locations.",
        {
            target: z.string().describe("The hostname or IP address to trace the route to. Can be a domain name (e.g., 'example.com') or an IP address (e.g., '192.168.1.1')."),
            locations: z.array(z.any()).optional().describe("Array of location specifications defining where the probes should run from. If omitted, probes will be selected from diverse global locations."),
            limit: z.number().int().positive().optional().describe("Overall maximum number of probes for the measurement"),
            port: z.number().int().positive().optional().describe("Destination port for TCP/UDP traceroutes. Ignored for ICMP."),
            protocol: z.enum(['ICMP', 'UDP', 'TCP']).optional().describe("Protocol to use for traceroute (ICMP, UDP, or TCP). Default is ICMP."),
            packets: z.number().int().positive().optional().describe("Number of packets to send per hop. Default is 3."),
            ipVersion: z.enum(['4', '6']).optional().describe("IP version to use (4 or 6)"),
            apiToken: z.string().optional().describe("Optional Globalping API token to use for this measurement"),
        },
        async (params) => handleGlobalpingRequest('traceroute', params)
    );

    // Register the DNS tool
    server.tool(
        "globalping-dns",
        "Performs DNS resolution queries from distributed Globalping probes to retrieve DNS records for a domain. Useful for verifying DNS propagation, troubleshooting DNS configuration, and checking how domain names resolve from different global locations or networks.",
        {
            target: z.string().describe("The domain name to query (e.g., 'example.com'). For reverse DNS lookups, use the IP address when queryType is 'PTR'."),
            locations: z.array(z.any()).optional().describe("Array of location specifications defining where the probes should run from. If omitted, probes will be selected from diverse global locations."),
            limit: z.number().int().positive().optional().describe("Overall maximum number of probes for the measurement"),
            queryType: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'NS', 'PTR', 'SOA', 'SRV', 'TXT']).optional().describe("Type of DNS record to query. Default is 'A'."),
            resolver: z.string().optional().describe("Custom DNS resolver IP address to use instead of the probe's default resolver."),
            protocol: z.enum(['UDP', 'TCP']).optional().describe("Protocol to use for DNS queries (UDP or TCP). Default is UDP."),
            port: z.number().int().positive().optional().describe("Port to use for DNS queries. Default is 53."),
            ipVersion: z.enum(['4', '6']).optional().describe("IP version to use (4 or 6)"),
            apiToken: z.string().optional().describe("Optional Globalping API token to use for this measurement"),
        },
        async (params) => handleGlobalpingRequest('dns', params)
    );

    // Register the MTR tool
    server.tool(
        "globalping-mtr",
        "Performs MTR (My Traceroute) measurements, combining functionality of traceroute and ping. Provides detailed statistics for each network hop including packet loss, latency (min/avg/max), and jitter. Excellent for comprehensive network path analysis and troubleshooting.",
        {
            target: z.string().describe("The hostname or IP address to perform MTR to. Can be a domain name (e.g., 'example.com') or an IP address (e.g., '192.168.1.1')."),
            locations: z.array(z.any()).optional().describe("Array of location specifications defining where the probes should run from. If omitted, probes will be selected from diverse global locations."),
            limit: z.number().int().positive().optional().describe("Overall maximum number of probes for the measurement"),
            port: z.number().int().positive().optional().describe("Destination port for TCP/UDP MTR. Ignored for ICMP."),
            protocol: z.enum(['ICMP', 'UDP', 'TCP']).optional().describe("Protocol to use for MTR (ICMP, UDP, or TCP). Default is ICMP."),
            packets: z.number().int().positive().optional().describe("Number of packets to send per hop. Default is 3."),
            ipVersion: z.enum(['4', '6']).optional().describe("IP version to use (4 or 6)"),
            apiToken: z.string().optional().describe("Optional Globalping API token to use for this measurement"),
        },
        async (params) => handleGlobalpingRequest('mtr', params)
    );

    // Register the HTTP tool
    server.tool(
        "globalping-http",
        "Makes HTTP/HTTPS requests to URLs from distributed Globalping probes, measuring response times, status codes, and providing header information. Excellent for testing web application performance, CDN effectiveness, and availability from different regions. Provides detailed timing breakdown including DNS, connection, TLS handshake, and time to first byte (TTFB).",
        {
            target: z.string().url("Must be a valid URL (e.g., https://example.com).").describe("The complete URL to request, including protocol, hostname, path, and any query parameters (e.g., 'https://example.com/path?query=value')."),
            locations: z.array(z.any()).optional().describe("Array of location specifications defining where the probes should run from. If omitted, probes will be selected from diverse global locations."),
            limit: z.number().int().positive().optional().describe("Overall maximum number of probes for the measurement"),
            method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']).optional().describe("HTTP method to use for the request. Default is GET."),
            protocol: z.enum(['HTTP', 'HTTPS']).optional().describe("Protocol to use (HTTP or HTTPS). This is usually determined from the target URL."),
            port: z.number().int().positive().optional().describe("Custom port to connect to. Default is 80 for HTTP and 443 for HTTPS."),
            path: z.string().startsWith('/').optional().describe("Path to request. This is usually determined from the target URL."),
            headers: z.record(z.string()).optional().describe("Custom HTTP headers to include with the request."),
            ipVersion: z.enum(['4', '6']).optional().describe("IP version to use (4 or 6)"),
            apiToken: z.string().optional().describe("Optional Globalping API token to use for this measurement"),
        },
        async (params) => handleGlobalpingRequest('http', params)
    );

    console.error("[Tool Registration] Globalping tools registered.");
}

export { handleGlobalpingRequest };
