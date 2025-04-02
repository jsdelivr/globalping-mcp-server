/**
 * Globalping MCP Server Tools - Registration
 * 
 * This file contains functions to register all Globalping measurement tools with the MCP server.
 * Each tool has its own dedicated registration function to maintain clarity and organization.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';
import { handleGlobalpingRequest } from './handlers.js';

/**
 * Registers all Globalping measurement tools with the MCP server
 * 
 * @param server - The MCP server to register tools with
 */
export function registerGlobalpingTools(server: McpServer): void {
    console.error("[Tool Registration] Registering Globalping tools...");

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
}

/**
 * Registers the traceroute tool with the MCP server
 * 
 * @param server - The MCP server to register tools with
 */
function registerTracerouteTool(server: McpServer): void {
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
}

/**
 * Registers the DNS tool with the MCP server
 * 
 * @param server - The MCP server to register tools with
 */
function registerDnsTool(server: McpServer): void {
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
}

/**
 * Registers the MTR tool with the MCP server
 * 
 * @param server - The MCP server to register tools with
 */
function registerMtrTool(server: McpServer): void {
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
}

/**
 * Registers the HTTP tool with the MCP server
 * 
 * @param server - The MCP server to register tools with
 */
function registerHttpTool(server: McpServer): void {
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
}
