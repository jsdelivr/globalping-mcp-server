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
 * Allows specifying probe locations using the magic field
 */
export const locationSchema = z.object({
    magic: z.string()
        .describe("Fuzzy matching location string that supports multiple criteria combined with + (AND). Examples: 'north america', 'europe+datacenter-network', 'AS15169' (Google's ASN). This is the recommended way to specify locations.")
}).describe("Specify probe locations using a single magic string that supports fuzzy matching on multiple criteria.");

/**
 * Common schema for global probe limit
 */
export const globalLimitSchema = z.number().int().min(1).max(500).optional()
    .describe("Overall maximum number of probes for the measurement. Min: 1, Max: 500. Default: 3.");

/**
 * Schema for IP version selection
 */
export const ipVersionSchema = z.enum(['4', '6']).optional()
    .describe("IP version to use (4 or 6). Only applicable for hostname targets.");

/**
 * Default number of probes to use for measurements
 * This is used across all measurement types when no specific limit is provided
 * The value of 3 provides a good balance between coverage and performance
 */
export const DEFAULT_PROBE_LIMIT = 3;

/**
 * Schema for resolver specification (used in DNS and HTTP measurements)
 */
export const resolverSchema = z.string()
    .describe("DNS resolver to use for the query. Can be an IPv4 address, IPv6 address, or hostname. Defaults to probe system resolver.");

/**
 * Schema for ping measurement inputs
 */
export const pingInputSchema = z.object({
    target: z.string()
        .describe("The hostname or IP address to ping (e.g., 'example.com' or '192.168.1.1')."),
    locations: z.array(locationSchema).optional()
        .describe("Array of location specifications defining where the probes should run from. If omitted, probes will be selected from diverse global locations."),
    limit: globalLimitSchema,
    packets: z.number().int().min(1).max(16).optional()
        .describe("Number of ICMP Echo packets to send. Min: 1, Max: 16. Default: 3."),
    ipVersion: ipVersionSchema,
});

/**
 * Schema for traceroute measurement inputs
 */
export const tracerouteInputSchema = z.object({
    target: z.string()
        .describe("The hostname or IP address to trace the route to (e.g., 'example.com' or '192.168.1.1')."),
    locations: z.array(locationSchema).optional()
        .describe("Array of location specifications defining where the probes should run from. If omitted, probes will be selected from diverse global locations."),
    limit: globalLimitSchema,
    port: z.number().int().min(0).max(65535).optional()
        .describe("Destination port for TCP/UDP traceroutes. Ignored for ICMP. Default: 80."),
    protocol: z.enum(['ICMP', 'TCP', 'UDP']).optional()
        .describe("Protocol to use for traceroute. Default: ICMP."),
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
    query: z.object({
        type: z.enum([
            'A', 'AAAA', 'ANY', 'CNAME', 'DNSKEY', 'DS', 
            'HTTPS', 'MX', 'NS', 'NSEC', 'PTR', 'RRSIG', 
            'SOA', 'TXT', 'SRV', 'SVCB'
        ]).optional()
            .describe("Type of DNS record to query. Default: A.")
    }).optional()
        .describe("The DNS query properties."),
    resolver: resolverSchema.optional(),
    protocol: z.enum(['UDP', 'TCP']).optional()
        .describe("Protocol to use for DNS queries. Default: UDP."),
    port: z.number().int().min(0).max(65535).optional()
        .describe("Port to use for DNS queries. Default: 53."),
    ipVersion: ipVersionSchema,
    trace: z.boolean().optional()
        .describe("Toggles tracing of the delegation path from root servers to target domain. Default: false.")
});

/**
 * Schema for MTR measurement inputs
 */
export const mtrInputSchema = z.object({
    target: z.string()
        .describe("The hostname or IP address to perform MTR to (e.g., 'example.com' or '192.168.1.1')."),
    locations: z.array(locationSchema).optional()
        .describe("Array of location specifications defining where the probes should run from. If omitted, probes will be selected from diverse global locations."),
    limit: globalLimitSchema,
    port: z.number().int().min(0).max(65535).optional()
        .describe("Destination port for TCP/UDP MTR. Ignored for ICMP. Default: 80."),
    protocol: z.enum(['ICMP', 'TCP', 'UDP']).optional()
        .describe("Protocol to use for MTR. Default: ICMP."),
    packets: z.number().int().min(1).max(16).optional()
        .describe("Number of packets to send to each hop. Min: 1, Max: 16. Default: 3."),
    ipVersion: ipVersionSchema,
});

/**
 * Schema for HTTP measurement inputs
 */
export const httpInputSchema = z.object({
    target: z.string()
        .describe("The URL to request. Can be a domain (e.g., 'example.com') or a full URL (e.g., 'https://example.com/path'). If a full URL is provided, the protocol and path will be extracted automatically."),
    locations: z.array(locationSchema).optional()
        .describe("Array of location specifications defining where the probes should run from. If omitted, probes will be selected from diverse global locations."),
    limit: globalLimitSchema,
    request: z.object({
        host: z.string().optional()
            .describe("An optional override for the Host header. Default is based on the target."),
        path: z.string().optional()
            .describe("The path portion of the URL."),
        query: z.string().optional()
            .describe("The query string portion of the URL."),
        method: z.enum(['HEAD', 'GET', 'OPTIONS']).optional()
            .describe("The HTTP method to use. Default: HEAD."),
        headers: z.record(z.string()).optional()
            .describe("Additional HTTP headers to include in the request. Note: Host and User-Agent headers are reserved.")
    }).optional()
        .describe("Optional HTTP request properties."),
    resolver: z.string().optional()
        .describe("A DNS resolver to use for the query. Default: probe's system resolver."),
    port: z.number().int().min(0).max(65535).optional()
        .describe("The port number to use. Default: 80 for HTTP, 443 for HTTPS."),
    protocol: z.enum(['HTTP', 'HTTPS', 'HTTP2']).optional()
        .describe("The transport protocol to use. Default: HTTPS. If the target includes a protocol (e.g., 'http://example.com'), it will override this value."),
    ipVersion: ipVersionSchema,
});

/**
 * API token schema for optional authentication
 */
export const apiTokenSchema = z.string().optional()
    .describe("Optional Globalping API token to use for this measurement. Provides higher rate limits.");
