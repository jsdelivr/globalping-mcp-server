/**
 * Globalping MCP Server - Natural Language Interface
 * 
 * This module provides a high-level natural language interface for AI models
 * to interact with Globalping's measurement tools. It acts as the main entry
 * point for AI assistants to perform network measurements using natural language.
 * 
 * @module natural
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';
import { processNaturalLanguageQuery } from './nlp.js';
import { MeasurementType, Location } from '../globalping/types.js';
import { 
    createMeasurement,
    getMeasurementResult,
    pollForResult,
    MeasurementResult,
    ProbeResult
} from '../globalping/api.js';

/**
 * Tool result codes for consistent API responses
 */
const RESULT_CODE = {
    SUCCESS: 0,
    ERROR: 1,
    PARTIAL: 2
};

/**
 * Interface for tool results to maintain consistent response structure
 */
interface ToolResult {
    code: number;
    message: string;
    [key: string]: any;
}

/**
 * Default number of probes to use for measurements when not specified
 */
const DEFAULT_PROBE_COUNT = 3;

/**
 * Formats measurement results into a user-friendly structure
 * 
 * This function takes the raw measurement results and extracts the most relevant
 * information based on the measurement type. It provides a simplified view
 * that's easier for AI models to understand and communicate to users.
 * 
 * @param type - The type of measurement that was performed
 * @param measurements - Array of targets and their measurement results
 * @param isComparative - Whether this is a comparative analysis (multiple targets)
 * @returns Formatted measurement results with extracted metrics
 */
function formatMeasurementResults(
    type: MeasurementType,
    measurements: Array<{ target: string, result: MeasurementResult }>,
    isComparative: boolean
): Record<string, any> {
    // If this is a comparative analysis, use the comparison functions
    if (isComparative && measurements.length > 1) {
        return compareResults(type, measurements);
    }
    
    // For single target measurements, extract relevant metrics
    const target = measurements[0].target;
    const result = measurements[0].result;
    
    // Common properties for all measurement types
    const formatted: Record<string, any> = {
        target,
        measurementType: type,
        probeCount: result.results.length,
        timestamp: result.createdAt, // Use createdAt instead of timestamp
        locations: result.results.map(probe => ({
            continent: probe.probe.continent,
            country: probe.probe.country,
            city: probe.probe.city,
            network: probe.probe.network
        }))
    };
    
    // Add type-specific metrics
    switch (type) {
        case 'ping':
            formatted.metrics = {
                avgLatency: extractAvgLatency(result),
                minLatency: extractMinLatency(result),
                maxLatency: extractMaxLatency(result),
                packetLoss: extractPacketLoss(result)
            };
            formatted.summary = `Average latency to ${target} is ${formatted.metrics.avgLatency.toFixed(2)}ms with ${formatted.metrics.packetLoss.toFixed(1)}% packet loss`;
            break;
            
        case 'http':
            formatted.metrics = {
                avgTtfb: extractAvgTtfb(result),
                avgTotalTime: extractAvgTotalTime(result),
                avgStatusCode: extractAvgStatusCode(result)
            };
            formatted.summary = `${target} loads in an average of ${formatted.metrics.avgTotalTime.toFixed(2)}ms with ${formatted.metrics.avgTtfb.toFixed(2)}ms time to first byte`;
            break;
            
        case 'dns':
            formatted.metrics = {
                avgResponseTime: extractAvgDnsResponseTime(result),
                recordTypes: extractDnsRecordTypes(result)
            };
            formatted.summary = `DNS resolution for ${target} takes an average of ${formatted.metrics.avgResponseTime.toFixed(2)}ms`;
            break;
            
        case 'traceroute':
        case 'mtr':
            formatted.metrics = {
                avgHopCount: extractAvgHopCount(result),
                commonAsns: extractCommonAsns(result)
            };
            formatted.summary = `Route to ${target} has an average of ${Math.round(formatted.metrics.avgHopCount)} hops`;
            break;
            
        default:
            formatted.metrics = {};
            formatted.summary = `Completed ${type} measurement for ${target}`;
    }
    
    // Add raw results for reference
    formatted.rawResults = result;
    
    return formatted;
}

/**
 * Extract key metrics from a measurement result based on measurement type
 * 
 * @param type - Type of measurement 
 * @param result - Measurement result to extract metrics from
 * @returns Object containing key metrics
 */
