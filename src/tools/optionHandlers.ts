/**
 * Globalping MCP Server Tools - Option Handlers
 * 
 * This file contains helper functions for processing measurement-specific options.
 * These handlers ensure proper formatting of options according to the Globalping API schema.
 */

import { MeasurementRequest } from '../globalping/api.js';
import { ToolParams } from './types.js';
import { safeCast, filterUndefinedValues } from './utils.js';
import { DEFAULT_PROBE_LIMIT } from '../schemas.js';

/**
 * Processes location specifications using the magic field
 * This is the recommended way to specify locations for all test types
 * 
 * @param requestPayload - The request payload to modify
 * @param params - The parameters from the tool call
 */
export function processLocations(
    requestPayload: MeasurementRequest,
    params: ToolParams
): void {
    // Set the global limit (default to 3 if not specified)
    requestPayload.limit = typeof params.limit === 'number' ? params.limit : DEFAULT_PROBE_LIMIT;
    
    // Check if locations is a string (measurement ID for comparison)
    if (params.locations && typeof params.locations === 'string') {
        // Direct assignment for measurement ID (probe reuse mode)
        console.error(`[Location Processing] Using previous measurement ID for probe reuse: ${params.locations}`);
        requestPayload.locations = params.locations;
        return;
    }
    
    // Process locations if provided as an array
    if (params.locations && Array.isArray(params.locations)) {
        // Ensure all locations use the magic field format
        const formattedLocations = params.locations
            .map(location => {
                if (typeof location === 'object' && location !== null) {
                    if (location.magic && typeof location.magic === 'string') {
                        return { magic: location.magic };
                    } else if (typeof location.limit === 'number') {
                        // Keep the limit if specified
                        return { 
                            magic: formatLocationToMagic(location),
                            limit: location.limit
                        };
                    } else {
                        return { magic: formatLocationToMagic(location) };
                    }
                }
                return null;
            })
            .filter((loc): loc is { magic: string; limit?: number } => loc !== null);
        
        if (formattedLocations.length > 0) {
            requestPayload.locations = formattedLocations;
        }
    }
}

/**
 * Converts legacy location format to magic string format
 * 
 * @param location - Location object with various properties
 * @returns A magic string representation
 */
function formatLocationToMagic(location: Record<string, any>): string {
    const parts: string[] = [];
    
    // Add each location property to the magic string
    if (location.continent) parts.push(location.continent);
    if (location.region) parts.push(location.region);
    if (location.country) parts.push(location.country);
    if (location.state) parts.push(location.state);
    if (location.city) parts.push(location.city);
    if (location.asn) parts.push(`AS${location.asn}`);
    if (location.network) parts.push(location.network);
    
    // Add tags if present
    if (Array.isArray(location.tags)) {
        parts.push(...location.tags);
    }
    
    // Combine all parts with + as AND operator
    return parts.join('+');
}

/**
 * Adds network measurement options (ping, traceroute, mtr) to the request payload
 * 
 * @param requestPayload - The request payload to modify
 * @param params - The parameters from the tool call
 */
export function addNetworkMeasurementOptions(
    requestPayload: MeasurementRequest,
    params: ToolParams
): void {
    // Network protocols allowed values
    const allowedProtocols = ['ICMP', 'UDP', 'TCP'] as const;
    
    // Process locations
    processLocations(requestPayload, params);
    
    // Options common to ping, traceroute, and mtr
    const networkOptions = {
        packets: typeof params.packets === 'number' ? params.packets : undefined,
        port: typeof params.port === 'number' ? params.port : undefined,
        protocol: safeCast(params.protocol, allowedProtocols),
        ipVersion: typeof params.ipVersion === 'number' ? params.ipVersion as 4 | 6 : undefined,
    };

    // Filter out undefined values
    const filteredOptions = filterUndefinedValues(networkOptions);

    if (Object.keys(filteredOptions).length > 0) {
        requestPayload.measurementOptions = filteredOptions;
    }
}

/**
 * Adds DNS measurement options to the request payload
 * 
 * @param requestPayload - The request payload to modify
 * @param params - The parameters from the tool call
 */
