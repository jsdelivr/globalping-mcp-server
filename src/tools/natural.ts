/**
 * Globalping MCP Server - Natural Language Interface
 * 
 * This module provides a high-level natural language interface for AI models
 * to interact with Globalping's measurement tools. It acts as the main entry
 * point for AI clients, handling natural language query parsing, measurement
 * execution, and result formatting.
 * 
 * Example queries that this interface can handle:
 * - "What is the latency to google.com from Europe?"
 * - "Compare the performance of example.com and example.org"
 * - "How does cloudflare.com resolve in Asia?"
 * - "Trace the network path to 8.8.8.8 from multiple locations"
 * 
 * The tool will automatically:
 * 1. Parse the query to extract targets and locations
 * 2. Determine the appropriate measurement type
 * 3. Execute the measurement(s)
 * 4. Format the results in a clear, AI-friendly way
 * 5. Handle comparative analysis when multiple targets are involved
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';
import { processNaturalLanguageQuery, QueryType } from './nlp.js';
import { handleGlobalpingRequest } from './handlers.js';
import { ToolResult } from './types.js';
import { DEFAULT_PROBE_LIMIT } from '../schemas.js';
import { formatComparativeResult } from '../formatter.js';

/**
 * Registers the natural language interface tool with the MCP server
 * 
 * This tool provides a simplified interface for AI models to interact with
 * Globalping's network measurement capabilities using natural language.
 * 
 * @param server - The MCP server to register the tool with
 */