function extractKeyMetrics(type: MeasurementType, result: MeasurementResult): Record<string, any> {
    const metrics: Record<string, any> = {};
    
    // Extract metrics based on measurement type
    switch (type) {
        case 'ping':
            // For ping, collect min/max/avg/loss stats
            metrics.minLatency = extractMinLatency(result);
            metrics.maxLatency = extractMaxLatency(result);
            metrics.avgLatency = extractAvgLatency(result);
            metrics.packetLoss = extractPacketLoss(result);
            break;
            
        case 'http':
            // For HTTP, collect TTFB and total time
            metrics.avgTtfb = extractAvgTtfb(result);
            metrics.avgTotalTime = extractAvgTotalTime(result);
            metrics.avgStatusCode = extractAvgStatusCode(result);
            break;
            
        case 'dns':
            // For DNS, collect response times and result counts
            metrics.avgResponseTime = extractAvgDnsResponseTime(result);
            metrics.recordTypes = extractDnsRecordTypes(result);
            break;
            
        case 'traceroute':
        case 'mtr':
            // For route-based tests, collect hop counts and path info
            metrics.avgHopCount = extractAvgHopCount(result);
            metrics.commonAsns = extractCommonAsns(result);
            break;
    }
    
    return metrics;
}

/**
 * Extract minimum latency from ping results across all probes
 */
function extractMinLatency(result: MeasurementResult): number {
    try {
        // Extract min latency from all probes
        const allValues = result.results
            .filter(probe => probe.result.status === 'finished')
            .map(probe => probe.result?.min)
            .filter(value => typeof value === 'number');
            
        if (allValues.length === 0) return 0;
        return Math.min(...allValues);
    } catch (e) {
        return 0;
    }
}

/**
 * Extract maximum latency from ping results across all probes
 */
function extractMaxLatency(result: MeasurementResult): number {
    try {
        // Extract max latency from all probes
        const allValues = result.results
            .filter(probe => probe.result.status === 'finished')
            .map(probe => probe.result?.max)
            .filter(value => typeof value === 'number');
            
        if (allValues.length === 0) return 0;
        return Math.max(...allValues);
    } catch (e) {
        return 0;
    }
}

/**
 * Extract average latency from ping results across all probes
 */
function extractAvgLatency(result: MeasurementResult): number {
    try {
        // Extract average latency from all probes
        const allValues = result.results
            .filter(probe => probe.result.status === 'finished')
            .map(probe => probe.result?.avg)
            .filter(value => typeof value === 'number');
            
        if (allValues.length === 0) return 0;
        const sum = allValues.reduce((acc, val) => acc + val, 0);
        return sum / allValues.length;
    } catch (e) {
        return 0;
    }
}

/**
 * Extract packet loss percentage from ping results across all probes
 */
function extractPacketLoss(result: MeasurementResult): number {
    try {
        // Extract packet loss from all probes
        const allValues = result.results
            .filter(probe => probe.result.status === 'finished')
            .map(probe => {
                // Calculate packet loss percentage
                if (typeof probe.result?.packetLoss === 'number') {
                    return probe.result.packetLoss;
                }
                return null;
            })
            .filter(value => value !== null) as number[];
            
        if (allValues.length === 0) return 0;
        const sum = allValues.reduce((acc, val) => acc + val, 0);
        return sum / allValues.length;
    } catch (e) {
        return 0;
    }
}

// HTTP metrics extractors
function extractAvgTtfb(result: MeasurementResult): number {
    try {
        const values = result.results
            .filter(probe => probe.result.status === 'finished')
            .map(probe => probe.result?.firstByteTime)
            .filter(value => typeof value === 'number') as number[];
            
        if (values.length === 0) return 0;
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    } catch (e) {
        return 0;
    }
}

function extractAvgTotalTime(result: MeasurementResult): number {
    try {
        const values = result.results
            .filter(probe => probe.result.status === 'finished')
            .map(probe => probe.result?.totalTime)
            .filter(value => typeof value === 'number') as number[];
            
        if (values.length === 0) return 0;
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    } catch (e) {
        return 0;
    }
}

function extractAvgStatusCode(result: MeasurementResult): number {
    try {
        const values = result.results
            .filter(probe => probe.result.status === 'finished')
            .map(probe => probe.result?.statusCode)
            .filter(value => typeof value === 'number') as number[];
            
        if (values.length === 0) return 0;
        return Math.round(values.reduce((sum, val) => sum + val, 0) / values.length);
    } catch (e) {
        return 0;
    }
}