export function addDnsMeasurementOptions(
    requestPayload: MeasurementRequest,
    params: ToolParams
): void {
    // DNS record types allowed values
    const allowedQueryTypes = [
        'A', 'AAAA', 'ANY', 'CNAME', 'DNSKEY', 'DS', 
        'HTTPS', 'MX', 'NS', 'NSEC', 'PTR', 'RRSIG', 
        'SOA', 'TXT', 'SRV', 'SVCB'
    ] as const;
    
    // DNS protocols allowed values
    const allowedProtocols = ['UDP', 'TCP'] as const;
    
    // Process locations
    processLocations(requestPayload, params);
    
    // DNS-specific options with correct nesting structure
    const dnsOptions: Record<string, any> = {
        resolver: typeof params.resolver === 'string' ? params.resolver : undefined,
        protocol: safeCast(params.protocol, allowedProtocols),
        port: typeof params.port === 'number' ? params.port : undefined,
        ipVersion: typeof params.ipVersion === 'number' ? params.ipVersion as 4 | 6 : undefined,
        trace: typeof params.trace === 'boolean' ? params.trace : undefined,
    };

    // Add query type in the proper nested structure
    if (params.queryType) {
        const queryType = safeCast(params.queryType, allowedQueryTypes);
        if (queryType) {
            dnsOptions.query = {
                type: queryType
            };
        }
    }

    // Filter out undefined values
    const filteredOptions = filterUndefinedValues(dnsOptions);

    if (Object.keys(filteredOptions).length > 0) {
        requestPayload.measurementOptions = filteredOptions;
    }
}

/**
 * Adds HTTP measurement options to the request payload
 * 
 * @param requestPayload - The request payload to modify
 * @param params - The parameters from the tool call
 */
export function addHttpMeasurementOptions(
    requestPayload: MeasurementRequest,
    params: ToolParams
): void {
    // HTTP methods allowed values
    const allowedMethods = ['HEAD', 'GET', 'OPTIONS'] as const;
    // HTTP protocols allowed values
    const allowedProtocols = ['HTTP', 'HTTPS', 'HTTP2'] as const;
    
    // Process locations
    processLocations(requestPayload, params);
    
    // Parse the target URL to extract domain, protocol, and path
    if (requestPayload.target) {
        const urlInfo = parseUrl(requestPayload.target);
        
        // Update the request payload with the parsed information
        requestPayload.target = urlInfo.domain;
        
        // HTTP-specific options with proper nesting structure
        const httpOptions: Record<string, any> = {
            protocol: urlInfo.protocol || safeCast(params.protocol, allowedProtocols),
            ipVersion: typeof params.ipVersion === 'number' ? params.ipVersion as 4 | 6 : undefined,
            resolver: typeof params.resolver === 'string' ? params.resolver : undefined,
            port: typeof params.port === 'number' ? params.port : undefined,
        };

        // Build request object
        const requestOptions: Record<string, any> = {};
        
        // Add method if provided
        if (params.method) {
            requestOptions.method = safeCast(params.method, allowedMethods);
        }
        
        // Add path from URL if extracted, otherwise use provided path
        if (urlInfo.path && urlInfo.path !== '/') {
            requestOptions.path = urlInfo.path;
        } else if (typeof params.path === 'string') {
            requestOptions.path = params.path;
        }
        
        // Add query, host if provided
        if (typeof params.query === 'string') requestOptions.query = params.query;
        if (typeof params.host === 'string') requestOptions.host = params.host;

        // Handle headers separately
        if (params.headers && typeof params.headers === 'object') {
            requestOptions.headers = params.headers as Record<string, string>;
        }

        // Add request object if it has properties
        const filteredRequestOptions = filterUndefinedValues(requestOptions);
        if (Object.keys(filteredRequestOptions).length > 0) {
            httpOptions.request = filteredRequestOptions;
        }

        // Filter out the main options
        const filteredOptions = filterUndefinedValues(httpOptions);
        if (Object.keys(filteredOptions).length > 0) {
            requestPayload.measurementOptions = filteredOptions;
        }
    }
}

/**
 * Parse a URL string into domain, protocol, and path components
 * 
 * @param url - The URL to parse
 * @returns Object containing domain, protocol, and path
 */
function parseUrl(url: string): { 
    domain: string; 
    protocol?: 'HTTP' | 'HTTPS' | 'HTTP2';
    path?: string;
} {
    // Regular expression to parse URL with or without protocol
    const urlRegex = /^(?:([Hh][Tt][Tt][Pp][Ss]?):\/\/)?([^\/\s]+)(\/[^\s]*)?$/;
    const match = url.match(urlRegex);
    
    if (!match) {
        // If no match, assume it's just a domain
        return { domain: url };
    }
    
    const [, protocolStr, domain, pathStr] = match;
    
    // Determine protocol
    let protocol: 'HTTP' | 'HTTPS' | 'HTTP2' | undefined;
    if (protocolStr) {
        protocol = protocolStr.toLowerCase() === 'http' ? 'HTTP' : 'HTTPS';
    }
    
    return {
        domain,
        protocol,
        path: pathStr || undefined
    };
}
