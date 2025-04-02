/**
 * Globalping MCP Server Tools - Utility Functions
 * 
 * This file contains utility functions for the Globalping MCP Server tools.
 */

import { 
    NetworkMeasurementOptions,
    DnsMeasurementOptions,
    HttpMeasurementOptions
} from './types.js';

/**
 * Type guard for HTTP measurement options
 * 
 * @param options - The options to check
 * @returns True if the options are HTTP options
 */
export function isHttpOptions(options: any): options is HttpMeasurementOptions {
    return options && typeof options === 'object';
}

/**
 * Type guard for DNS measurement options
 * 
 * @param options - The options to check
 * @returns True if the options are DNS options
 */
export function isDnsOptions(options: any): options is DnsMeasurementOptions {
    return options && typeof options === 'object';
}

/**
 * Type guard for Network measurement options
 * 
 * @param options - The options to check
 * @returns True if the options are Network options
 */
export function isNetworkOptions(options: any): options is NetworkMeasurementOptions {
    return options && typeof options === 'object';
}

/**
 * Helper function to safely cast string to enum types
 * 
 * @param value - The value to cast
 * @param allowedValues - Array of allowed enum values
 * @returns The cast value or undefined if not in allowed values
 */
export function safeCast<T extends string>(value: unknown, allowedValues: readonly T[]): T | undefined {
    if (typeof value === 'string' && allowedValues.includes(value as T)) {
        return value as T;
    }
    return undefined;
}

/**
 * Filter out undefined values from an options object
 * 
 * @param options - The options object to filter
 * @returns A new object with only defined values
 */
export function filterUndefinedValues<T extends Record<string, any>>(options: T): Partial<T> {
    const filtered: Partial<T> = {};
    
    for (const [key, value] of Object.entries(options)) {
        if (value !== undefined) {
            // Type assertion to help TypeScript understand we're safely adding valid keys
            (filtered as any)[key] = value;
        }
    }
    
    return filtered;
}
