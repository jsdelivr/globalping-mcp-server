/**
 * Globalping MCP Server Result Formatters
 * 
 * This file contains the formatting functions for Globalping measurement results.
 * It provides functions to convert raw API responses into human-readable text formats.
 */

import { MeasurementResult } from './globalping/api.js';
import { ToolResult } from './tools/types.js';

/**
 * Formats the measurement result based on the type of measurement
 * @param result The measurement result from the Globalping API
 * @param type The type of measurement (ping, traceroute, etc.)
 * @param target The target of the measurement
 * @returns A formatted string representation of the result
 */
export function formatMeasurementResult(result: MeasurementResult, type: string, target: string): string {
    // Header with basic info
    let output = `Globalping ${type} results for ${target} (ID: ${result.id})\n`;
    output += `Status: ${result.status}\n`;
    output += `Created: ${result.createdAt}\n`;
    output += `Updated: ${result.updatedAt}\n`;
    output += `Probes: ${result.probesCount}\n\n`;
    
    // Customize the output based on the measurement type
    switch (type) {
        case 'ping':
            // For ping, highlight min/max/avg times
            output += formatPingResults(result.results);
            break;
        case 'traceroute':
            // For traceroute, show the path and hop details
            output += formatTracerouteResults(result.results);
            break;
        case 'dns':
            // For DNS, show the resolved records
            output += formatDnsResults(result.results);
            break;
        case 'mtr':
            // For MTR, show the combined ping and traceroute statistics
            output += formatMtrResults(result.results);
            break;
        case 'http':
            // For HTTP, show status codes and timing information
            output += formatHttpResults(result.results);
            break;
        default:
            // Default case - just stringify the results
            output += JSON.stringify(result.results, null, 2);
    }
    
    return output;
}

/**
 * Format ping results with a focus on min/max/avg times
 * 
 * @param results The ping measurement results from Globalping API
 * @returns A formatted string representing the ping results
 */
