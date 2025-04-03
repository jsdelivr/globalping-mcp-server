/**
 * Globalping MCP Server Tools - Type Definitions
 * 
 * This file contains TypeScript interfaces and types used across 
 * the Globalping MCP server tools.
 */

import { 
    MeasurementRequest,
    NetworkMeasurementOptions,
    DnsMeasurementOptions,
    HttpMeasurementOptions,
    LocationSpecification as GPLocationSpecification
} from '../globalping/api.js';

/**
 * Union type for all supported measurement types
 */
export type MeasurementType = MeasurementRequest['type'];

/**
 * Type for the parameters received from tool calls
 */
export type ToolParams = Record<string, unknown>;

/**
 * Interface for a tool result that will be returned to the MCP client
 * Must conform to the MCP Tool response format
 */
export interface ToolResult {
    content: ContentItem[];
    isError?: boolean;
    rawData?: any; // Raw measurement data for further processing
    // Adding an index signature to satisfy the MCP SDK requirements
    [key: string]: unknown;
}

/**
 * Union type for the various content types that can be returned in an MCP tool result
 */
export type ContentItem = 
    | { type: "text"; text: string; }
    | { type: "image"; data: string; mimeType: string; }
    | { 
        type: "resource"; 
        resource: 
            | { text: string; uri: string; mimeType?: string; }
            | { uri: string; blob: string; mimeType?: string; };
      };

/**
 * Re-export location specification type from Globalping API
 */
export type LocationSpecification = GPLocationSpecification;

/**
 * Re-export measurement option types for easy access
 */
export type { NetworkMeasurementOptions, DnsMeasurementOptions, HttpMeasurementOptions };

/**
 * Re-export the MeasurementRequest type
 */
export type { MeasurementRequest };

/**
 * Function to safely check if a location has a specific field
 * @param locations Location array
 * @param fieldName Field to check
 * @returns True if the field exists and has a value
 */
export function locationHasField(locations: LocationSpecification[] | undefined, fieldName: string): boolean {
    if (!locations || locations.length === 0) {
        return false;
    }
    return locations.some(location => Boolean(location[fieldName as keyof LocationSpecification]));
}
