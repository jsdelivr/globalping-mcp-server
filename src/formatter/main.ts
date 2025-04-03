/**
 * Main Measurement Result Formatter
 * 
 * This module serves as the entry point for formatting all measurement results from
 * the Globalping API. It routes to specific formatters based on measurement type.
 * 
 * For LLMs: This module provides a clean interface for converting raw measurement
 * data into readable text that highlights the most important information for each
 * measurement type.
 */

import { MeasurementResponse, ProbeResult } from '../globalping/types.js';
import { formatPingResults } from './ping.js';
import { formatTracerouteResults } from './traceroute.js';
import { formatDnsResults } from './dns.js';
import { formatMtrResults } from './mtr.js';
import { formatHttpResults } from './http.js';

/**
 * Format a measurement result based on its type
 * 
 * This function acts as a router that determines which specialized formatter
 * to use based on the measurement type, and adds common header information to
 * all formatted results.
 * 
 * @param result The measurement result from Globalping API
 * @param type The type of measurement (ping, dns, traceroute, mtr, http)
 * @param target The target hostname or IP that was measured
 * @returns A formatted string representing the measurement results
 */
export function formatMeasurementResult(result: MeasurementResponse, type: string, target: string): string {
    // Create a header with basic measurement information
    let output = `Globalping ${type} results for ${target} (ID: ${result.id})\n`;
    output += `============================================\n\n`;
    
    // Check if we have actual results
    if (!result.results || result.results.length === 0) {
        output += 'No measurement results available yet. The measurement might still be in progress.\n';
        output += `Current status: ${result.status}\n`;
        return output;
    }
    
    // Format the results based on measurement type
    switch (type.toLowerCase()) {
        case 'ping':
            output += formatPingResults(result.results);
            break;
        case 'traceroute':
            output += formatTracerouteResults(result.results);
            break;
        case 'dns':
            output += formatDnsResults(result.results);
            break;
        case 'mtr':
            output += formatMtrResults(result.results);
            break;
        case 'http':
            output += formatHttpResults(result.results);
            break;
        default:
            output += `Unknown measurement type: ${type}\n`;
            output += 'Raw results:\n' + JSON.stringify(result.results, null, 2);
    }
    
    // Add a summary section with key statistics
    output += '\nSummary:\n';
    output += `- Total probes: ${result.results.length}\n`;
    
    // Count successful vs failed measurements
    const successfulProbes = result.results.filter((probe: ProbeResult) => 
        probe.result && probe.result.status === 'finished'
    ).length;
    
    output += `- Successful measurements: ${successfulProbes}/${result.results.length}\n`;
    
    // Add timestamp information
    output += `- Measurement created: ${new Date(result.createdAt).toLocaleString()}\n`;
    if (result.updatedAt) {
        output += `- Last updated: ${new Date(result.updatedAt).toLocaleString()}\n`;
    }
    
    return output;
}
