/**
 * MTR (My Traceroute) Measurement Result Formatter
 * 
 * This module handles formatting for MTR measurement results from the Globalping API.
 * MTR combines ping and traceroute functionality, providing detailed statistics about
 * each hop in the network path, including packet loss, round-trip times, and jitter.
 * 
 * For LLMs: This formatter presents MTR results in a tabular format showing detailed
 * network path statistics with both IP addresses and hostnames when available, making it
 * easier to diagnose network performance issues along the route.
 */

import { ProbeResult } from '../globalping/types.js';

/**
 * Format MTR results combining ping and traceroute statistics
 * 
 * This function transforms MTR measurement data into a human-readable format,
 * showing results for each probe including:
 * - Location information (city, country, network)
 * - For each hop in the path:
 *   - IP address and hostname
 *   - Loss percentage
 *   - Round-trip time stats (min, avg, max, std dev)
 *   - Jitter statistics
 * 
 * @param results The MTR measurement results from Globalping API
 * @returns A formatted string representing the MTR results
 */
export function formatMtrResults(results: ProbeResult[]): string {
    let output = '';
    
    // Process each probe's results
    results.forEach((probe: ProbeResult, index: number) => {
        // Add a separator between probes
        if (index > 0) {
            output += '\n' + '-'.repeat(80) + '\n\n';
        }
        
        // Probe location information
        output += `Probe ${index + 1}: `;
        
        // Add location details if available
        if (probe.probe) {
            const locationParts = [];
            
            if (probe.probe.city) {
                locationParts.push(probe.probe.city);
            }
            
            if (probe.probe.country) {
                locationParts.push(probe.probe.country);
            }
            
            if (probe.probe.network) {
                locationParts.push(`AS${probe.probe.network}`);
            }
            
            output += locationParts.join(', ') + '\n\n';
        } else {
            output += 'Location unknown\n\n';
        }
        
        // Process the MTR results if available and finished
        if (probe.result && probe.result.status === 'finished') {
            
            // Display the MTR hops with statistics
            if (probe.result.hops && Array.isArray(probe.result.hops)) {
                output += `  Hop  IP Address           Hostname                 Loss%  RTT Min/Avg/Max/StdDev    Jitter Min/Avg/Max\n`;
                output += `  ---- -------------------- ------------------------ ----- ----------------------- --------------------\n`;
                
                probe.result.hops.forEach((hop: any, hopIndex: number) => {
                    // Format the hop number (padded to 4 characters)
                    const hopNum = `${hopIndex + 1}`.padEnd(4);
                    
                    // Format the IP address (padded to 20 characters)
                    const ipAddr = (hop.resolvedAddress || '*').padEnd(20);
                    
                    // Format the hostname (padded to 24 characters)
                    const hostname = (hop.resolvedHostname || '').padEnd(24);
                    
                    // Format the loss percentage (padded to 5 characters)
                    let loss = '';
                    if (typeof hop.loss === 'number') {
                        loss = `${hop.loss.toFixed(1)}%`.padEnd(5);
                    } else {
                        loss = 'N/A  ';
                    }
                    
                    // Format RTT statistics (min/avg/max/stddev)
                    let rttStats = '';
                    if (hop.statistics && typeof hop.statistics.rtt === 'object') {
                        const rtt = hop.statistics.rtt;
                        
                        // Format RTT values with proper unit (ms) and padding
                        const min = typeof rtt.min === 'number' ? `${rtt.min.toFixed(1)}ms` : 'N/A';
                        const avg = typeof rtt.avg === 'number' ? `${rtt.avg.toFixed(1)}ms` : 'N/A';
                        const max = typeof rtt.max === 'number' ? `${rtt.max.toFixed(1)}ms` : 'N/A';
                        const stdDev = typeof rtt.stddev === 'number' ? `${rtt.stddev.toFixed(1)}ms` : 'N/A';
                        
                        rttStats = `${min}/${avg}/${max}/${stdDev}`.padEnd(25);
                    } else {
                        rttStats = 'N/A'.padEnd(25);
                    }
                    
                    // Format jitter statistics (min/avg/max)
                    let jitterStats = '';
                    if (hop.statistics && typeof hop.statistics.jitter === 'object') {
                        const jitter = hop.statistics.jitter;
                        
                        // Format jitter values with proper unit (ms) and padding
                        const min = typeof jitter.min === 'number' ? `${jitter.min.toFixed(1)}ms` : 'N/A';
                        const avg = typeof jitter.avg === 'number' ? `${jitter.avg.toFixed(1)}ms` : 'N/A';
                        const max = typeof jitter.max === 'number' ? `${jitter.max.toFixed(1)}ms` : 'N/A';
                        
                        jitterStats = `${min}/${avg}/${max}`;
                    } else {
                        jitterStats = 'N/A';
                    }
                    
                    output += `  ${hopNum} ${ipAddr} ${hostname} ${loss} ${rttStats} ${jitterStats}\n`;
                });
                
                // Add ASN information if available
                probe.result.hops.forEach((hop: any, hopIndex: number) => {
                    if (hop.asn && hop.asn.length > 0) {
                        output += `  Hop ${hopIndex + 1} ASN: ${hop.asn.join(', ')}\n`;
                    }
                });
            } else {
                output += `  No hop information available\n`;
            }
        } else {
            const status = probe.result ? probe.result.status : 'unknown';
            output += `  Test ${status}\n`;
        }
    });
    
    return output;
}
