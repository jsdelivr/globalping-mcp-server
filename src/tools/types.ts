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
 * Re-export measurement types for easy access
 */
export type {
    MeasurementRequest,
    NetworkMeasurementOptions,
    DnsMeasurementOptions,
    HttpMeasurementOptions
};
