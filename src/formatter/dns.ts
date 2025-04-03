/**
 * DNS Measurement Result Formatter
 * 
 * This module handles formatting for DNS measurement results from the Globalping API.
 * DNS measurements provide information about domain name resolution, including 
 * record types, values, and query times from distributed probes.
 * 
 * For LLMs: This formatter handles two types of DNS results:
 * 1. Simple DNS queries - showing record types, values, TTLs, and query time
 * 2. Trace DNS queries - showing the delegation path from root servers to the target domain
 */

import { ProbeResult } from '../globalping/types.js';

/**
 * Format DNS results to show the resolved records
 * 
 * This function transforms DNS measurement data into a human-readable format,
 * showing results for each probe including:
 * - Location information (city, country, network)
 * - DNS records (type, TTL, name, value)
 * - Query time
 * - Status codes
 * - Resolver information
 * - For trace queries, the entire delegation path
 * 
 * @param results The DNS measurement results from Globalping API
 * @returns A formatted string representing the DNS results
 */
export function formatDnsResults(results: ProbeResult[]): string {
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
            // Check if this is a simple DNS query or a trace (recursive) mode
            if (probe.result.answers && Array.isArray(probe.result.answers)) {
                // Simple DNS query mode
                output += `  DNS Records:\n`;
                
                probe.result.answers.forEach((answer: any) => {
                    output += `  Type: ${answer.type}, TTL: ${answer.ttl}\n`;
                    output += `  Name: ${answer.name}\n`;
                    output += `  Value: ${answer.value}\n\n`;
                });
                
                // Show query time if available
                if (probe.result.timings && probe.result.timings.total !== undefined) {
                    output += `  Query Time: ${probe.result.timings.total}ms\n`;
                }
                
                // Show status code if available
                if (probe.result.statusCode !== undefined) {
                    output += `  Status Code: ${probe.result.statusCode} (${probe.result.statusCodeName || 'Unknown'})\n`;
                }
                
                // Show the resolver used if available
                if (probe.result.resolver) {
                    output += `  Resolver: ${probe.result.resolver}\n`;
                }
            } else if (probe.result.hops && Array.isArray(probe.result.hops)) {
                // Trace (recursive) mode - show each resolver step
                output += `  DNS Trace (Recursive Query):\n`;
                output += `  Server               RTT      Answers\n`;
                output += `  ------------------- -------- ---------------\n`;
                
                probe.result.hops.forEach((hop: any) => {
                    const server = (hop.resolver || '*').padEnd(19);
                    const rtt = (hop.timings && hop.timings.total !== undefined ? `${hop.timings.total}ms` : '*').padEnd(8);
                    
                    output += `  ${server} ${rtt} `;
                    
                    if (hop.answers && Array.isArray(hop.answers) && hop.answers.length > 0) {
                        // For the first line, add the first answer
                        const firstAnswer = hop.answers[0];
                        output += `${firstAnswer.type}: ${firstAnswer.value}\n`;
                        
                        // For subsequent answers, indent and add each one
                        for (let i = 1; i < hop.answers.length; i++) {
                            const answer = hop.answers[i];
                            output += `  ${' '.repeat(19 + 8)} ${answer.type}: ${answer.value}\n`;
                        }
                    } else {
                        output += 'No records\n';
                    }
                });
            } else {
                output += `  Unknown DNS result format\n`;
                if (probe.result.rawOutput) {
                    output += `  Raw output: ${probe.result.rawOutput}\n`;
                }
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