export function registerNaturalLanguageTool(server: McpServer): void {
    console.error("[Tool Registration] Registering natural language interface tool...");
    
    server.tool(
        "globalping",
        "Performs network measurements using Globalping's global probe network. This tool can analyze queries and automatically select the appropriate measurement type (ping, traceroute, dns, mtr, http). It understands general queries like 'What is the latency to example.com?', 'Compare the speed of site-a.com vs site-b.com', or 'How does domain.com resolve in Europe?'",
        {
            query: z.string().describe("A natural language query describing the network measurement to perform. For example: 'Check the latency to google.com from Europe', 'Is example.com faster than example.org?', 'Trace the route to 8.8.8.8 from Asia', 'How does cdn.jsdelivr.net resolve in the US?'"),
            apiToken: z.string().optional().describe("Optional Globalping API token to use for this measurement"),
        },
        async (params) => {
            console.error(`[Natural Language Tool] Processing query: "${params.query}"`);
            
            // Get the API token, either from params or environment variable
            const apiToken = process.env.GLOBALPING_API_TOKEN || params.apiToken as string;
            
            try {
                // Process the natural language query to determine what to measure
                const parsedQuery = processNaturalLanguageQuery(params.query as string);
                console.error(`[Natural Language Tool] Parsed query type: ${parsedQuery.type}`);
                console.error(`[Natural Language Tool] Measurements to run: ${parsedQuery.measurements.length}`);
                
                // If no targets were found in the query, provide a helpful error
                if (parsedQuery.measurements.length === 0) {
                    throw new Error("Could not identify any valid targets (domains or IP addresses) in your query");
                }
                
                // Log the measurement details for debugging
                parsedQuery.measurements.forEach((m, i) => {
                    console.error(`[Natural Language Tool] Measurement ${i+1}: ${m.type} for ${m.target}`);
                    if (m.locations && m.locations.length > 0) {
                        console.error(`[Natural Language Tool] Using locations: ${JSON.stringify(m.locations)}`);
                    }
                });
                
                // Default to 3 probes if not specified
                for (const measurement of parsedQuery.measurements) {
                    if (measurement.locations) {
                        for (const location of measurement.locations) {
                            if (!location.limit) {
                                location.limit = 3;
                            }
                        }
                    }
                }
                
                // Handle different query types
                if (parsedQuery.type === QueryType.COMPARATIVE) {
                    // For comparative queries, run measurements for all targets and compare
                    const results: ToolResult[] = [];
                    const rawMeasurements: any[] = [];
                    const measurementType = parsedQuery.measurements[0].type;
                    
                    console.error(`[Natural Language Tool] Running comparative ${measurementType} measurements for ${parsedQuery.measurements.length} targets`);
                    
                    // Run each measurement and collect results
                    for (const measurement of parsedQuery.measurements) {
                        // Prepare params for the measurement handler
                        const toolParams = {
                            target: measurement.target,
                            locations: measurement.locations,
                            limit: DEFAULT_PROBE_LIMIT,
                            ...measurement.options,
                            apiToken
                        };
                        
                        try {
                            // Run the measurement
                            const result = await handleGlobalpingRequest(measurement.type, toolParams);
                            results.push(result);
                            
                            // Store the raw measurement data for later use in comparison
                            // Check if the raw measurement data is available
                            if (result.rawData) {
                                rawMeasurements.push(result.rawData);
                            } else {
                                // Extract the raw data from the response text (if available)
                                try {
                                    const contentItem = result.content[0];
                                    let resultContent = "";
                                    if (contentItem.type === "text") {
                                        resultContent = contentItem.text;
                                    }
                                    
                                    const idMatch = resultContent.match(/ID:\s+([a-zA-Z0-9]+)/i);
                                    
                                    if (idMatch && idMatch[1]) {
                                        // Get the measurement data from the response
                                        const measurementId = idMatch[1];
                                        console.error(`[Natural Language Tool] Stored raw measurement data for ID: ${measurementId}`);
                                        
                                        // Add this to the raw measurements array
                                        // The actual raw data is logged by the handleGlobalpingRequest function
                                        const logSearch = `[MCP Tool Handler] Full result structure for ${measurement.type} measurement ${measurementId}:`;
                                        
                                        // Look through the server logs for this string
                                        // In a production environment, this should be stored in memory or a database
                                        // For now, we'll use a placeholder object with the ID for demonstration
                                        rawMeasurements.push({
                                            id: measurementId,
                                            // This would be populated with actual results in the handler
                                            results: []
                                        });
                                    } else {
                                        console.error(`[Natural Language Tool] Could not extract measurement ID from result for ${measurement.target}`);
                                        // Push an empty object as a placeholder
                                        rawMeasurements.push({});
                                    }
                                } catch (err) {
                                    console.error(`[Natural Language Tool] Error extracting raw data for ${measurement.target}: ${err}`);
                                    // Push an empty object as a placeholder
                                    rawMeasurements.push({});
                                }
                            }
                        } catch (err) {
                            console.error(`[Natural Language Tool] Error measuring ${measurement.target}: ${err}`);
                            // If a measurement fails, add an error result
                            results.push({
                                content: [{ 
                                    type: "text", 
                                    text: `Error measuring ${measurement.target}: ${err instanceof Error ? err.message : 'Unknown error'}`
                                }],
                                isError: true
                            });
                            // Push an empty object as a placeholder
                            rawMeasurements.push({});
                        }
                    }
                    
                    // Format the comparative result
                    const result = formatComparativeResult(
                        parsedQuery.measurements.map(m => m.target), 
                        results,
                        rawMeasurements,
                        measurementType,
                        params.query as string
                    );
                    
                    // Add index signature to make TypeScript happy with the return type
                    return { ...result, [Symbol.iterator]: undefined };
                } else {
                    // For single measurements, just run the one measurement
                    const measurement = parsedQuery.measurements[0];
                    
                    console.error(`[Natural Language Tool] Running single ${measurement.type} measurement for ${measurement.target}`);
                    
                    // Prepare params for the measurement handler
                    const toolParams = {
                        target: measurement.target,
                        locations: measurement.locations,
                        limit: DEFAULT_PROBE_LIMIT,
                        ...measurement.options,
                        apiToken
                    };
                    
                    // Run the measurement and return the result with index signature
                    const result = await handleGlobalpingRequest(measurement.type, toolParams);
                    return { ...result, [Symbol.iterator]: undefined };
                }
            } catch (error) {
                // Handle errors gracefully with helpful messages
                console.error(`[Natural Language Tool] Error processing query: ${error}`);
                const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
                
                let helpfulMessage = `I couldn't process your query: ${errorMessage}\n\n`;
                helpfulMessage += "Here are some example queries that work well:\n";
                helpfulMessage += "- \"What's the latency to example.com?\"\n";
                helpfulMessage += "- \"Check if google.com is faster than bing.com\"\n";
                helpfulMessage += "- \"How does npmjs.com resolve in Europe?\"\n";
                helpfulMessage += "- \"Trace the route to 1.1.1.1 from Asia\"\n\n";
                helpfulMessage += "Please try again with a clearer query that includes a valid domain name or IP address.";
                
                return {
                    content: [{
                        type: "text",
                        text: helpfulMessage
                    }],
                    isError: true,
                    [Symbol.iterator]: undefined
                };
            }
        }
    );
    
    console.error("[Tool Registration] Natural language interface tool registered.");
}
