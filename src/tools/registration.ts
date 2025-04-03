/**
 * Globalping MCP Server Tools - Registration
 * 
 * This file contains functions to register all Globalping measurement tools with the MCP server.
 * Each tool has its own dedicated registration function to maintain clarity and organization.
 * These tools expose Globalping API capabilities to AI models through the Model Context Protocol.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';
import { handleGlobalpingRequest } from './handlers.js';
import { DEFAULT_PROBE_LIMIT } from '../schemas.js';

/**
 * Magic field location schema for tool registration
 * This aligns with Globalping's recommendation to use magic strings for location selection
 */
const magicLocationSchema = z.object({
    magic: z.string().describe("Fuzzy matching location string that supports any location that a logical human could enter, including countries, continents, ASNs, ISP names, AWS and GCP region names, and network ASNs. Examples: 'europe', 'japan', 'AS15169' (Google's ASN), 'north america+datacenter-network'. Combine multiple locations to filter them with + ")
}).describe("Location for the measurement probe using smart fuzzy matching.");

/**
 * The default limit description for all tools
 * This explains the default number of probes and max limits
 */
const limitDescription = `Maximum number of probes to use. Default: ${DEFAULT_PROBE_LIMIT}, Max: 500. More probes provide broader coverage but take longer to complete.`;

/**
 * Registers all Globalping measurement tools with the MCP server
 * 
 * @param server - The MCP server to register tools with
 */
export function registerGlobalpingTools(server: McpServer): void {
    console.error("[Tool Registration] Registering Globalping tools...");
    
    // Register individual measurement tools for direct access
    registerPingTool(server);
    registerTracerouteTool(server);
    registerDnsTool(server);
    registerMtrTool(server);
    registerHttpTool(server);

    console.error("[Tool Registration] Globalping tools registered.");
}

/**
 * Registers the ping tool with the MCP server
 * 
 * @param server - The MCP server to register tools with
 */
function registerPingTool(server: McpServer): void {
    server.tool(
        "globalping-ping",
        "Measures network latency (round-trip time) to a target host using ICMP Echo requests from globally distributed probes. Use to check global reachability, latency, and packet loss from different regions or networks. Results include min/avg/max times and packet loss statistics.",
        {
            target: z.string().describe("The hostname or IP address to ping (e.g., 'example.com' or '192.168.1.1')."),
            locations: z.array(magicLocationSchema).optional().describe("Locations to run the test from. Each entry should contain a 'magic' field with a fuzzy location descriptor. If omitted, uses default global distribution."),
            limit: z.number().int().min(1).max(500).optional().describe(limitDescription),
            packets: z.number().int().min(1).max(16).optional().describe("Number of ICMP Echo packets to send. Min: 1, Max: 16. Default: 3."),
            ipVersion: z.enum(['4', '6']).optional().describe("IP version to use. Only applicable for hostname targets."),
            apiToken: z.string().optional().describe("Optional Globalping API token for higher rate limits.")
        },
        async (params) => handleGlobalpingRequest('ping', params)
    );
}

/**
 * Registers the traceroute tool with the MCP server
 * 
 * @param server - The MCP server to register tools with
 */
function registerTracerouteTool(server: McpServer): void {
    server.tool(
        "globalping-traceroute",
        "Maps network paths between Globalping probes and a target, showing router hops and latency. Useful for identifying routing issues, network bottlenecks, and understanding geographic paths of network traffic. Supports multiple protocols (ICMP, TCP, UDP).",
        {
            target: z.string().describe("The hostname or IP address to trace the route to (e.g., 'example.com' or '192.168.1.1')."),
            locations: z.array(magicLocationSchema).optional().describe("Locations to run the test from. Each entry should contain a 'magic' field with a fuzzy location descriptor. If omitted, uses default global distribution."),
            limit: z.number().int().min(1).max(500).optional().describe(limitDescription),
            port: z.number().int().min(0).max(65535).optional().describe("Destination port for TCP/UDP traceroutes. Ignored for ICMP. Default: 80."),
            protocol: z.enum(['ICMP', 'TCP', 'UDP']).optional().describe("Protocol to use for traceroute. Default: ICMP."),
            ipVersion: z.enum(['4', '6']).optional().describe("IP version to use. Only applicable for hostname targets."),
            apiToken: z.string().optional().describe("Optional Globalping API token for higher rate limits.")
        },
        async (params) => handleGlobalpingRequest('traceroute', params)
    );
}

/**
 * Registers the DNS tool with the MCP server
 * 
 * @param server - The MCP server to register tools with
 */