export function formatPingResults(results: any[]): string {
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

/**
 * Format DNS results to show the resolved records
 */
export function formatDnsResults(results: any[]): string {
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
                output += `  No DNS records available\n`;
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

/**
 * Format traceroute results to show the network path
 */
export function formatTracerouteResults(results: any[]): string {
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
            if (probe.result.hops && Array.isArray(probe.result.hops)) {
                output += `  Hop  IP Address        RTT     Hostname\n`;
                output += `  ---- ---------------- ------- -----------------------------\n`;
                
                probe.result.hops.forEach((hop: any, hopIndex: number) => {
                    const hopNum = (hopIndex + 1).toString().padEnd(4);
                    const ip = (hop.resolvedAddress || '*').padEnd(16);
                    
                    // Get RTT from the timings array if available
                    let rttValue = '*';
                    if (hop.timings && hop.timings.length > 0 && hop.timings[0].rtt !== undefined) {
                        rttValue = `${hop.timings[0].rtt}ms`;
                    }
                    const rtt = rttValue.padEnd(7);
                    
                    const hostname = hop.resolvedHostname || '';
                    
                    output += `  ${hopNum} ${ip} ${rtt} ${hostname}\n`;
                });
                
                // If we have ASPath information, display it
                if (probe.result.asPath && Array.isArray(probe.result.asPath)) {
                    output += `\n  AS Path: `;
                    probe.result.asPath.forEach((asInfo: any, i: number) => {
                        if (i > 0) output += " → ";
                        output += `AS${asInfo.asn} (${asInfo.name || 'Unknown'})`;
                    });
                    output += '\n';
                }
            } else {
                output += `  No hop information available\n`;
            }
            
            // Show resolved target information if available
            if (probe.result.resolvedAddress) {
                output += `  Resolved Target Address: ${probe.result.resolvedAddress}`;
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

/**
 * Format MTR results combining ping and traceroute statistics
 */
export function formatMtrResults(results: any[]): string {
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
            if (probe.result.hops && Array.isArray(probe.result.hops)) {
                output += `  Hop  IP Address        Loss%   Sent  Recv  Best  Avg   Worst  StdDev\n`;
                output += `  ---- ---------------- ------ ----- ----- ----- ----- ----- -------\n`;
                
                probe.result.hops.forEach((hop: any, hopIndex: number) => {
                    const hopNum = (hopIndex + 1).toString().padEnd(4);
                    const ip = (hop.resolvedAddress || '*').padEnd(16);
                    
                    // Stats fields from the API response
                    const stats = hop.stats || {};
                    const loss = (stats.loss !== undefined ? `${stats.loss}%` : '*').padEnd(6);
                    const sent = (stats.total || '*').toString().padEnd(5);
                    const recv = (stats.rcv || '*').toString().padEnd(5);
                    const best = (stats.min !== undefined ? `${stats.min}ms` : '*').padEnd(5);
                    const avg = (stats.avg !== undefined ? `${stats.avg}ms` : '*').padEnd(5);
                    const worst = (stats.max !== undefined ? `${stats.max}ms` : '*').padEnd(5);
                    const stdDev = (stats.stDev !== undefined ? `${stats.stDev}ms` : '*').padEnd(7);
                    
                    output += `  ${hopNum} ${ip} ${loss} ${sent} ${recv} ${best} ${avg} ${worst} ${stdDev}\n`;
                });
                
                // Show ASN information if available
                probe.result.hops.forEach((hop: any, hopIndex: number) => {
                    if (hop.asn && hop.asn.length > 0) {
                        output += `  Hop ${hopIndex + 1} ASN: `;
                        hop.asn.forEach((asn: number, i: number) => {
                            if (i > 0) output += ", ";
                            output += `AS${asn}`;
                        });
                        output += '\n';
                    }
                });
            } else {
                output += `  No hop information available\n`;
            }
            
            // Show resolved address information if available
            if (probe.result.resolvedAddress) {
                output += `  Resolved Target Address: ${probe.result.resolvedAddress}`;
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

/**
 * Format HTTP results to show status codes and response timing
 */
export function formatHttpResults(results: any[]): string {
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
            const statusCode = probe.result.statusCode || 'Unknown';
            const statusCodeName = probe.result.statusCodeName || '';
            
            output += `  Status Code: ${statusCode} ${statusCodeName ? `(${statusCodeName})` : ''}\n`;
            
            // Output timings with correct field names from the API structure
            if (probe.result.timings) {
                output += `  Timing Details:\n`;
                output += `    Total: ${probe.result.timings.total || 0}ms\n`;
                
                if (probe.result.timings.dns !== undefined) {
                    output += `    DNS Lookup: ${probe.result.timings.dns}ms\n`;
                }
                
                if (probe.result.timings.tcp !== undefined) {
                    output += `    TCP Connection: ${probe.result.timings.tcp}ms\n`;
                }
                
                if (probe.result.timings.tls !== undefined) {
                    output += `    TLS Handshake: ${probe.result.timings.tls}ms\n`;
                }
                
                if (probe.result.timings.firstByte !== undefined) {
                    output += `    Time to First Byte: ${probe.result.timings.firstByte}ms\n`;
                }
                
                if (probe.result.timings.download !== undefined) {
                    output += `    Download: ${probe.result.timings.download}ms\n`;
                }
            }
            
            // Show TLS certificate information if available
            if (probe.result.tls) {
                output += `  TLS Information:\n`;
                output += `    Protocol: ${probe.result.tls.protocol || 'Unknown'}\n`;
                output += `    Cipher: ${probe.result.tls.cipherName || 'Unknown'}\n`;
                output += `    Certificate Authorized: ${probe.result.tls.authorized ? 'Yes' : 'No'}\n`;
                
                if (probe.result.tls.error) {
                    output += `    TLS Error: ${probe.result.tls.error}\n`;
                }
                
                // Format certificate dates
                if (probe.result.tls.createdAt && probe.result.tls.expiresAt) {
                    output += `    Created: ${probe.result.tls.createdAt}\n`;
                    output += `    Expires: ${probe.result.tls.expiresAt}\n`;
                }
                
                // Certificate details
                if (probe.result.tls.subject) {
                    output += `    Subject: `;
                    if (probe.result.tls.subject.CN) {
                        output += `CN=${probe.result.tls.subject.CN}`;
                    }
                    if (probe.result.tls.subject.alt) {
                        output += `, alt=${probe.result.tls.subject.alt}`;
                    }
                    output += `\n`;
                }
                
                if (probe.result.tls.issuer) {
                    output += `    Issuer: `;
                    const issuerParts = [];
                    if (probe.result.tls.issuer.C) issuerParts.push(`C=${probe.result.tls.issuer.C}`);
                    if (probe.result.tls.issuer.O) issuerParts.push(`O=${probe.result.tls.issuer.O}`);
                    if (probe.result.tls.issuer.CN) issuerParts.push(`CN=${probe.result.tls.issuer.CN}`);
                    output += issuerParts.join(', ');
                    output += `\n`;
                }
                
                if (probe.result.tls.keyType) {
                    output += `    Key Type: ${probe.result.tls.keyType} (${probe.result.tls.keyBits || 'Unknown'} bits)\n`;
                }
            }
            
            // Output headers if available
            if (probe.result.headers && Object.keys(probe.result.headers).length > 0) {
                output += `  Response Headers:\n`;
                for (const [key, value] of Object.entries(probe.result.headers)) {
                    output += `    ${key}: ${value}\n`;
                }
            }
            
            // Show resolved address information if available
            if (probe.result.resolvedAddress) {
                output += `  Resolved Address: ${probe.result.resolvedAddress}\n`;
            }
            
            // Show if the body was truncated
            if (probe.result.truncated) {
                output += `  Note: Response body was truncated due to size constraints\n`;
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

/**
 * Formats results for comparative analysis of multiple targets
 * Used for queries like "Which site is faster?"
 * 
 * @param targets Array of targets that were measured (e.g., domain names)
 * @param results Array of measurement results
 * @param rawMeasurements Array of raw measurement data from Globalping API
 * @param type The measurement type used for all targets
 * @param originalQuery The original query
 * @returns Formatted comparative analysis
 */
export function formatComparativeResult(
    targets: string[],
    results: ToolResult[],
    rawMeasurements: any[],
    type: string,
    originalQuery: string
): ToolResult {
    // Handle errors - if any result has an error, return it
    for (let i = 0; i < results.length; i++) {
        if (results[i].isError) {
            return results[i];
        }
    }

    let analysisText = `## Comparative Analysis: ${targets.join(' vs. ')}\n\n`;
    analysisText += `Query: "${originalQuery}"\n\n`;

    // Create a summary of key metrics based on measurement type
    if (type === 'http') {
        // For HTTP, compare TTFB, total load times, status codes
        analysisText += compareHttpResults(targets, rawMeasurements);
    } else if (type === 'ping') {
        // For ping, compare min/avg/max RTT and packet loss
        analysisText += comparePingResults(targets, results);
    } else if (type === 'dns') {
        // For DNS, compare resolution times and record types
        analysisText += compareDnsResults(targets, results, rawMeasurements);
    } else if (type === 'traceroute') {
        // For traceroute, compare path length, route differences, and RTT
        analysisText += compareTracerouteResults(targets, results, rawMeasurements);
    } else if (type === 'mtr') {
        // For MTR, compare path metrics and packet loss patterns
        analysisText += compareMtrResults(targets, results, rawMeasurements);
    } else {
        // For other types, just present the results side by side
        analysisText += `Detailed comparison not available for ${type} measurements.\n\n`;
        analysisText += `Individual results:\n\n`;
        
        for (let i = 0; i < targets.length; i++) {
            analysisText += `### ${targets[i]}\n`;
            const contentItem = results[i].content[0];
            if (contentItem.type === "text") {
                analysisText += contentItem.text;
            }
            analysisText += '\n\n';
        }
    }

    return {
        content: [{ type: "text", text: analysisText }],
        isError: false
    };
}

/**
 * Compares DNS resolution results between multiple targets
 * 
 * This function analyzes DNS resolution times, record types, and 
 * TTL values to provide insights into comparative resolution performance.
 * 
 * @param targets Array of domain names that were measured
 * @param results Array of measurement tool results
 * @param rawMeasurements Array of raw measurement data from Globalping API
 * @returns Formatted comparison text
 */
function compareDnsResults(
    targets: string[],
    results: ToolResult[],
    rawMeasurements: any[]
): string {
    let output = "### DNS Resolution Comparison\n\n";
    
    // Extract average DNS resolution times for each target
    const dnsMetrics: Record<string, { 
        avgTime?: number, 
        recordCount?: number,
        recordTypes?: Set<string>,
        minTtl?: number,
        probeCount?: number
    }> = {};
    
    // Process each target's raw measurements
    for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        const rawData = rawMeasurements[i];
        
        dnsMetrics[target] = { recordTypes: new Set<string>() };
        
        // Skip if no raw data is available
        if (!rawData || !rawData.results || !Array.isArray(rawData.results)) {
            continue;
        }
        
        let totalTime = 0;
        let timeCount = 0;
        let recordCount = 0;
        let minTtl = Infinity;
        
        // Process each probe's results
        for (const probe of rawData.results) {
            if (probe.result && probe.result.status === 'finished') {
                // Track probe count
                dnsMetrics[target].probeCount = (dnsMetrics[target].probeCount || 0) + 1;
                
                // Process DNS answers
                if (probe.result.answers && Array.isArray(probe.result.answers)) {
                    recordCount += probe.result.answers.length;
                    
                    // Track record types and TTL values
                    for (const answer of probe.result.answers) {
                        if (answer.type) {
                            dnsMetrics[target].recordTypes?.add(answer.type);
                        }
                        
                        if (answer.ttl !== undefined && answer.ttl < minTtl) {
                            minTtl = answer.ttl;
                        }
                    }
                }
                
                // Process query time if available
                if (probe.result.timings && probe.result.timings.total !== undefined) {
                    totalTime += probe.result.timings.total;
                    timeCount++;
                }
            }
        }
        
        // Calculate average time if available
        if (timeCount > 0) {
            dnsMetrics[target].avgTime = totalTime / timeCount;
        }
        
        // Store record count and min TTL
        dnsMetrics[target].recordCount = recordCount;
        dnsMetrics[target].minTtl = minTtl !== Infinity ? minTtl : undefined;
    }
    
    // Compare resolution times
    output += "#### DNS Resolution Times\n\n";
    output += "| Target | Avg. Resolution Time | Record Count | Min TTL | Record Types |\n";
    output += "|--------|----------------------|--------------|---------|-------------|\n";
    
    for (const target of targets) {
        const metrics = dnsMetrics[target];
        const avgTime = metrics.avgTime !== undefined ? `${metrics.avgTime.toFixed(2)}ms` : 'N/A';
        const recordCount = metrics.recordCount !== undefined ? metrics.recordCount : 'N/A';
        const minTtl = metrics.minTtl !== undefined ? metrics.minTtl : 'N/A';
        const recordTypes = metrics.recordTypes ? Array.from(metrics.recordTypes).join(', ') : 'N/A';
        
        output += `| ${target} | ${avgTime} | ${recordCount} | ${minTtl} | ${recordTypes} |\n`;
    }
    
    // Add comparative analysis
    output += "\n#### Analysis\n\n";
    
    // Determine the fastest resolving domain
    if (targets.length > 1) {
        const validTargets = targets.filter(t => dnsMetrics[t].avgTime !== undefined);
        
        if (validTargets.length > 1) {
            validTargets.sort((a, b) => {
                const timeA = dnsMetrics[a].avgTime || Infinity;
                const timeB = dnsMetrics[b].avgTime || Infinity;
                return timeA - timeB;
            });
            
            output += `- **${validTargets[0]}** has the fastest average DNS resolution time (${dnsMetrics[validTargets[0]].avgTime?.toFixed(2)}ms).\n`;
            
            // If there's a significant difference (>20% between fastest and slowest), highlight it
            const fastest = dnsMetrics[validTargets[0]].avgTime || 0;
            const slowest = dnsMetrics[validTargets[validTargets.length - 1]].avgTime || 0;
            
            if (fastest > 0 && (slowest - fastest) / fastest > 0.2) {
                output += `- **${validTargets[validTargets.length - 1]}** is approximately ${((slowest / fastest) - 1).toFixed(1)}x slower to resolve.\n`;
            }
        }
    }
    
    // Add individual results for reference
    output += "\n### Individual DNS Results\n\n";
    for (let i = 0; i < targets.length; i++) {
        output += `#### ${targets[i]}\n`;
        const contentItem = results[i].content[0];
        if (contentItem.type === "text") {
            // Extract just the results part to avoid cluttering
            const lines = contentItem.text.split('\n');
            const resultsStart = lines.findIndex(line => line.includes('DNS Records:'));
            if (resultsStart !== -1) {
                output += lines.slice(resultsStart).join('\n');
            } else {
                output += contentItem.text;
            }
        }
        output += '\n\n';
    }
    
    return output;
}

/**
 * Compares traceroute results between multiple targets
 * 
 * This function analyzes network paths, highlighting differences in hop counts,
 * latencies, and route overlaps to provide insights into network routing.
 * 
 * @param targets Array of targets that were measured
 * @param results Array of measurement tool results
 * @param rawMeasurements Array of raw measurement data from Globalping API
 * @returns Formatted comparison text
 */
function compareTracerouteResults(
    targets: string[],
    results: ToolResult[],
    rawMeasurements: any[]
): string {
    let output = "### Traceroute Path Comparison\n\n";
    
    // Extract key metrics for each target
    const pathMetrics: Record<string, { 
        avgHops?: number,
        avgRtt?: number,
        maxRtt?: number,
        unreachable?: number,
        probeCount?: number
    }> = {};
    
    // Process each target's raw measurements
    for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        const rawData = rawMeasurements[i];
        
        pathMetrics[target] = {};
        
        // Skip if no raw data is available
        if (!rawData || !rawData.results || !Array.isArray(rawData.results)) {
            continue;
        }
        
        let totalHops = 0;
        let hopCount = 0;
        let totalEndRtt = 0;
        let endRttCount = 0;
        let maxRtt = 0;
        let unreachableCount = 0;
        
        // Process each probe's results
        for (const probe of rawData.results) {
            if (probe.result && probe.result.status === 'finished') {
                // Track probe count
                pathMetrics[target].probeCount = (pathMetrics[target].probeCount || 0) + 1;
                
                // Process hop data
                if (probe.result.hops && Array.isArray(probe.result.hops)) {
                    const hops = probe.result.hops;
                    totalHops += hops.length;
                    hopCount++;
                    
                    // Check last hop RTT if available
                    const lastHop = hops[hops.length - 1];
                    if (lastHop && lastHop.rtt !== undefined && lastHop.rtt !== null) {
                        totalEndRtt += lastHop.rtt;
                        endRttCount++;
                        
                        if (lastHop.rtt > maxRtt) {
                            maxRtt = lastHop.rtt;
                        }
                    }
                    
                    // Count unreachable hops
                    for (const hop of hops) {
                        if (hop.status === 'unreachable' || (!hop.rtt && hop.status !== 'success')) {
                            unreachableCount++;
                        }
                    }
                }
            }
        }
        
        // Calculate averages
        if (hopCount > 0) {
            pathMetrics[target].avgHops = totalHops / hopCount;
        }
        
        if (endRttCount > 0) {
            pathMetrics[target].avgRtt = totalEndRtt / endRttCount;
        }
        
        // Store max RTT and unreachable counts
        pathMetrics[target].maxRtt = maxRtt || undefined;
        pathMetrics[target].unreachable = unreachableCount;
    }
    
    // Compare path metrics
    output += "#### Network Path Summary\n\n";
    output += "| Target | Avg. Hop Count | Avg. End-to-End RTT | Max RTT | Unreachable Hops |\n";
    output += "|--------|---------------|---------------------|---------|----------------|\n";
    
    for (const target of targets) {
        const metrics = pathMetrics[target];
        const avgHops = metrics.avgHops !== undefined ? metrics.avgHops.toFixed(1) : 'N/A';
        const avgRtt = metrics.avgRtt !== undefined ? `${metrics.avgRtt.toFixed(2)}ms` : 'N/A';
        const maxRtt = metrics.maxRtt !== undefined ? `${metrics.maxRtt.toFixed(2)}ms` : 'N/A';
        const unreachable = metrics.unreachable !== undefined ? metrics.unreachable : 'N/A';
        
        output += `| ${target} | ${avgHops} | ${avgRtt} | ${maxRtt} | ${unreachable} |\n`;
    }
    
    // Add comparative analysis
    output += "\n#### Analysis\n\n";
    
    // Determine the target with the shortest path
    if (targets.length > 1) {
        const validTargets = targets.filter(t => pathMetrics[t].avgHops !== undefined);
        
        if (validTargets.length > 1) {
            validTargets.sort((a, b) => {
                const hopsA = pathMetrics[a].avgHops || Infinity;
                const hopsB = pathMetrics[b].avgHops || Infinity;
                return hopsA - hopsB;
            });
            
            output += `- **${validTargets[0]}** has the shortest average network path (${pathMetrics[validTargets[0]].avgHops?.toFixed(1)} hops).\n`;
            
            // Sort by end-to-end latency
            validTargets.sort((a, b) => {
                const rttA = pathMetrics[a].avgRtt || Infinity;
                const rttB = pathMetrics[b].avgRtt || Infinity;
                return rttA - rttB;
            });
            
            if (pathMetrics[validTargets[0]].avgRtt !== undefined) {
                output += `- **${validTargets[0]}** has the lowest average end-to-end latency (${pathMetrics[validTargets[0]].avgRtt?.toFixed(2)}ms).\n`;
            }
        }
    }
    
    // Add individual results for reference
    output += "\n### Individual Traceroute Results\n\n";
    for (let i = 0; i < targets.length; i++) {
        output += `#### ${targets[i]}\n`;
        const contentItem = results[i].content[0];
        if (contentItem.type === "text") {
            output += contentItem.text;
        }
        output += '\n\n';
    }
    
    return output;
}

/**
 * Compares MTR results between multiple targets
 * 
 * This function analyzes MTR data to compare network path reliability and performance,
 * highlighting differences in packet loss patterns and latency consistency.
 * 
 * @param targets Array of targets that were measured
 * @param results Array of measurement tool results
 * @param rawMeasurements Array of raw measurement data from Globalping API
 * @returns Formatted comparison text
 */
function compareMtrResults(
    targets: string[],
    results: ToolResult[],
    rawMeasurements: any[]
): string {
    let output = "### MTR Path Analysis Comparison\n\n";
    
    // Extract key metrics for each target
    const mtrMetrics: Record<string, { 
        avgLoss?: number,
        worstLoss?: number,
        avgLastHopRtt?: number,
        jitter?: number,
        probeCount?: number
    }> = {};
    
    // Process each target's raw measurements
    for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        const rawData = rawMeasurements[i];
        
        mtrMetrics[target] = {};
        
        // Skip if no raw data is available
        if (!rawData || !rawData.results || !Array.isArray(rawData.results)) {
            continue;
        }
        
        let totalLoss = 0;
        let lossCount = 0;
        let worstLoss = 0;
        let totalLastHopRtt = 0;
        let lastHopRttCount = 0;
        let minRtt = Infinity;
        let maxRtt = 0;
        
        // Process each probe's results
        for (const probe of rawData.results) {
            if (probe.result && probe.result.status === 'finished') {
                // Track probe count
                mtrMetrics[target].probeCount = (mtrMetrics[target].probeCount || 0) + 1;
                
                // Process MTR data
                if (probe.result.hops && Array.isArray(probe.result.hops)) {
                    const hops = probe.result.hops;
                    
                    // Find the worst loss percentage across the path
                    for (const hop of hops) {
                        if (hop.loss !== undefined) {
                            totalLoss += hop.loss;
                            lossCount++;
                            
                            if (hop.loss > worstLoss) {
                                worstLoss = hop.loss;
                            }
                        }
                    }
                    
                    // Check last hop RTT statistics
                    const lastHop = hops[hops.length - 1];
                    if (lastHop && lastHop.avg !== undefined) {
                        totalLastHopRtt += lastHop.avg;
                        lastHopRttCount++;
                        
                        // Calculate jitter data
                        if (lastHop.best !== undefined && lastHop.best < minRtt) {
                            minRtt = lastHop.best;
                        }
                        
                        if (lastHop.worst !== undefined && lastHop.worst > maxRtt) {
                            maxRtt = lastHop.worst;
                        }
                    }
                }
            }
        }
        
        // Calculate averages
        if (lossCount > 0) {
            mtrMetrics[target].avgLoss = totalLoss / lossCount;
        }
        
        if (lastHopRttCount > 0) {
            mtrMetrics[target].avgLastHopRtt = totalLastHopRtt / lastHopRttCount;
        }
        
        // Store worst loss and jitter
        mtrMetrics[target].worstLoss = worstLoss;
        
        // Calculate jitter if we have min and max RTT
        if (minRtt !== Infinity && maxRtt > 0) {
            mtrMetrics[target].jitter = maxRtt - minRtt;
        }
    }
    
    // Compare MTR metrics
    output += "#### MTR Performance Summary\n\n";
    output += "| Target | Avg. Packet Loss | Worst Loss | Avg. End-to-End RTT | RTT Jitter |\n";
    output += "|--------|-----------------|------------|---------------------|------------|\n";
    
    for (const target of targets) {
        const metrics = mtrMetrics[target];
        const avgLoss = metrics.avgLoss !== undefined ? `${metrics.avgLoss.toFixed(2)}%` : 'N/A';
        const worstLoss = metrics.worstLoss !== undefined ? `${metrics.worstLoss.toFixed(2)}%` : 'N/A';
        const avgRtt = metrics.avgLastHopRtt !== undefined ? `${metrics.avgLastHopRtt.toFixed(2)}ms` : 'N/A';
        const jitter = metrics.jitter !== undefined ? `${metrics.jitter.toFixed(2)}ms` : 'N/A';
        
        output += `| ${target} | ${avgLoss} | ${worstLoss} | ${avgRtt} | ${jitter} |\n`;
    }
    
    // Add comparative analysis
    output += "\n#### Analysis\n\n";
    
    // Determine the target with the best network reliability
    if (targets.length > 1) {
        const validTargets = targets.filter(t => mtrMetrics[t].avgLoss !== undefined);
        
        if (validTargets.length > 1) {
            // Sort by average packet loss
            validTargets.sort((a, b) => {
                const lossA = mtrMetrics[a].avgLoss || Infinity;
                const lossB = mtrMetrics[b].avgLoss || Infinity;
                return lossA - lossB;
            });
            
            output += `- **${validTargets[0]}** has the lowest average packet loss (${mtrMetrics[validTargets[0]].avgLoss?.toFixed(2)}%).\n`;
            
            // Sort by end-to-end latency
            validTargets.sort((a, b) => {
                const rttA = mtrMetrics[a].avgLastHopRtt || Infinity;
                const rttB = mtrMetrics[b].avgLastHopRtt || Infinity;
                return rttA - rttB;
            });
            
            if (mtrMetrics[validTargets[0]].avgLastHopRtt !== undefined) {
                output += `- **${validTargets[0]}** has the lowest average RTT (${mtrMetrics[validTargets[0]].avgLastHopRtt?.toFixed(2)}ms).\n`;
            }
            
            // Sort by jitter (lower is better)
            validTargets.sort((a, b) => {
                const jitterA = mtrMetrics[a].jitter || Infinity;
                const jitterB = mtrMetrics[b].jitter || Infinity;
                return jitterA - jitterB;
            });
            
            if (mtrMetrics[validTargets[0]].jitter !== undefined) {
                output += `- **${validTargets[0]}** has the most consistent latency (jitter: ${mtrMetrics[validTargets[0]].jitter?.toFixed(2)}ms).\n`;
            }
        }
    }
    
    // Add individual results for reference
    output += "\n### Individual MTR Results\n\n";
    for (let i = 0; i < targets.length; i++) {
        output += `#### ${targets[i]}\n`;
        const contentItem = results[i].content[0];
        if (contentItem.type === "text") {
            output += contentItem.text;
        }
        output += '\n\n';
    }
    
    return output;
}

/**
 * Compares HTTP results between multiple targets
 * 
 * This function analyzes HTTP performance metrics including time to first byte,
 * total load time, SSL handshake time, and HTTP status codes.
 * 
 * @param targets Array of targets that were measured
 * @param rawMeasurements Array of raw measurement data from Globalping API
 * @returns Formatted comparison text
 */
function compareHttpResults(targets: string[], rawMeasurements: any[]): string {
    let output = "### HTTP Performance Comparison\n\n";
    
    // Extract performance metrics from each result
    const performanceData: Array<{
        target: string;
        ttfb: number;
        total: number;
        success: boolean;
        statusCode: number;
    }> = [];

    // Process each target's raw measurements
    for (let i = 0; i < targets.length; i++) {
        try {
            // Use the raw measurement data directly
            const measurementData = rawMeasurements[i];
            const probesData = measurementData?.results || [];
            
            // Calculate averages from all probes
            let totalTtfb = 0;
            let totalTime = 0;
            let successCount = 0;
            let statusCode = 0;
            let validProbeCount = 0;
            
            for (const probe of probesData) {
                if (probe.result && probe.result.status === 'finished') {
                    validProbeCount++;
                    
                    // Get the status code
                    if (probe.result.statusCode) {
                        statusCode = probe.result.statusCode;
                    }
                    
                    // Check if timings are available
                    if (probe.result.timings) {
                        const timings = probe.result.timings;
                        
                        // Add TTFB if available
                        if (timings.firstByte && typeof timings.firstByte === 'number') {
                            totalTtfb += timings.firstByte;
                        }
                        
                        // Add total time if available
                        if (timings.total && typeof timings.total === 'number') {
                            totalTime += timings.total;
                            successCount++;
                        }
                    }
                }
            }
            
            // Calculate averages
            const avgTtfb = validProbeCount > 0 ? Math.round(totalTtfb / validProbeCount) : 0;
            const avgTotal = successCount > 0 ? Math.round(totalTime / successCount) : 0;
            const success = statusCode >= 200 && statusCode < 400;
            const successRate = validProbeCount > 0 ? Math.round((successCount / validProbeCount) * 100) : 0;
            
            performanceData.push({
                target: targets[i],
                ttfb: avgTtfb,
                total: avgTotal,
                success,
                statusCode
            });
            
            // Add to table
            output += `| ${targets[i]} | ${statusCode} | ${avgTtfb}ms | ${avgTotal}ms | ${successRate}% |\n`;
        } catch (error) {
            // If we can't extract the data, add a row with error indication
            performanceData.push({
                target: targets[i],
                ttfb: 0,
                total: 0,
                success: false,
                statusCode: 0
            });
            
            output += `| ${targets[i]} | Error | - | - | 0% |\n`;
            console.error(`[Formatter] Error comparing HTTP results for ${targets[i]}: ${error}`);
        }
    }

    // Determine the fastest site among sites with successful measurements
    const successfulSites = performanceData.filter(data => data.success && data.total > 0);
    
    output += `\n### Result\n\n`;
    
    if (successfulSites.length > 0) {
        // Find the fastest among the successful ones
        const fastestSite = successfulSites.reduce(
            (prev, current) => (current.total < prev.total) ? current : prev
        );
        
        const speedDifferences = successfulSites
            .filter(data => data.target !== fastestSite.target)
            .map(data => {
                const difference = data.total - fastestSite.total;
                const percentageFaster = (difference / data.total) * 100;
                return `${percentageFaster.toFixed(1)}% faster than ${data.target}`;
            });

        output += `**${fastestSite.target}** is the fastest site with an average load time of ${fastestSite.total}ms`;
        
        if (speedDifferences.length > 0) {
            output += ` (${speedDifferences.join(', ')})`;
        }
        
        output += `.\n\n`;
    } else {
        output += `Could not determine the fastest site because none of the sites loaded successfully during testing.\n\n`;
        output += `This might be due to connection issues or an invalid configuration. Try running the test again or check the individual measurement results for more details.\n\n`;
    }

    return output;
}

/**
 * Compares ping results between multiple targets
 * 
 * This function analyzes ping performance metrics including min/avg/max RTT and packet loss.
 * 
 * @param targets Array of targets that were measured
 * @param results Array of measurement results
 * @returns Formatted comparison text
 */
function comparePingResults(targets: string[], results: ToolResult[]): string {
    let output = "### Ping Latency Comparison\n\n";
    output += `| Target | Min | Avg | Max | Packet Loss |\n`;
    output += `|--------|-----|-----|-----|-------------|\n`;

    const performanceData: Array<{
        target: string;
        min: number;
        avg: number;
        max: number;
        packetLoss: number;
    }> = [];

    // Extract performance metrics from each result
    for (let i = 0; i < targets.length; i++) {
        const contentItem = results[i].content[0];
        if (contentItem.type !== "text") continue;
        
        const resultText = contentItem.text;
        
        // Extract metrics using regex
        const minMatch = resultText.match(/Min:?\s*(\d+(\.\d+)?)/i);
        const avgMatch = resultText.match(/Avg:?\s*(\d+(\.\d+)?)/i);
        const maxMatch = resultText.match(/Max:?\s*(\d+(\.\d+)?)/i);
        const lossMatch = resultText.match(/Loss:?\s*(\d+(\.\d+)?)/i);
        
        // Default values if not found
        const min = minMatch ? parseFloat(minMatch[1]) : 0;
        const avg = avgMatch ? parseFloat(avgMatch[1]) : 0;
        const max = maxMatch ? parseFloat(maxMatch[1]) : 0;
        const packetLoss = lossMatch ? parseFloat(lossMatch[1]) : 0;
        
        performanceData.push({
            target: targets[i],
            min,
            avg,
            max,
            packetLoss
        });
        
        // Add to table
        output += `| ${targets[i]} | ${min}ms | ${avg}ms | ${max}ms | ${packetLoss}% |\n`;
    }

    // Determine the lowest latency site
    let lowestLatencySite = performanceData[0];
    for (let i = 1; i < performanceData.length; i++) {
        if (performanceData[i].avg < lowestLatencySite.avg) {
            lowestLatencySite = performanceData[i];
        }
    }

    output += `\n### Result\n\n`;
    output += `**${lowestLatencySite.target}** has the lowest average latency at ${lowestLatencySite.avg}ms.\n\n`;

    // Add percentage differences
    const latencyDifferences = performanceData
        .filter(data => data.target !== lowestLatencySite.target)
        .map(data => {
            const difference = data.avg - lowestLatencySite.avg;
            const percentageFaster = (difference / data.avg) * 100;
            return `${percentageFaster.toFixed(1)}% faster than ${data.target}`;
        });

    if (latencyDifferences.length > 0) {
        output += `This makes it ${latencyDifferences.join(', ')}.\n\n`;
    }

    return output;
}

/**
 * Formats results for comparative analysis of multiple targets
 * Used for queries like "Which site is faster?"
 */
export function formatComparativeResults(results: Record<string, any[]>, measurementType: string): string {
    let output = '';
    
    if (!results || Object.keys(results).length === 0) {
        return 'No comparison results available.';
    }
    
    const targets = Object.keys(results);
    
    if (measurementType.toLowerCase() === 'http') {
        output += 'HTTP Response Time Comparison:\n\n';
        output += '  Target              Average Total Time\n';
        output += '  ------------------- -----------------\n';
        
        const averagesByTarget: Record<string, { time: number, count: number }> = {};
        
        // Calculate averages for each target
        for (const target of targets) {
            averagesByTarget[target] = { time: 0, count: 0 };
            
            for (const probe of results[target]) {
                if (probe.result && 
                    probe.result.status === 'finished' && 
                    probe.result.timings && 
                    probe.result.timings.total !== undefined) {
                    averagesByTarget[target].time += probe.result.timings.total;
                    averagesByTarget[target].count += 1;
                }
            }
        }
        
        // Sort targets by average time (fastest first)
        const sortedTargets = [...targets].sort((a, b) => {
            const avgA = averagesByTarget[a].count > 0 ? averagesByTarget[a].time / averagesByTarget[a].count : Infinity;
            const avgB = averagesByTarget[b].count > 0 ? averagesByTarget[b].time / averagesByTarget[b].count : Infinity;
            return avgA - avgB;
        });
        
        // Output the sorted results
        for (const target of sortedTargets) {
            const avg = averagesByTarget[target];
            const displayTarget = target.padEnd(19);
            const displayAvg = avg.count > 0 ? `${(avg.time / avg.count).toFixed(2)}ms` : 'N/A';
            
            output += `  ${displayTarget} ${displayAvg}\n`;
        }
        
        // Add a conclusion 
        if (sortedTargets.length > 1 && averagesByTarget[sortedTargets[0]].count > 0) {
            output += `\nConclusion: ${sortedTargets[0]} is the fastest with an average response time of ${(averagesByTarget[sortedTargets[0]].time / averagesByTarget[sortedTargets[0]].count).toFixed(2)}ms.\n`;
        }
    } else if (measurementType.toLowerCase() === 'ping') {
        output += 'Ping Latency Comparison:\n\n';
        output += '  Target              Average RTT    Packet Loss\n';
        output += '  ------------------- ------------- -----------\n';
        
        const statsByTarget: Record<string, { 
            avg: number, 
            loss: number, 
            validProbes: number
        }> = {};
        
        // Calculate statistics for each target
        for (const target of targets) {
            statsByTarget[target] = { avg: 0, loss: 0, validProbes: 0 };
            
            for (const probe of results[target]) {
                if (probe.result && 
                    probe.result.status === 'finished' && 
                    probe.result.stats) {
                    
                    if (probe.result.stats.avg !== undefined) {
                        statsByTarget[target].avg += probe.result.stats.avg;
                    }
                    
                    if (probe.result.stats.loss !== undefined) {
                        statsByTarget[target].loss += probe.result.stats.loss;
                    }
                    
                    statsByTarget[target].validProbes += 1;
                }
            }
        }
        
        // Sort targets by average RTT (lowest first)
        const sortedTargets = [...targets].sort((a, b) => {
            const avgA = statsByTarget[a].validProbes > 0 ? statsByTarget[a].avg / statsByTarget[a].validProbes : Infinity;
            const avgB = statsByTarget[b].validProbes > 0 ? statsByTarget[b].avg / statsByTarget[b].validProbes : Infinity;
            return avgA - avgB;
        });
        
        // Output the sorted results
        for (const target of sortedTargets) {
            const stats = statsByTarget[target];
            const displayTarget = target.padEnd(19);
            const displayAvg = stats.validProbes > 0 ? `${(stats.avg / stats.validProbes).toFixed(2)}ms`.padEnd(13) : 'N/A'.padEnd(13);
            const displayLoss = stats.validProbes > 0 ? `${(stats.loss / stats.validProbes).toFixed(2)}%` : 'N/A';
            
            output += `  ${displayTarget} ${displayAvg} ${displayLoss}\n`;
        }
        
        // Add a conclusion
        if (sortedTargets.length > 1 && statsByTarget[sortedTargets[0]].validProbes > 0) {
            output += `\nConclusion: ${sortedTargets[0]} has the lowest latency with an average RTT of ${(statsByTarget[sortedTargets[0]].avg / statsByTarget[sortedTargets[0]].validProbes).toFixed(2)}ms.\n`;
        }
    } else {
        output += `Comparison for ${measurementType} measurements is not yet supported.\n`;
        output += `Please view individual measurement results instead.\n`;
    }
    
    return output;
}

/**
 * Format rate limits response into a human-readable format
 * 
 * @param rateLimits The rate limits response from the Globalping API
 * @returns A formatted string representing the rate limits
 */
export function formatRateLimits(rateLimits: any): string {
    if (!rateLimits) {
        return "Failed to retrieve rate limits information.";
    }

    let output = "## Globalping API Rate Limits\n\n";
    
    // Authentication status
    output += `**Authentication Status**: ${rateLimits.isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}\n\n`;
    
    // Measurements limits - ensure all fields exist
    if (rateLimits.measurements) {
        output += "### Measurements\n";
        output += `- **Limit**: ${rateLimits.measurements.limit || 'Unknown'} tests per hour\n`;
        output += `- **Remaining**: ${rateLimits.measurements.remaining || 'Unknown'} tests\n`;
        
        // Only add reset time if it exists
        if (rateLimits.measurements.reset) {
            const resetDate = new Date(rateLimits.measurements.reset * 1000);
            const now = new Date();
            const resetMinutes = Math.round((resetDate.getTime() - now.getTime()) / 60000);
            output += `- **Reset**: ${resetMinutes > 0 ? `in ${resetMinutes} minutes` : 'very soon'} (${resetDate.toLocaleString()})\n`;
        }
        output += "\n";
    }
    
    // Credits (only for authenticated users)
    if (rateLimits.credits) {
        output += "### Credits\n";
        output += `- **Limit**: ${rateLimits.credits.limit || 'Unknown'} credits\n`;
        output += `- **Remaining**: ${rateLimits.credits.remaining || 'Unknown'} credits\n\n`;
    }
    
    // Rate limit information
    output += "### Rate Limit Information\n";
    if (rateLimits.isAuthenticated) {
        output += "- **Authenticated Users**: 500 tests/hour, 2 requests/second/measurement\n";
        output += "- Additional tests can be performed by spending credits\n";
    } else {
        output += "- **Unauthenticated Users**: 250 tests/hour, 2 requests/second/measurement\n";
        output += "- **Tip**: Authenticate with an API token to double your hourly test limit\n";
    }
    
    return output;
}
