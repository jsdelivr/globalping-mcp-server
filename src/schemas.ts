/**
 * Globalping MCP Server Schemas
 * 
 * This file contains the Zod schemas used for validating inputs across the Globalping MCP Server.
 * These schemas define the expected data structures for all tool inputs and help provide
 * self-documenting API through descriptive text.
 */

import { z } from "zod";

/**
 * Schema for location filtering in Globalping measurements
 * Allows specifying geographic locations or networks for measurement probes
 */
export const locationSchema = z.object({
    country: z.string().length(2, "Must be a 2-letter country code (ISO 3166-1 alpha-2)").optional()
        .describe("Two-letter ISO country code (e.g., 'US', 'DE', 'JP'). Used to select probes from a specific country."),
    continent: z.string().optional()
        .describe("Continent name (e.g., 'Europe', 'North America', 'Asia'). Used to select probes from an entire continent."),
    region: z.string().optional()
        .describe("Geographic region within a continent (e.g., 'Western Europe', 'Southeast Asia'). More specific than continent but less specific than country."),
    city: z.string().optional()
        .describe("City name (e.g., 'New York', 'London', 'Tokyo'). Used to select probes from a specific metropolitan area."),
    asn: z.number().int().positive().optional()
        .describe("Autonomous System Number, identifying a specific network operator (e.g., 13335 for Cloudflare). Used to test from a specific provider's network."),
    network: z.string().optional()
        .describe("Network name or identifier. Alternative to ASN for selecting probes from specific network providers."),
    tag: z.string().optional()
        .describe("Special tag identifier for groups of probes with specific characteristics (e.g., 'residential', 'datacenter')."),
    limit: z.number().int().positive().optional()
        .describe("Maximum number of probes to use *from this specific location definition* (e.g., limit 2 probes from 'Europe'). Each location can have its own limit."),
}).optional().describe("Specify geographic locations or networks for measurement probes. Multiple locations can be combined to create a diverse measurement profile.");

/**
 * Common schema for global probe limit
 */
export const globalLimitSchema = z.number().int().positive().optional()
    .describe("Overall maximum number of probes for the measurement");

/**
 * Schema for IP version selection
 */
export const ipVersionSchema = z.enum(['4', '6']).optional()
    .describe("IP version to use (4 or 6)");

/**
 * Default number of probes if not specified by user/client
 */
export const DEFAULT_PROBE_LIMIT = 3;

/**
 * Schema for ping measurement inputs
 */
export const pingInputSchema = z.object({
    target: z.string()
        .describe("The hostname or IP address to ping. Can be a domain name (e.g., 'example.com') or an IP address (e.g., '192.168.1.1')."),
    locations: z.array(locationSchema).optional()
        .describe("Array of location specifications defining where the probes should run from. If omitted, probes will be selected from diverse global locations."),
    limit: globalLimitSchema,
    packets: z.number().int().min(1).max(16).optional()
        .describe("Number of ICMP Echo packets to send (1-16). Default is 3."),
    ipVersion: ipVersionSchema,
});

/**
 * Schema for traceroute measurement inputs
 */
export const tracerouteInputSchema = z.object({
    target: z.string()
        .describe("The hostname or IP address to trace the route to. Can be a domain name (e.g., 'example.com') or an IP address (e.g., '192.168.1.1')."),
    locations: z.array(locationSchema).optional()
        .describe("Array of location specifications defining where the probes should run from. If omitted, probes will be selected from diverse global locations."),
    limit: globalLimitSchema,
    port: z.number().int().positive().optional()
        .describe("Destination port for TCP/UDP traceroutes. Ignored for ICMP."),
    protocol: z.enum(['ICMP', 'UDP', 'TCP']).optional()
        .describe("Protocol to use for traceroute (ICMP, UDP, or TCP). Default is ICMP."),
    packets: z.number().int().positive().optional()
        .describe("Number of packets to send per hop. Default is 3."),
    ipVersion: ipVersionSchema,
});

/**
 * Schema for DNS measurement inputs
 */
export const dnsInputSchema = z.object({
    target: z.string()
        .describe("The domain name to query (e.g., 'example.com'). For reverse DNS lookups, use the IP address when queryType is 'PTR'."),
    locations: z.array(locationSchema).optional()
        .describe("Array of location specifications defining where the probes should run from. If omitted, probes will be selected from diverse global locations."),
    limit: globalLimitSchema,
    queryType: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'NS', 'PTR', 'SOA', 'SRV', 'TXT']).optional()
        .describe("Type of DNS record to query. Default is 'A'."),
    resolver: z.string().ip().optional()
        .describe("Custom DNS resolver IP address to use instead of the probe's default resolver."),
    protocol: z.enum(['UDP', 'TCP']).optional()
        .describe("Protocol to use for DNS queries (UDP or TCP). Default is UDP."),
    port: z.number().int().positive().optional()
        .describe("Port to use for DNS queries. Default is 53."),
    ipVersion: ipVersionSchema,
});

/**
 * Schema for MTR measurement inputs
 */
export const mtrInputSchema = z.object({
    target: z.string()
        .describe("The hostname or IP address to perform MTR to. Can be a domain name (e.g., 'example.com') or an IP address (e.g., '192.168.1.1')."),
    locations: z.array(locationSchema).optional()
        .describe("Array of location specifications defining where the probes should run from. If omitted, probes will be selected from diverse global locations."),
    limit: globalLimitSchema,
    port: z.number().int().positive().optional()
        .describe("Destination port for TCP/UDP MTR. Ignored for ICMP."),
    protocol: z.enum(['ICMP', 'UDP', 'TCP']).optional()
        .describe("Protocol to use for MTR (ICMP, UDP, or TCP). Default is ICMP."),
    packets: z.number().int().positive().optional()
        .describe("Number of packets to send per hop. Default is 3."),
    ipVersion: ipVersionSchema,
});

/**
 * Schema for HTTP measurement inputs
 */
export const httpInputSchema = z.object({
    target: z.string().url("Must be a valid URL (e.g., https://example.com).")
        .describe("The complete URL to request, including protocol, hostname, path, and any query parameters (e.g., 'https://example.com/path?query=value')."),
    locations: z.array(locationSchema).optional()
        .describe("Array of location specifications defining where the probes should run from. If omitted, probes will be selected from diverse global locations."),
    limit: globalLimitSchema,
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']).optional()
        .describe("HTTP method to use for the request. Default is GET."),
    protocol: z.enum(['HTTP', 'HTTPS']).optional()
        .describe("Protocol to use (HTTP or HTTPS). This is usually determined from the target URL."),
    port: z.number().int().positive().optional()
        .describe("Custom port to connect to. Default is 80 for HTTP and 443 for HTTPS."),
    path: z.string().startsWith('/').optional()
        .describe("Path to request. This is usually determined from the target URL."),
    headers: z.record(z.string()).optional()
        .describe("Custom HTTP headers to include with the request."),
    ipVersion: ipVersionSchema,
});