// DNS metrics extractors
function extractAvgDnsResponseTime(result: MeasurementResult): number {
    try {
        const values = result.results
            .filter(probe => probe.result.status === 'finished')
            .map(probe => probe.result?.responseTime)
            .filter(value => typeof value === 'number') as number[];
            
        if (values.length === 0) return 0;
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    } catch (e) {
        return 0;
    }
}

function extractDnsRecordTypes(result: MeasurementResult): Record<string, number> {
    try {
        const recordCounts: Record<string, number> = {};
        
        result.results
            .filter(probe => probe.result.status === 'finished' && probe.result?.answers)
            .forEach(probe => {
                const answers = probe.result.answers || [];
                answers.forEach((answer: any) => {
                    const type = answer.type || 'unknown';
                    recordCounts[type] = (recordCounts[type] || 0) + 1;
                });
            });
            
        return recordCounts;
    } catch (e) {
        return {};
    }
}

// Traceroute/MTR metrics extractors
function extractAvgHopCount(result: MeasurementResult): number {
    try {
        const values = result.results
            .filter(probe => probe.result.status === 'finished' && Array.isArray(probe.result?.hops))
            .map(probe => probe.result.hops.length)
            .filter(value => typeof value === 'number') as number[];
            
        if (values.length === 0) return 0;
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    } catch (e) {
        return 0;
    }
}

function extractCommonAsns(result: MeasurementResult): string[] {
    try {
        const asnCounts: Record<string, number> = {};
        
        result.results
            .filter(probe => probe.result.status === 'finished' && Array.isArray(probe.result?.hops))
            .forEach(probe => {
                const hops = probe.result.hops || [];
                hops.forEach((hop: any) => {
                    if (hop.asn) {
                        const asnKey = `${hop.asn} (${hop.network || 'Unknown'})`;
                        asnCounts[asnKey] = (asnCounts[asnKey] || 0) + 1;
                    }
                });
            });
        
        // Return top 5 most common ASNs
        return Object.entries(asnCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([asn]) => asn);
    } catch (e) {
        return [];
    }
}

/**
 * Compare results between multiple targets and create a summary
 */
function compareResults(
    type: MeasurementType, 
    measurements: Array<{ target: string, result: MeasurementResult }>
): Record<string, any> {
    // Different comparison logic based on measurement type
    switch (type) {
        case 'ping':
            return comparePingResults(measurements);
        case 'http':
            return compareHttpResults(measurements);
        case 'dns':
            return compareDnsResults(measurements);
        case 'traceroute':
        case 'mtr':
            return compareRouteResults(measurements);
        default:
            return {
                message: `Comparison for ${type} measurements not supported`
            };
    }
}

/**
 * Compare ping results between targets
 */
function comparePingResults(
    measurements: Array<{ target: string, result: MeasurementResult }>
): Record<string, any> {
    // Extract key metrics for comparison
    const comparisonData = measurements.map(m => ({
        target: m.target,
        avgLatency: extractAvgLatency(m.result),
        minLatency: extractMinLatency(m.result),
        maxLatency: extractMaxLatency(m.result),
        packetLoss: extractPacketLoss(m.result)
    }));
    
    // Sort by average latency (lowest first)
    comparisonData.sort((a, b) => a.avgLatency - b.avgLatency);
    
    // Generate text summary
    const fastestTarget = comparisonData[0].target;
    const fastestLatency = comparisonData[0].avgLatency.toFixed(2);
    const slowestTarget = comparisonData[comparisonData.length - 1].target;
    const slowestLatency = comparisonData[comparisonData.length - 1].avgLatency.toFixed(2);
    
    return {
        metric: 'latency',
        sorted: comparisonData,
        fastestTarget,
        slowestTarget,
        summary: `${fastestTarget} has the lowest average latency (${fastestLatency}ms) compared to ${slowestTarget} (${slowestLatency}ms)`
    };
}

/**
 * Compare HTTP results between targets
 */
