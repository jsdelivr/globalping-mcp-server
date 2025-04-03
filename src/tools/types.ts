/**
 * Globalping MCP Server Tools - Type Definitions
 * 
 * This file contains type definitions for the Globalping MCP Server tools.
 */

import { 
    MeasurementRequest,
    NetworkMeasurementOptions,
    DnsMeasurementOptions,
    HttpMeasurementOptions
} from '../globalping/api.js';

/**
 * Type for the parameters received from tool calls
 */
export type ToolParams = Record<string, unknown>;

/**
 * Type for MCP tool results containing formatted text
 */
export type ToolResult = { 
    content: { type: "text"; text: string }[]; 
    isError?: boolean 
};

/**
 * Type for supported measurement types
 */
export type MeasurementType = MeasurementRequest['type'];

/**
 * Type for location specifications in measurement requests
 * This mirrors the location options structure from the Globalping API
 */
export interface LocationSpecification {
    continent?: "AF" | "AN" | "AS" | "EU" | "NA" | "OC" | "SA";
    region?: string;
    country?: string;
    state?: string | null;
    city?: string;
    asn?: number;
    network?: string;
    tags?: string[];
    magic?: string;
    limit?: number;
}

/**
 * Re-export measurement types for easy access
 */
export type {
    MeasurementRequest,
    NetworkMeasurementOptions,
    DnsMeasurementOptions,
    HttpMeasurementOptions
};
