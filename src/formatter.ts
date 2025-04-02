/**
 * Globalping MCP Server Result Formatters
 * 
 * This file contains the formatting functions for Globalping measurement results.
 * It provides functions to convert raw API responses into human-readable text formats.
 */

import { MeasurementResult } from './globalping/api.js';

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
        
        if (probe.result?.stats) {
            const stats = probe.result.stats;
            // Stats structure has min, max, avg, loss (not packetLoss), and mdev (instead of stddev)
            const min = stats.min !== undefined ? stats.min : '0';
            const max = stats.max !== undefined ? stats.max : '0';
            const avg = stats.avg !== undefined ? stats.avg : '0';
            const loss = stats.loss !== undefined ? stats.loss : '0';
            // mdev is the jitter value in the ping stats
            const jitter = stats.mdev !== undefined ? stats.mdev : '0';
            
            output += `  Min: ${min}ms, Max: ${max}ms, Avg: ${avg}ms\n`;
            output += `  Packet Loss: ${loss}%, Jitter: ${jitter}ms\n`;
            
            // Add additional details about packet stats
            if (stats.total !== undefined) {
                output += `  Packets: ${stats.total} sent, ${stats.rcv || '0'} received\n`;
            }
        } else {
            output += `  No statistics available\n`;
        }
        
        // Individual packet timing data
        if (probe.result?.timings && probe.result.timings.length > 0) {
            output += `  Individual packets:\n`;
            probe.result.timings.forEach((timing: any, i: number) => {
                output += `    #${i + 1}: ${timing.rtt !== undefined ? timing.rtt : 'timeout'}ms (TTL: ${timing.ttl || 'unknown'})\n`;
            });
        }
        
        // Show resolved address information if available
        if (probe.result?.resolvedAddress) {
            output += `  Resolved Address: ${probe.result.resolvedAddress}`;
            if (probe.result.resolvedHostname) {
                output += ` (${probe.result.resolvedHostname})`;
            }
            output += `\n`;
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
        output += `Probe ${index + 1} - Location: ${probe.location?.city || 'Unknown'}, ${probe.location?.country || 'Unknown'}\n`;
        
        if (probe.result?.hops && Array.isArray(probe.result.hops)) {
            output += `  Hop  IP Address        RTT     Location\n`;
            output += `  ---- ---------------- ------- -----------------\n`;
            
            probe.result.hops.forEach((hop: any) => {
                const hopNum = hop.hop.toString().padEnd(4);
                const ip = (hop.ip || '*').padEnd(16);
                const rtt = (hop.rtt ? `${hop.rtt}ms` : '*').padEnd(7);
                const location = hop.location ? `${hop.location.city || ''}, ${hop.location.country || ''}` : '';
                
                output += `  ${hopNum} ${ip} ${rtt} ${location}\n`;
            });
        } else {
            output += `  No hop information available\n`;
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
        output += `Probe ${index + 1} - Location: ${probe.location?.city || 'Unknown'}, ${probe.location?.country || 'Unknown'}\n`;
        
        if (probe.result?.answers && Array.isArray(probe.result.answers)) {
            output += `  DNS Records:\n`;
            
            probe.result.answers.forEach((answer: any) => {
                output += `  Type: ${answer.type}, TTL: ${answer.ttl}\n`;
                output += `  Data: ${answer.data}\n\n`;
            });
        } else {
            output += `  No DNS records available\n`;
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
        output += `Probe ${index + 1} - Location: ${probe.location?.city || 'Unknown'}, ${probe.location?.country || 'Unknown'}\n`;
        
        if (probe.result?.hops && Array.isArray(probe.result.hops)) {
            output += `  Hop  IP Address        Loss%   Sent  Recv  Best  Avg   Worst  Last\n`;
            output += `  ---- ---------------- ------ ----- ----- ----- ----- ----- -----\n`;
            
            probe.result.hops.forEach((hop: any) => {
                const hopNum = hop.hop.toString().padEnd(4);
                const ip = (hop.ip || '*').padEnd(16);
                const loss = (hop.loss ? `${hop.loss}%` : '*').padEnd(6);
                const sent = (hop.sent || '*').toString().padEnd(5);
                const recv = (hop.recv || '*').toString().padEnd(5);
                const best = (hop.best ? `${hop.best}ms` : '*').padEnd(5);
                const avg = (hop.avg ? `${hop.avg}ms` : '*').padEnd(5);
                const worst = (hop.worst ? `${hop.worst}ms` : '*').padEnd(5);
                const last = (hop.last ? `${hop.last}ms` : '*').padEnd(5);
                
                output += `  ${hopNum} ${ip} ${loss} ${sent} ${recv} ${best} ${avg} ${worst} ${last}\n`;
            });
        } else {
            output += `  No hop information available\n`;
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
        output += `Probe ${index + 1} - Location: ${probe.location?.city || 'Unknown'}, ${probe.location?.country || 'Unknown'}\n`;
        
        if (probe.result) {
            const statusCode = probe.result.statusCode || 'Unknown';
            const totalTime = probe.result.timings?.total || 'Unknown';
            
            output += `  Status Code: ${statusCode}\n`;
            output += `  Total Time: ${totalTime}ms\n`;
            
            if (probe.result.timings) {
                output += `  Timing Breakdown:\n`;
                output += `    DNS: ${probe.result.timings.dns || 0}ms\n`;
                output += `    Connect: ${probe.result.timings.connect || 0}ms\n`;
                output += `    TLS: ${probe.result.timings.tls || 0}ms\n`;
                output += `    TTFB: ${probe.result.timings.ttfb || 0}ms\n`;
                output += `    Download: ${probe.result.timings.download || 0}ms\n`;
            }
            
            if (probe.result.headers) {
                output += `  Response Headers:\n`;
                for (const [key, value] of Object.entries(probe.result.headers)) {
                    output += `    ${key}: ${value}\n`;
                }
            }
        } else {
            output += `  No HTTP result available\n`;
        }
        
        output += '\n';
    });
    
    return output;
}
