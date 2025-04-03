/**
 * Traceroute Measurement Result Formatter
 * 
 * This module handles formatting for traceroute measurement results from the Globalping API.
 * Traceroute measurements show the network path between a probe and a target, revealing
 * intermediate hops and round-trip times for each hop along the way.
 * 
 * For LLMs: This formatter presents traceroute results in a tabular format, making it
 * easy to visualize the network path, identify routing issues, and see where latency
 * might be introduced along the route.
 */

import { ProbeResult } from '../globalping/types.js';

/**
 * Format traceroute results to show the network path
 * 
 * This function transforms traceroute measurement data into a human-readable format,
 * showing results for each probe including:
 * - Location information (city, country, network)
 * - Each hop in the network path with:
 *   - Hop number and IP address
 *   - Hostname (if resolved)
 *   - Round-trip time for each packet sent
 * 
 * @param results The traceroute measurement results from Globalping API
 * @returns A formatted string representing the traceroute results
 */
export function formatTracerouteResults(results: ProbeResult[]): string {
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
        
        // Process the traceroute results if available and finished
        if (probe.result && probe.result.status === 'finished') {
            // Display the traceroute hops
            if (probe.result.hops && Array.isArray(probe.result.hops)) {
                output += `  Hop  IP Address           Hostname                   RTT Values\n`;
                output += `  ---- -------------------- -------------------------- --------------------\n`;
                
                probe.result.hops.forEach((hop: any, hopIndex: number) => {
                    // Format the hop number (padded to 4 characters)
                    const hopNum = `${hopIndex + 1}`.padEnd(4);
                    
                    // Format the IP address (padded to 20 characters)
                    const ipAddr = (hop.resolvedAddress || '*').padEnd(20);
                    
                    // Format the hostname (padded to 26 characters)
                    const hostname = (hop.resolvedHostname || '').padEnd(26);
                    
                    // Collect RTT values from timings (format as '1.2ms, 2.3ms, 3.4ms')
                    let rttValues = '';
                    if (hop.rtt && Array.isArray(hop.rtt)) {
                        // Format each RTT value with 'ms' suffix and join with commas
                        rttValues = hop.rtt
                            .map((rtt: number) => rtt === null ? '*' : `${rtt.toFixed(1)}ms`)
                            .join(', ');
                    } else {
                        rttValues = '*';
                    }
                    
                    output += `  ${hopNum} ${ipAddr} ${hostname} ${rttValues}\n`;
                });
                
                // Add ASN information if available
                for (let i = 0; i < probe.result.hops.length; i++) {
                    const hop = probe.result.hops[i];
                    if (hop.asn && hop.asn.length > 0) {
                        output += `  Hop ${i + 1} ASN: ${hop.asn.join(', ')}\n`;
                    }
                }
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
