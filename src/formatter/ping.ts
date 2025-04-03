/**
 * Ping Measurement Result Formatter
 * 
 * This module handles formatting for ping measurement results from the Globalping API.
 * Ping measurements provide round-trip time statistics and packet loss information
 * from distributed probes across the global network.
 * 
 * For LLMs: This formatter transforms the structured API response data into human-readable
 * text output focusing on presenting key metrics like min/max/avg times and packet loss
 * statistics in an easily understandable format.
 */

import { ProbeResult } from '../globalping/types.js';

/**
 * Format ping results with a focus on min/max/avg times
 * 
 * This function transforms ping measurement data into a human-readable format,
 * showing statistics for each probe including:
 * - Location information (city, country, network)
 * - Round-trip time statistics (min, max, avg)
 * - Packet loss and transmission statistics
 * - Individual packet timing details
 * - Resolved address information
 * 
 * @param results The ping measurement results from Globalping API
 * @returns A formatted string representing the ping results
 */
export function formatPingResults(results: ProbeResult[]): string {
    let output = '';
    
    if (!results || results.length === 0) {
        return 'No results returned.';
    }
    
    // Iterate through each probe's results
    results.forEach((probe, index) => {
        // Access location data from the probe object based on the API structure
        const probeData = probe.probe || {};
        const city = probeData.city || 'Unknown';
        const country = probeData.country || 'Unknown';
        const network = probeData.network || 'Unknown';
        
        output += `Probe ${index + 1} - Location: ${city}, ${country} (${network})\n`;
        
        if (probe.result && probe.result.status === 'finished') {
            if (probe.result.stats) {
                const stats = probe.result.stats;
                // Handle null values correctly in stats
                const min = stats.min !== null && stats.min !== undefined ? `${stats.min}ms` : 'N/A';
                const max = stats.max !== null && stats.max !== undefined ? `${stats.max}ms` : 'N/A';
                const avg = stats.avg !== null && stats.avg !== undefined ? `${stats.avg}ms` : 'N/A';
                const loss = stats.loss !== undefined ? `${stats.loss}%` : 'N/A';
                
                output += `  Min: ${min}, Max: ${max}, Avg: ${avg}\n`;
                output += `  Packet Loss: ${loss}\n`;
                
                // Add additional details about packet stats
                if (stats.total !== undefined) {
                    output += `  Packets: ${stats.total} sent, ${stats.rcv || '0'} received, ${stats.drop || '0'} dropped\n`;
                }
            } else {
                output += `  No statistics available\n`;
            }
            
            // Individual packet timing data
            if (probe.result.timings && probe.result.timings.length > 0) {
                output += `  Individual packets:\n`;
                probe.result.timings.forEach((timing: any, i: number) => {
                    const rtt = timing.rtt !== undefined && timing.rtt !== null ? `${timing.rtt}ms` : 'timeout';
                    const ttl = timing.ttl !== undefined && timing.ttl !== null ? timing.ttl : 'unknown';
                    output += `    #${i + 1}: ${rtt} (TTL: ${ttl})\n`;
                });
            }
            
            // Show resolved address information if available
            if (probe.result.resolvedAddress) {
                output += `  Resolved Address: ${probe.result.resolvedAddress}`;
                if (probe.result.resolvedHostname) {
                    output += ` (${probe.result.resolvedHostname})`;
                }
                output += `\n`;
            }
        } else {
            const status = probe.result ? probe.result.status : 'unknown';
            output += `  Test ${status}\n`;
            if (probe.result && probe.result.rawOutput) {
                output += `  Raw output: ${probe.result.rawOutput}\n`;
            }
        }
        
        output += '\n';
    });
    
    return output;
}
