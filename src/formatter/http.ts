/**
 * HTTP Measurement Result Formatter
 * 
 * This module handles formatting for HTTP measurement results from the Globalping API.
 * HTTP measurements provide information about web server responses, including status codes,
 * headers, response times, and TLS certificate details.
 * 
 * For LLMs: This formatter presents HTTP measurements in a way that highlights key metrics
 * like response time, status codes, and SSL/TLS information that are critical for
 * understanding web application performance and security.
 */

import { ProbeResult } from '../globalping/types.js';

/**
 * Format HTTP results to show status codes and response timing
 * 
 * This function transforms HTTP measurement data into a human-readable format,
 * showing results for each probe including:
 * - Location information (city, country, network)
 * - HTTP status code and message
 * - Timing breakdown (DNS, TCP, TLS, TTFB, download)
 * - Headers (selected important ones)
 * - TLS certificate details (for HTTPS connections)
 * 
 * @param results The HTTP measurement results from Globalping API
 * @returns A formatted string representing the HTTP results
 */
export function formatHttpResults(results: ProbeResult[]): string {
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
            // Show HTTP status code and message
            const statusCode = probe.result.statusCode || 'Unknown';
            const statusName = probe.result.statusCodeName || '';
            output += `  Status: ${statusCode} ${statusName}\n`;
            
            // Show timing information
            if (probe.result.timings) {
                output += `  Timing breakdown:\n`;
                const timings = probe.result.timings;
                
                // Helper function to format timing value with unit
                const formatTime = (value: number | null | undefined) => {
                    return value !== null && value !== undefined ? `${value}ms` : 'N/A';
                };
                
                output += `    Total:    ${formatTime(timings.total)}\n`;
                output += `    DNS:      ${formatTime(timings.dns)}\n`;
                output += `    TCP:      ${formatTime(timings.tcp)}\n`;
                
                // TLS timing only applies to HTTPS
                if (timings.tls !== undefined) {
                    output += `    TLS:      ${formatTime(timings.tls)}\n`;
                }
                
                // Time to first byte (TTFB)
                if (timings.firstByte !== undefined) {
                    output += `    TTFB:     ${formatTime(timings.firstByte)}\n`;
                }
                
                // Download time
                if (timings.download !== undefined) {
                    output += `    Download: ${formatTime(timings.download)}\n`;
                }
            }
            
            // Show resolved address if available
            if (probe.result.resolvedAddress) {
                output += `  Resolved Address: ${probe.result.resolvedAddress}\n`;
            }
            
            // Show important headers (selected subset for readability)
            if (probe.result.headers && typeof probe.result.headers === 'object') {
                const importantHeaders = [
                    'content-type', 
                    'content-length', 
                    'server', 
                    'date', 
                    'cache-control',
                    'x-powered-by',
                    'strict-transport-security'
                ];
                
                const headers = probe.result.headers;
                const headerKeys = Object.keys(headers);
                
                if (headerKeys.length > 0) {
                    output += `  Important Headers:\n`;
                    
                    // First show important headers
                    importantHeaders.forEach(header => {
                        const normalizedHeader = header.toLowerCase();
                        const matchingKey = headerKeys.find(k => k.toLowerCase() === normalizedHeader);
                        
                        if (matchingKey) {
                            let value = headers[matchingKey];
                            if (Array.isArray(value)) {
                                value = value.join(', ');
                            }
                            output += `    ${matchingKey}: ${value}\n`;
                        }
                    });
                    
                    // Show total header count
                    output += `    + ${headerKeys.length - importantHeaders.length} more headers\n`;
                }
            }
            
            // Show TLS certificate info for HTTPS connections
            if (probe.result.tls) {
                const tls = probe.result.tls;
                output += `  TLS Information:\n`;
                output += `    Protocol:      ${tls.protocol || 'Unknown'}\n`;
                output += `    Cipher:        ${tls.cipherName || 'Unknown'}\n`;
                output += `    Key Type:      ${tls.keyType || 'Unknown'}\n`;
                output += `    Key Size:      ${tls.keyBits || 'Unknown'} bits\n`;
                output += `    Valid From:    ${tls.createdAt || 'Unknown'}\n`;
                output += `    Valid Until:   ${tls.expiresAt || 'Unknown'}\n`;
                output += `    Trusted:       ${tls.authorized ? 'Yes' : 'No'}\n`;
                
                if (tls.error) {
                    output += `    Error:         ${tls.error}\n`;
                }
                
                if (tls.subject) {
                    output += `    Subject CN:    ${tls.subject.CN || 'Unknown'}\n`;
                    if (tls.subject.alt) {
                        output += `    Alt Names:     ${tls.subject.alt}\n`;
                    }
                }
                
                if (tls.issuer) {
                    const issuerParts = [];
                    if (tls.issuer.O) issuerParts.push(tls.issuer.O);
                    if (tls.issuer.CN) issuerParts.push(tls.issuer.CN);
                    if (tls.issuer.C) issuerParts.push(tls.issuer.C);
                    
                    output += `    Issuer:        ${issuerParts.join(', ') || 'Unknown'}\n`;
                }
            }
            
            // Show response body truncation info
            if (probe.result.truncated) {
                output += `  Response body was truncated (max 10KB)\n`;
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
