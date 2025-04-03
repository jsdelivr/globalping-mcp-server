/**
 * Globalping MCP Server Tools - Request Handlers
 * 
 * This file contains the handler functions for Globalping measurement requests.
 * These handlers process natural language requests from MCP clients and convert them
 * to properly formatted Globalping API requests.
 */

import { 
    createMeasurement, 
    pollForResult,
    MeasurementRequest,
    LocationSpecification
} from '../globalping/api.js';
import { formatMeasurementResult } from '../formatter.js';
import { DEFAULT_PROBE_LIMIT } from '../schemas.js';
import { ToolParams, ToolResult, MeasurementType } from './types.js';
import { safeCast, filterUndefinedValues } from './utils.js';
import { 
    addNetworkMeasurementOptions, 
    addDnsMeasurementOptions, 
    addHttpMeasurementOptions,
    processLocations 
} from './optionHandlers.js';

/**
 * Generic handler function for Globalping measurement requests
 * Handles the common logic for all measurement types
 * 
 * @param type - Measurement type ('ping', 'traceroute', etc.)
 * @param params - Parameters received from the MCP tool call
 * @returns MCP CallToolResult content
 */
export async function handleGlobalpingRequest(
    type: MeasurementType,
    params: ToolParams
): Promise<ToolResult> {
    const target = params.target as string;
    const apiToken = process.env.GLOBALPING_API_TOKEN || params.apiToken as string;

    console.error(`[MCP Tool Handler] Processing ${type} for target: ${target}`);

    // Construct the request payload for Globalping API
    const requestPayload: MeasurementRequest = {
        type: type,
        target: target,
        // No need to set locations or limit here as processLocations will handle this
    };

    // Apply global location processing
    processLocations(requestPayload, params);

    // Process measurement-specific options
    addMeasurementOptions(requestPayload, type, params);

    try {
        // 1. Create the measurement
        const createResponse = await createMeasurement(requestPayload, apiToken);
        if (!createResponse) {
            return { 
                content: [{ type: "text", text: `Failed to create ${type} measurement for ${target}. Check server logs.` }], 
                isError: true 
            };
        }

        // 2. Poll for the result
        const finalResult = await pollForResult(createResponse.id, apiToken);
        if (!finalResult) {
            return { 
                content: [{ type: "text", text: `Polling timed out or failed for ${type} measurement ${createResponse.id} for ${target}.` }], 
                isError: true 
            };
        }

        // Log information about the probes used
        console.error(`[MCP Tool Handler] Measurement completed with ${createResponse.probesCount} probes (requested: ${requestPayload.limit || DEFAULT_PROBE_LIMIT})`);
        
        // 3. Format and return the result
        // Use the formatter module to format the result based on measurement type
        const formattedResult = formatMeasurementResult(finalResult, type, target);
        
        return { 
            content: [{ type: "text", text: formattedResult }], 
            isError: finalResult.status === 'failed',
            rawData: finalResult, // Store the raw measurement data for advanced processing
            metadata: {
                probeLimitRequested: requestPayload.limit || DEFAULT_PROBE_LIMIT,
                probesUsed: createResponse.probesCount,
                measurementId: createResponse.id
            }
        };
    } catch (error) {
        console.error(`[MCP Tool Handler] Unhandled error during ${type} for ${target}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { 
            content: [{ type: "text", text: `An internal error occurred while processing the ${type} request for ${target}: ${errorMessage}` }], 
            isError: true 
        };
    }
}

/**
 * Adds measurement-specific options to the request payload based on measurement type
 * 
 * @param requestPayload - The request payload to modify
 * @param type - The measurement type
 * @param params - The parameters from the tool call
 */
function addMeasurementOptions(
    requestPayload: MeasurementRequest,
    type: MeasurementType,
    params: ToolParams
): void {
    switch (type) {
        case 'ping':
        case 'traceroute':
        case 'mtr': 
            addNetworkMeasurementOptions(requestPayload, params);
            break;
        case 'dns':
            addDnsMeasurementOptions(requestPayload, params);
            break;
        case 'http':
            addHttpMeasurementOptions(requestPayload, params);
            break;
    }
}
