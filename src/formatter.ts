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
 * Handles both simple and trace mode responses
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
                    output += `  Data: ${answer.data}\n\n`;
                });
                
                // Show query time if available
                if (probe.result.time !== undefined) {
                    output += `  Query Time: ${probe.result.time}ms\n`;
                }
            } else if (probe.result.hops && Array.isArray(probe.result.hops)) {
                // Trace (recursive) mode - show each resolver step
                output += `  DNS Trace (Recursive Query):\n`;
                output += `  Server               RTT      Status   Answers\n`;
                output += `  ------------------- -------- --------- ---------------\n`;
                
                probe.result.hops.forEach((hop: any) => {
                    const server = (hop.resolver || '*').padEnd(19);
                    const rtt = (hop.rtt !== undefined ? `${hop.rtt}ms` : '*').padEnd(8);
                    const status = (hop.status || 'unknown').padEnd(9);
                    
                    output += `  ${server} ${rtt} ${status} `;
                    
                    if (hop.answers && Array.isArray(hop.answers) && hop.answers.length > 0) {
                        // For the first line, add the first answer
                        const firstAnswer = hop.answers[0];
                        output += `${firstAnswer.type}: ${firstAnswer.data}\n`;
                        
                        // For subsequent answers, indent and add each one
                        for (let i = 1; i < hop.answers.length; i++) {
                            const answer = hop.answers[i];
                            output += `  ${' '.repeat(19 + 8 + 9)} ${answer.type}: ${answer.data}\n`;
                        }
                    } else {
                        output += 'No records\n';
                    }
                });
            } else {
                output += `  No DNS records available\n`;
            }
            
            // Show query details if available
            if (probe.result.query) {
                output += `  Query: ${probe.result.query.type} ${probe.result.query.name}\n`;
            }
            
            // Show the resolver used if available
            if (probe.result.resolver) {
                output += `  Resolver: ${probe.result.resolver}\n`;
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
                output += `  Hop  IP Address        RTT     AS Number  Location\n`;
                output += `  ---- ---------------- ------- ----------- -----------------\n`;
                
                probe.result.hops.forEach((hop: any) => {
                    const hopNum = hop.hop.toString().padEnd(4);
                    const ip = (hop.resolvedAddress || '*').padEnd(16);
                    const rtt = (hop.rtt !== undefined && hop.rtt !== null ? `${hop.rtt}ms` : '*').padEnd(7);
                    const asn = (hop.asn || '').toString().padEnd(11);
                    const location = hop.location ? `${hop.location.city || ''}, ${hop.location.country || ''}` : '';
                    
                    output += `  ${hopNum} ${ip} ${rtt} ${asn} ${location}\n`;
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
                
                probe.result.hops.forEach((hop: any) => {
                    const hopNum = hop.hop.toString().padEnd(4);
                    const ip = (hop.resolvedAddress || '*').padEnd(16);
                    
                    // Stats fields may be nested under a stats object
                    const stats = hop.stats || {};
                    const loss = (stats.loss !== undefined ? `${stats.loss}%` : '*').padEnd(6);
                    const sent = (stats.sent || '*').toString().padEnd(5);
                    const recv = (stats.rcv || '*').toString().padEnd(5);
                    const best = (stats.min !== undefined ? `${stats.min}ms` : '*').padEnd(5);
                    const avg = (stats.avg !== undefined ? `${stats.avg}ms` : '*').padEnd(5);
                    const worst = (stats.max !== undefined ? `${stats.max}ms` : '*').padEnd(5);
                    const stdDev = (stats.mdev !== undefined ? `${stats.mdev}ms` : '*').padEnd(7);
                    
                    output += `  ${hopNum} ${ip} ${loss} ${sent} ${recv} ${best} ${avg} ${worst} ${stdDev}\n`;
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
            const totalTime = probe.result.timings?.total || 'Unknown';
            
            output += `  Status Code: ${statusCode}\n`;
            output += `  Total Time: ${totalTime}ms\n`;
            
            // Output protocol version
            if (probe.result.protocol) {
                output += `  Protocol: ${probe.result.protocol}\n`;
            }
            
            // Output timings with correct field names
            if (probe.result.timings) {
                output += `  Timing Breakdown:\n`;
                output += `    DNS Lookup: ${probe.result.timings.dns || 0}ms\n`;
                output += `    TCP Connection: ${probe.result.timings.connect || 0}ms\n`;
                output += `    TLS Handshake: ${probe.result.timings.tls || 0}ms\n`;
                output += `    Time to First Byte: ${probe.result.timings.firstByte || 0}ms\n`;
                output += `    Download: ${probe.result.timings.download || 0}ms\n`;
            }
            
            // Show TLS certificate information if available
            if (probe.result.tls) {
                output += `  TLS Information:\n`;
                if (probe.result.tls.established) {
                    output += `    TLS Established: Yes\n`;
                    
                    if (probe.result.tls.protocol) {
                        output += `    Protocol: ${probe.result.tls.protocol}\n`;
                    }
                    
                    if (probe.result.tls.cipher) {
                        output += `    Cipher: ${probe.result.tls.cipher}\n`;
                    }
                    
                    // Certificate details
                    if (probe.result.tls.certificate) {
                        const cert = probe.result.tls.certificate;
                        output += `    Certificate Subject: ${cert.subject || 'Unknown'}\n`;
                        output += `    Certificate Issuer: ${cert.issuer || 'Unknown'}\n`;
                        
                        // Format dates for better readability
                        if (cert.validFrom && cert.validTo) {
                            const validFrom = new Date(cert.validFrom).toLocaleString();
                            const validTo = new Date(cert.validTo).toLocaleString();
                            output += `    Valid From: ${validFrom}\n`;
                            output += `    Valid To: ${validTo}\n`;
                        }
                    }
                } else {
                    output += `    TLS Established: No\n`;
                    if (probe.result.tls.error) {
                        output += `    TLS Error: ${probe.result.tls.error}\n`;
                    }
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
            if (probe.result && probe.result.errorMessage) {
                output += `  Error: ${probe.result.errorMessage}\n`;
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
 * @param results Array of measurement results in the same order as targets
 * @param type The measurement type used for all targets
 * @param originalQuery The original natural language query
 * @returns Formatted comparative analysis
 */
export function formatComparativeResult(
    targets: string[],
    results: ToolResult[],
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
        analysisText += compareHttpResults(targets, results);
    } else if (type === 'ping') {
        // For ping, compare min/avg/max RTT and packet loss
        analysisText += comparePingResults(targets, results);
    } else if (type === 'dns') {
        // For DNS, just present the results side by side
        analysisText += `DNS comparison not available in comparative format.\n\n`;
        analysisText += `Individual results:\n\n`;
        
        for (let i = 0; i < targets.length; i++) {
            analysisText += `### ${targets[i]}\n`;
            analysisText += results[i].content[0].text;
            analysisText += '\n\n';
        }
    } else {
        // For other types, just present the results side by side
        analysisText += `Detailed comparison not available for ${type} measurements.\n\n`;
        analysisText += `Individual results:\n\n`;
        
        for (let i = 0; i < targets.length; i++) {
            analysisText += `### ${targets[i]}\n`;
            analysisText += results[i].content[0].text;
            analysisText += '\n\n';
        }
    }

    return {
        content: [{ type: "text", text: analysisText }],
        isError: false
    };
}

/**
 * Compares HTTP results between multiple targets
 * 
 * @param targets Array of targets that were measured
 * @param results Array of measurement results
 * @returns Formatted comparison text
 */
function compareHttpResults(targets: string[], results: ToolResult[]): string {
    let output = `### HTTP Performance Comparison\n\n`;
    output += `| Target | Status | TTFB (avg) | Total Time (avg) | Success Rate |\n`;
    output += `|--------|--------|------------|-----------------|-------------|\n`;

    const performanceData: Array<{
        target: string;
        ttfb: number;
        total: number;
        success: boolean;
        statusCode: number;
    }> = [];

    // Extract performance metrics from each result
    for (let i = 0; i < targets.length; i++) {
        const resultText = results[i].content[0].text;
        
        // Extract metrics using regex (simplified for demonstration)
        const ttfbMatch = resultText.match(/TTFB:?\s*(\d+(\.\d+)?)/i);
        const totalMatch = resultText.match(/Total:?\s*(\d+(\.\d+)?)/i);
        const statusMatch = resultText.match(/Status:?\s*(\d+)/i);
        
        // Default values if not found
        const ttfb = ttfbMatch ? parseFloat(ttfbMatch[1]) : 0;
        const total = totalMatch ? parseFloat(totalMatch[1]) : 0;
        const statusCode = statusMatch ? parseInt(statusMatch[1]) : 0;
        const success = statusCode >= 200 && statusCode < 400;
        
        performanceData.push({
            target: targets[i],
            ttfb,
            total,
            success,
            statusCode
        });
        
        // Add to table
        output += `| ${targets[i]} | ${statusCode} | ${ttfb}ms | ${total}ms | ${success ? '✅' : '❌'} |\n`;
    }

    // Determine the fastest site
    let fastestSite = performanceData[0];
    for (let i = 1; i < performanceData.length; i++) {
        if (
            performanceData[i].success && 
            (!fastestSite.success || performanceData[i].total < fastestSite.total)
        ) {
            fastestSite = performanceData[i];
        }
    }

    output += `\n### Result\n\n`;
    
    if (fastestSite.success) {
        const speedDifferences = performanceData
            .filter(data => data.target !== fastestSite.target && data.success)
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
        // If the "fastest" site had errors, check if any were successful
        const successfulSites = performanceData.filter(data => data.success);
        
        if (successfulSites.length > 0) {
            // Find the fastest among the successful ones
            const fastestSuccessful = successfulSites.reduce(
                (prev, current) => (current.total < prev.total) ? current : prev
            );
            
            output += `**${fastestSuccessful.target}** is the fastest site with an average load time of ${fastestSuccessful.total}ms.\n\n`;
        } else {
            output += `None of the sites loaded successfully during testing.\n\n`;
        }
    }

    return output;
}

/**
 * Compares ping results between multiple targets
 * 
 * @param targets Array of targets that were measured
 * @param results Array of measurement results
 * @returns Formatted comparison text
 */
function comparePingResults(targets: string[], results: ToolResult[]): string {
    let output = `### Ping Latency Comparison\n\n`;
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
        const resultText = results[i].content[0].text;
        
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