function compareHttpResults(
    measurements: Array<{ target: string, result: MeasurementResult }>
): Record<string, any> {
    // Extract key metrics for comparison
    const comparisonData = measurements.map(m => ({
        target: m.target,
        avgTtfb: extractAvgTtfb(m.result),
        avgTotalTime: extractAvgTotalTime(m.result),
        avgStatusCode: extractAvgStatusCode(m.result)
    }));
    
    // Sort by total time (lowest first)
    comparisonData.sort((a, b) => a.avgTotalTime - b.avgTotalTime);
    
    // Generate text summary
    const fastestTarget = comparisonData[0].target;
    const fastestTime = comparisonData[0].avgTotalTime.toFixed(2);
    const slowestTarget = comparisonData[comparisonData.length - 1].target;
    const slowestTime = comparisonData[comparisonData.length - 1].avgTotalTime.toFixed(2);
    
    return {
        metric: 'loadTime',
        sorted: comparisonData,
        fastestTarget,
        slowestTarget,
        summary: `${fastestTarget} loads faster with an average time of ${fastestTime}ms compared to ${slowestTarget} (${slowestTime}ms)`
    };
}

/**
 * Compare DNS results between targets
 */
function compareDnsResults(
    measurements: Array<{ target: string, result: MeasurementResult }>
): Record<string, any> {
    // Extract key metrics for comparison
    const comparisonData = measurements.map(m => ({
        target: m.target,
        avgResponseTime: extractAvgDnsResponseTime(m.result),
        recordTypes: extractDnsRecordTypes(m.result)
    }));
    
    // Sort by response time (lowest first)
    comparisonData.sort((a, b) => a.avgResponseTime - b.avgResponseTime);
    
    // Generate text summary
    const fastestTarget = comparisonData[0].target;
    const fastestTime = comparisonData[0].avgResponseTime.toFixed(2);
    const slowestTarget = comparisonData[comparisonData.length - 1].target;
    const slowestTime = comparisonData[comparisonData.length - 1].avgResponseTime.toFixed(2);
    
    return {
        metric: 'dnsResolutionTime',
        sorted: comparisonData,
        fastestTarget,
        slowestTarget,
        summary: `${fastestTarget} resolves faster with an average DNS resolution time of ${fastestTime}ms compared to ${slowestTarget} (${slowestTime}ms)`
    };
}

/**
 * Compare traceroute/MTR results between targets
 */
function compareRouteResults(
    measurements: Array<{ target: string, result: MeasurementResult }>
): Record<string, any> {
    // Extract key metrics for comparison
    const comparisonData = measurements.map(m => ({
        target: m.target,
        avgHopCount: extractAvgHopCount(m.result),
        commonAsns: extractCommonAsns(m.result)
    }));
    
    // Sort by hop count (lowest first)
    comparisonData.sort((a, b) => a.avgHopCount - b.avgHopCount);
    
    // Generate text summary
    const shortestTarget = comparisonData[0].target;
    const shortestHops = Math.round(comparisonData[0].avgHopCount);
    const longestTarget = comparisonData[comparisonData.length - 1].target;
    const longestHops = Math.round(comparisonData[comparisonData.length - 1].avgHopCount);
    
    return {
        metric: 'pathLength',
        sorted: comparisonData,
        shortestPathTarget: shortestTarget,
        longestPathTarget: longestTarget,
        summary: `${shortestTarget} has a shorter network path with an average of ${shortestHops} hops compared to ${longestTarget} (${longestHops} hops)`
    };
}

/**
 * Polls for measurement results until completion
 * 
 * @param measurementId - ID of the measurement to poll for
 * @param apiToken - Optional API token
 * @returns The final measurement result
 */
async function pollMeasurementResults(measurementId: string, apiToken?: string): Promise<MeasurementResult> {
    return pollForResult(measurementId, apiToken, 60000, 2000);
}

/**
 * Applies the default probe count to all location specifications
 * that don't already have a limit defined.
 * 
 * @param locations - Array of location specifications to process
 * @returns The processed location specifications with default limits applied
 */
function applyDefaultProbeCount(locations: Location[] | undefined): Location[] | undefined {
    if (!locations || locations.length === 0) {
        // Default to using a global distribution with default probe count
        // This creates a single location object with just a limit, which selects
        // probes from anywhere in the world
        return [{ limit: DEFAULT_PROBE_COUNT }];
    }

    // Apply the default probe count to each location that doesn't have a limit
    return locations.map(location => {
        if (location.limit === undefined) {
            return { ...location, limit: DEFAULT_PROBE_COUNT };
        }
        return location;
    });
}