function registerDnsTool(server: McpServer): void {
    server.tool(
        "globalping-dns",
        "Performs DNS resolution queries from distributed probes to verify DNS propagation and configuration. Useful for checking DNS resolution from different regions, validating DNS changes, and diagnosing DNS-related issues. Supports all common DNS record types.",
        {
            target: z.string().describe("The domain name to query (e.g., 'example.com'). For reverse DNS, use the IP address with PTR query type."),
            locations: z.array(magicLocationSchema).optional().describe("Locations to run the test from. Each entry should contain a 'magic' field with a fuzzy location descriptor. If omitted, uses default global distribution."),
            limit: z.number().int().min(1).max(500).optional().describe(limitDescription),
            query: z.object({
                type: z.enum([
                    'A', 'AAAA', 'ANY', 'CNAME', 'DNSKEY', 'DS', 
                    'HTTPS', 'MX', 'NS', 'NSEC', 'PTR', 'RRSIG', 
                    'SOA', 'TXT', 'SRV', 'SVCB'
                ]).optional().describe("Type of DNS record to query. Default: A.")
            }).optional().describe("The DNS query properties."),
            resolver: z.string().optional().describe("Custom DNS resolver (IPv4, IPv6, or hostname). Default: probe's system resolver."),
            protocol: z.enum(['UDP', 'TCP']).optional().describe("Protocol for DNS queries. Default: UDP."),
            port: z.number().int().min(0).max(65535).optional().describe("Port for DNS queries. Default: 53."),
            ipVersion: z.enum(['4', '6']).optional().describe("IP version to use. Only applicable for hostname targets."),
            trace: z.boolean().optional().describe("Trace delegation path from root servers to target. Default: false."),
            apiToken: z.string().optional().describe("Optional Globalping API token for higher rate limits.")
        },
        async (params) => handleGlobalpingRequest('dns', params)
    );
}

/**
 * Registers the MTR tool with the MCP server
 * 
 * @param server - The MCP server to register tools with
 */
function registerMtrTool(server: McpServer): void {
    server.tool(
        "globalping-mtr",
        "Combines traceroute and ping for comprehensive path analysis with detailed statistics per hop. Shows packet loss, latency (min/avg/max), jitter, and standard deviation for each network segment. Excellent for debugging complex network issues and performance problems.",
        {
            target: z.string().describe("The hostname or IP address to perform MTR to (e.g., 'example.com' or '192.168.1.1')."),
            locations: z.array(magicLocationSchema).optional().describe("Locations to run the test from. Each entry should contain a 'magic' field with a fuzzy location descriptor. If omitted, uses default global distribution."),
            limit: z.number().int().min(1).max(500).optional().describe(limitDescription),
            port: z.number().int().min(0).max(65535).optional().describe("Destination port for TCP/UDP MTR. Ignored for ICMP. Default: 80."),
            protocol: z.enum(['ICMP', 'TCP', 'UDP']).optional().describe("Protocol to use for MTR. Default: ICMP."),
            packets: z.number().int().min(1).max(16).optional().describe("Number of packets to send to each hop. Min: 1, Max: 16. Default: 3."),
            ipVersion: z.enum(['4', '6']).optional().describe("IP version to use. Only applicable for hostname targets."),
            apiToken: z.string().optional().describe("Optional Globalping API token for higher rate limits.")
        },
        async (params) => handleGlobalpingRequest('mtr', params)
    );
}

/**
 * Registers the HTTP tool with the MCP server
 * 
 * @param server - The MCP server to register tools with
 */
function registerHttpTool(server: McpServer): void {
    server.tool(
        "globalping-http",
        "Makes HTTP/HTTPS requests from distributed probes to measure web performance worldwide. Provides detailed timing breakdown (DNS, TCP, TLS, TTFB, download), status codes, headers, and response bodies. Perfect for testing CDN effectiveness, global availability, and identifying regional performance issues.",
        {
            target: z.string()
                .describe("URL to request (e.g., 'example.com' or 'https://example.com/path'). If a full URL is provided, the protocol and path will be extracted and used appropriately."),
            locations: z.array(magicLocationSchema).optional().describe("Locations to run the test from. Each entry should contain a 'magic' field with a fuzzy location descriptor. If omitted, uses default global distribution."),
            limit: z.number().int().min(1).max(500).optional().describe(limitDescription),
            method: z.enum(['HEAD', 'GET', 'OPTIONS']).optional().describe("HTTP method to use. Default: HEAD."),
            protocol: z.enum(['HTTP', 'HTTPS', 'HTTP2']).optional().describe("Transport protocol to use. Default: HTTPS. If the target URL includes a protocol, it will override this value."),
            port: z.number().int().min(0).max(65535).optional().describe("Port to connect to. Default: 80 for HTTP, 443 for HTTPS."),
            ipVersion: z.enum(['4', '6']).optional().describe("IP version to use. Only applicable for hostname targets."),
            resolver: z.string().optional().describe("Custom DNS resolver (IPv4, IPv6, or hostname). Default: probe's system resolver."),
            path: z.string().optional().describe("The path portion of the URL. If the target includes a path, it will override this value."),
            apiToken: z.string().optional().describe("Optional Globalping API token for higher rate limits.")
        },
        async (params) => handleGlobalpingRequest('http', params)
    );
}
