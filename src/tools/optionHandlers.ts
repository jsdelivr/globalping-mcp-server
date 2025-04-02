/**
 * Globalping MCP Server Tools - Option Handlers
 * 
 * This file contains helper functions for processing measurement-specific options.
 */

import { MeasurementRequest } from '../globalping/api.js';
import { ToolParams } from './types.js';
import { safeCast, filterUndefinedValues } from './utils.js';

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
    const allowedQueryTypes = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'PTR', 'SOA', 'SRV', 'TXT'] as const;
    // DNS protocols allowed values
    const allowedProtocols = ['UDP', 'TCP'] as const;
    // DNS trace mode values
    const allowedTraceMode = [true, false] as const;
    
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
    const allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;
    // HTTP protocols allowed values - adding HTTP2 support
    const allowedProtocols = ['HTTP', 'HTTPS', 'HTTP2'] as const;
    
    // HTTP-specific options with proper nesting structure
    const httpOptions: Record<string, any> = {
        protocol: safeCast(params.protocol, allowedProtocols),
        ipVersion: typeof params.ipVersion === 'number' ? params.ipVersion as 4 | 6 : undefined,
        followRedirects: typeof params.followRedirects === 'boolean' ? params.followRedirects : undefined,
    };

    // Add request-specific options in the proper nested structure
    const requestOptions: Record<string, any> = {
        method: safeCast(params.method, allowedMethods),
        port: typeof params.port === 'number' ? params.port : undefined,
        path: typeof params.path === 'string' ? params.path : undefined,
    };

    // Handle headers separately
    if (params.headers && typeof params.headers === 'object') {
        requestOptions.headers = params.headers as Record<string, string>;
    }

    // Handle body separately
    if (params.body && typeof params.body === 'string') {
        requestOptions.body = params.body;
    }

    // Filter out undefined values
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