/**
 * Handles measurement errors consistently and provides helpful feedback
 * 
 * @param error - The error that occurred
 * @param target - The target being measured (if available)
 * @returns A structured error result 
 */
function handleMeasurementError(error: unknown, target?: string): ToolResult {
    console.error('[Natural Language Tool] Error:', error);
    
    let errorMessage = 'An error occurred while performing the measurement';
    
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    
    return {
        code: RESULT_CODE.ERROR,
        message: errorMessage,
        target: target || 'unknown',
        error: errorMessage
    };
}

/**
 * Registers the natural language interface tool with the MCP server
 * 
 * This tool provides a simplified interface for AI models to interact with
 * Globalping's network measurement capabilities using natural language.
 * 
 * @param server - The MCP server to register the tool with
 */
export function registerNaturalLanguageTool(server: McpServer): void {
    server.tool(
        "globalping",
        "Performs network measurements using Globalping's global probe network. This tool can analyze queries and automatically select the appropriate measurement type (ping, traceroute, dns, mtr, http). It understands general queries like 'What is the latency to example.com?', 'Compare the speed of site-a.com vs site-b.com', or 'How does domain.com resolve in Europe?'",
        {
            query: z.string().describe("A natural language query describing the network measurement to perform. For example: 'Check the latency to google.com from Europe', 'Is example.com faster than example.org?', 'Trace the route to 8.8.8.8 from Asia', 'How does cdn.jsdelivr.net resolve in the US?'"),
            apiToken: z.string().optional().describe("Optional Globalping API token to use for this measurement"),
        },
        async (params: { query: string, apiToken?: string }) => {
            console.error(`[Natural Language Tool] Processing query: "${params.query}"`);
            
            // Get the API token, either from params or environment variable
            const apiToken = process.env.GLOBALPING_API_TOKEN || params.apiToken as string;
            
            try {
                // Process the natural language query to determine what to measure
                const parsedQuery = processNaturalLanguageQuery(params.query);
                console.error(`[Natural Language Tool] Parsed query measurement type: ${parsedQuery.measurementType}`);
                console.error(`[Natural Language Tool] Targets to measure: ${parsedQuery.targets.length}`);
                
                // If no targets were found in the query, provide a helpful error
                if (parsedQuery.targets.length === 0) {
                    throw new Error("Could not identify any valid targets (domains or IP addresses) in your query");
                }
                
                // Log the measurement details for debugging
                parsedQuery.targets.forEach((target, i) => {
                    console.error(`[Natural Language Tool] Target ${i+1}: ${target} using ${parsedQuery.measurementType}`);
                });
                
                if (parsedQuery.locations && parsedQuery.locations.length > 0) {
                    console.error(`[Natural Language Tool] Using locations: ${JSON.stringify(parsedQuery.locations)}`);
                }
                
                // Apply default probe count to locations
                const locationsWithDefaults = applyDefaultProbeCount(parsedQuery.locations);
                
                // Check if we're doing a comparative query (multiple targets)
                const isComparative = parsedQuery.targets.length > 1;
                
                if (isComparative) {
                    // For comparative queries, run measurements for all targets and compare
                    const results: ToolResult[] = [];
                    const rawMeasurements: Array<{ target: string, result: MeasurementResult }> = [];
                    const measurementType = parsedQuery.measurementType;
                    const targets = parsedQuery.targets;
                    
                    console.error(`[Natural Language Tool] Running comparative ${measurementType} measurements for targets: ${targets.join(', ')}`);
                    
                    // Run each measurement and collect results
                    for (const target of parsedQuery.targets) {
                        // Prepare params for the measurement handler
                        const measurementParams = {
                            type: measurementType,
                            target: target,
                            locations: locationsWithDefaults,
                            measurementOptions: parsedQuery.options
                        };
                        
                        try {
                            // Create the measurement
                            const measurement = await createMeasurement(measurementParams, apiToken);
                            console.error(`[Natural Language Tool] Created measurement ${measurement.id} for ${target}`);
                            
                            // Poll until the measurement is complete
                            const measurementResult = await pollMeasurementResults(measurement.id, apiToken);
                            rawMeasurements.push({
                                target,
                                result: measurementResult
                            });
                            
                            // Add the formatted result
                            results.push({
                                code: RESULT_CODE.SUCCESS,
                                target,
                                message: `Completed ${measurementType} measurement for ${target}`,
                                data: measurementResult
                            });
                        } catch (error) {
                            console.error(`[Natural Language Tool] Error in measurement for ${target}:`, error);
                            
                            // If this is an HTTP measurement and the error appears to be related to URL formatting,
                            // try again with explicit https:// prefix
                            if (measurementType === 'http' && 
                                error instanceof Error && 
                                (error.message.includes('Invalid URL') || error.message.includes('validation')) &&
                                !target.startsWith('http')) {
                                
                                try {
                                    const httpsTarget = `https://${target}`;
                                    console.error(`[Natural Language Tool] Retrying with HTTPS prefix: ${httpsTarget}`);
                                    
                                    const retryParams = {
                                        ...measurementParams,
                                        target: httpsTarget
                                    };
                                    
                                    const measurement = await createMeasurement(retryParams, apiToken);
                                    console.error(`[Natural Language Tool] Created measurement ${measurement.id} for ${httpsTarget}`);
                                    
                                    const measurementResult = await pollMeasurementResults(measurement.id, apiToken);
                                    rawMeasurements.push({
                                        target: httpsTarget,
                                        result: measurementResult
                                    });
                                    
                                    results.push({
                                        code: RESULT_CODE.SUCCESS,
                                        target: httpsTarget,
                                        message: `Completed ${measurementType} measurement for ${httpsTarget}`,
                                        data: measurementResult
                                    });
                                } catch (retryError) {
                                    results.push(handleMeasurementError(retryError, target));
                                }
                            } else {
                                results.push(handleMeasurementError(error, target));
                            }
                        }
                    }
                    
                    // Format the comparative results
                    const formattedResults = formatMeasurementResults(
                        measurementType,
                        rawMeasurements,
                        true // indicate this is a comparative analysis
                    );
                    
                    return {
                        code: RESULT_CODE.SUCCESS,
                        message: `Completed comparative ${measurementType} measurements for ${targets.join(', ')}`,
                        data: formattedResults
                    };
                } else {
                    // For single target queries, just run one measurement
                    const target = parsedQuery.targets[0];
                    const measurementType = parsedQuery.measurementType;
                    
                    console.error(`[Natural Language Tool] Running ${measurementType} measurement for: ${target}`);
                    
                    try {
                        // Create the measurement
                        const measurementParams = {
                            type: measurementType,
                            target: target,
                            locations: locationsWithDefaults,
                            measurementOptions: parsedQuery.options
                        };
                        
                        let measurement;
                        let measurementResult;
                        
                        try {
                            measurement = await createMeasurement(measurementParams, apiToken);
                            console.error(`[Natural Language Tool] Created measurement ${measurement.id} for ${target}`);
                            
                            // Poll until the measurement is complete
                            measurementResult = await pollMeasurementResults(measurement.id, apiToken);
                        } catch (error) {
                            // If this is an HTTP measurement and the error appears to be related to URL formatting,
                            // try again with explicit https:// prefix
                            if (measurementType === 'http' && 
                                error instanceof Error && 
                                (error.message.includes('Invalid URL') || error.message.includes('validation')) &&
                                !target.startsWith('http')) {
                                
                                const httpsTarget = `https://${target}`;
                                console.error(`[Natural Language Tool] Retrying with HTTPS prefix: ${httpsTarget}`);
                                
                                const retryParams = {
                                    ...measurementParams,
                                    target: httpsTarget
                                };
                                
                                measurement = await createMeasurement(retryParams, apiToken);
                                console.error(`[Natural Language Tool] Created measurement ${measurement.id} for ${httpsTarget}`);
                                
                                measurementResult = await pollMeasurementResults(measurement.id, apiToken);
                                
                                // Update the target to the HTTPS version
                                measurementParams.target = httpsTarget;
                            } else {
                                throw error;
                            }
                        }
                        
                        // Format the results
                        const formattedResults = formatMeasurementResults(
                            measurementType,
                            [{
                                target,
                                result: measurementResult
                            }],
                            false // not a comparative analysis
                        );
                        
                        return {
                            code: RESULT_CODE.SUCCESS,
                            message: `Completed ${measurementType} measurement for ${target}`,
                            data: formattedResults
                        };
                    } catch (error) {
                        return handleMeasurementError(error, target);
                    }
                }
            } catch (error) {
                return handleMeasurementError(error);
            }
        }
    );
}
