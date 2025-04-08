/**
 * Tool definitions for the Globalping MCP server
 * Defines all the MCP tools that clients can use
 */
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { GlobalpingClient } from '../api/globalping-client';
import { processMeasurementResults } from './measurement';
import {
  MeasurementResponse,
  MeasurementType,
  PingOptions,
  TracerouteOptions,
  DnsOptions,
  MtrOptions,
  HttpOptions
} from '../types/globalping';

// Initialize the Globalping client
const globalping = new GlobalpingClient();

/**
 * Generate tool schema for the MCP tools
 * @param server The MCP server instance
 */
export function registerTools(server: McpServer): void {
  // Register all measurement tools
  registerPingTool(server);
  registerTracerouteTool(server);
  registerDnsTool(server);
  registerMtrTool(server);
  registerHttpTool(server);
  registerComparisonTool(server);
}

/**
 * Register the ping tool
 * @param server The MCP server instance
 */
function registerPingTool(server: McpServer): void {
  server.tool(
    'ping',
    'Run a ping measurement from multiple global locations',
    {
      target: z.string().min(1).describe('The target hostname or IP address to ping'),
      locations: z.array(z.string()).optional().describe('Array of locations to run the measurement from (cities, countries, regions, networks, ASNs, or previous measurement IDs)'),
      limit: z.number().int().min(1).max(500).optional().describe('The number of probes to use (default: 3)'),
      packets: z.number().int().min(1).max(16).optional().describe('The number of packets to send (default: 3)'),
      ipVersion: z.enum(['4', '6']).optional().describe('The IP version to use - 4 or 6 (experimental)'),
      token: z.string().optional().describe('Optional Globalping API token')
    },
    async ({ target, locations = [], limit = 3, packets, ipVersion, token }) => {
      // Build measurement options
      const options: PingOptions = {};
      if (packets !== undefined) options.packets = packets;
      if (ipVersion !== undefined) options.ipVersion = parseInt(ipVersion) as 4 | 6;

      try {
        // Run the measurement
        const measurement = await globalping.runMeasurement(
          'ping',
          target,
          locations,
          options,
          limit,
          token
        );

        // Process and return the results
        return formatMcpResponse(measurement);
      } catch (error) {
        console.error('Error running ping measurement:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error running ping measurement: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );
}

/**
 * Register the traceroute tool
 * @param server The MCP server instance
 */
function registerTracerouteTool(server: McpServer): void {
  server.tool(
    'traceroute',
    'Run a traceroute measurement from multiple global locations',
    {
      target: z.string().min(1).describe('The target hostname or IP address to traceroute'),
      locations: z.array(z.string()).optional().describe('Array of locations to run the measurement from (cities, countries, regions, networks, ASNs, or previous measurement IDs)'),
      limit: z.number().int().min(1).max(500).optional().describe('The number of probes to use (default: 3)'),
      port: z.number().int().min(0).max(65535).optional().describe('The destination port for the data packets (default: 80)'),
      protocol: z.enum(['ICMP', 'TCP', 'UDP']).optional().describe('The transport protocol to use (default: ICMP)'),
      ipVersion: z.enum(['4', '6']).optional().describe('The IP version to use - 4 or 6 (experimental)'),
      token: z.string().optional().describe('Optional Globalping API token')
    },
    async ({ target, locations = [], limit = 3, port, protocol, ipVersion, token }) => {
      // Build measurement options
      const options: TracerouteOptions = {};
      if (port !== undefined) options.port = port;
      if (protocol !== undefined) options.protocol = protocol;
      if (ipVersion !== undefined) options.ipVersion = parseInt(ipVersion) as 4 | 6;

      try {
        // Run the measurement
        const measurement = await globalping.runMeasurement(
          'traceroute',
          target,
          locations,
          options,
          limit,
          token
        );

        // Process and return the results
        return formatMcpResponse(measurement);
      } catch (error) {
        console.error('Error running traceroute measurement:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error running traceroute measurement: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );
}

/**
 * Register the DNS tool
 * @param server The MCP server instance
 */
function registerDnsTool(server: McpServer): void {
  server.tool(
    'dns',
    'Run a DNS measurement from multiple global locations',
    {
      target: z.string().min(1).describe('The domain name to query'),
      locations: z.array(z.string()).optional().describe('Array of locations to run the measurement from (cities, countries, regions, networks, ASNs, or previous measurement IDs)'),
      limit: z.number().int().min(1).max(500).optional().describe('The number of probes to use (default: 3)'),
      queryType: z.enum(['A', 'AAAA', 'ANY', 'CNAME', 'DNSKEY', 'DS', 'HTTPS', 'MX', 'NS', 'NSEC', 'PTR', 'RRSIG', 'SOA', 'TXT', 'SRV', 'SVCB']).optional().describe('The type of DNS query (default: A)'),
      resolver: z.string().optional().describe('A DNS resolver to use for the query (IP or hostname)'),
      port: z.number().int().min(0).max(65535).optional().describe('The port number to send the query to (default: 53)'),
      protocol: z.enum(['TCP', 'UDP']).optional().describe('The protocol to use for the DNS query (default: UDP)'),
      trace: z.boolean().optional().describe('Trace delegation path from root servers (default: false)'),
      ipVersion: z.enum(['4', '6']).optional().describe('The IP version to use - 4 or 6 (experimental)'),
      token: z.string().optional().describe('Optional Globalping API token')
    },
    async ({ target, locations = [], limit = 3, queryType, resolver, port, protocol, trace, ipVersion, token }) => {
      // Build measurement options
      const options: DnsOptions = {};
      if (queryType !== undefined) options.query = { type: queryType };
      if (resolver !== undefined) options.resolver = resolver;
      if (port !== undefined) options.port = port;
      if (protocol !== undefined) options.protocol = protocol;
      if (trace !== undefined) options.trace = trace;
      if (ipVersion !== undefined) options.ipVersion = parseInt(ipVersion) as 4 | 6;

      try {
        // Run the measurement
        const measurement = await globalping.runMeasurement(
          'dns',
          target,
          locations,
          options,
          limit,
          token
        );

        // Process and return the results
        return formatMcpResponse(measurement);
      } catch (error) {
        console.error('Error running DNS measurement:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error running DNS measurement: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );
}

/**
 * Register the MTR tool
 * @param server The MCP server instance
 */
function registerMtrTool(server: McpServer): void {
  server.tool(
    'mtr',
    'Run an MTR measurement from multiple global locations',
    {
      target: z.string().min(1).describe('The target hostname or IP address for MTR'),
      locations: z.array(z.string()).optional().describe('Array of locations to run the measurement from (cities, countries, regions, networks, ASNs, or previous measurement IDs)'),
      limit: z.number().int().min(1).max(500).optional().describe('The number of probes to use (default: 3)'),
      port: z.number().int().min(0).max(65535).optional().describe('The port number to use (default: 80)'),
      protocol: z.enum(['ICMP', 'TCP', 'UDP']).optional().describe('The transport protocol to use (default: ICMP)'),
      packets: z.number().int().min(1).max(16).optional().describe('The number of packets to send to each hop (default: 3)'),
      ipVersion: z.enum(['4', '6']).optional().describe('The IP version to use - 4 or 6 (experimental)'),
      token: z.string().optional().describe('Optional Globalping API token')
    },
    async ({ target, locations = [], limit = 3, port, protocol, packets, ipVersion, token }) => {
      // Build measurement options
      const options: MtrOptions = {};
      if (port !== undefined) options.port = port;
      if (protocol !== undefined) options.protocol = protocol;
      if (packets !== undefined) options.packets = packets;
      if (ipVersion !== undefined) options.ipVersion = parseInt(ipVersion) as 4 | 6;

      try {
        // Run the measurement
        const measurement = await globalping.runMeasurement(
          'mtr',
          target,
          locations,
          options,
          limit,
          token
        );

        // Process and return the results
        return formatMcpResponse(measurement);
      } catch (error) {
        console.error('Error running MTR measurement:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error running MTR measurement: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );
}

/**
 * Register the HTTP tool
 * @param server The MCP server instance
 */
function registerHttpTool(server: McpServer): void {
  server.tool(
    'http',
    'Run an HTTP measurement from multiple global locations',
    {
      target: z.string().min(1).describe('The target URL or hostname for HTTP measurement'),
      locations: z.array(z.string()).optional().describe('Array of locations to run the measurement from (cities, countries, regions, networks, ASNs, or previous measurement IDs)'),
      limit: z.number().int().min(1).max(500).optional().describe('The number of probes to use (default: 3)'),
      host: z.string().optional().describe('An optional override for the Host header'),
      path: z.string().optional().describe('The path portion of the URL'),
      query: z.string().optional().describe('The query string portion of the URL'),
      method: z.enum(['HEAD', 'GET', 'OPTIONS']).optional().describe('The HTTP method to use (default: HEAD)'),
      headers: z.record(z.string()).optional().describe('Additional request headers'),
      resolver: z.string().optional().describe('A DNS resolver to use (IP or hostname)'),
      port: z.number().int().min(0).max(65535).optional().describe('The port number to use (default depends on protocol)'),
      protocol: z.enum(['HTTP', 'HTTPS', 'HTTP2']).optional().describe('The protocol to use (default: HTTPS)'),
      ipVersion: z.enum(['4', '6']).optional().describe('The IP version to use - 4 or 6 (experimental)'),
      token: z.string().optional().describe('Optional Globalping API token')
    },
    async ({ target, locations = [], limit = 3, host, path, query, method, headers, resolver, port, protocol, ipVersion, token }) => {
      // Build measurement options
      const options: HttpOptions = {};
      
      // Build request options
      if (host !== undefined || path !== undefined || query !== undefined || method !== undefined || headers !== undefined) {
        options.request = {};
        if (host !== undefined) options.request.host = host;
        if (path !== undefined) options.request.path = path;
        if (query !== undefined) options.request.query = query;
        if (method !== undefined) options.request.method = method;
        if (headers !== undefined) options.request.headers = headers;
      }

      if (resolver !== undefined) options.resolver = resolver;
      if (port !== undefined) options.port = port;
      if (protocol !== undefined) options.protocol = protocol;
      if (ipVersion !== undefined) options.ipVersion = parseInt(ipVersion) as 4 | 6;

      try {
        // Run the measurement
        const measurement = await globalping.runMeasurement(
          'http',
          target,
          locations,
          options,
          limit,
          token
        );

        // Process and return the results
        return formatMcpResponse(measurement);
      } catch (error) {
        console.error('Error running HTTP measurement:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error running HTTP measurement: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );
}

/**
 * Register the comparison tool
 * @param server The MCP server instance
 */
function registerComparisonTool(server: McpServer): void {
  server.tool(
    'compareTargets',
    'Compare two targets using the same probes',
    {
      measurementType: z.enum(['ping', 'traceroute', 'dns', 'mtr', 'http']).describe('The type of measurement to perform'),
      target1: z.string().min(1).describe('The first target hostname, IP address, or URL'),
      target2: z.string().min(1).describe('The second target hostname, IP address, or URL to compare with'),
      locations: z.array(z.string()).optional().describe('Array of locations to run the measurement from (cities, countries, regions, networks, ASNs)'),
      limit: z.number().int().min(1).max(500).optional().describe('The number of probes to use (default: 3)'),
      options: z.record(z.any()).optional().describe('Measurement-specific options'),
      token: z.string().optional().describe('Optional Globalping API token')
    },
    async ({ measurementType, target1, target2, locations = [], limit = 3, options = {}, token }) => {
      try {
        // Run the first measurement
        const measurement1 = await globalping.runMeasurement(
          measurementType,
          target1,
          locations,
          options,
          limit,
          token
        );

        // Run the second measurement using the ID of the first measurement
        const measurement2 = await globalping.runComparisonMeasurement(
          measurementType,
          target2,
          measurement1.id,
          options,
          token
        );

        // Process and format the results
        const results1 = processMeasurementResults(measurement1);
        const results2 = processMeasurementResults(measurement2);

        // Create a comparison report
        const comparison = createComparisonReport(results1, results2, measurementType);

        return {
          content: [
            {
              type: 'text',
              text: `# Comparison Results: ${target1} vs ${target2}\n\n${comparison}`
            }
          ]
        };
      } catch (error) {
        console.error('Error running comparison measurement:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error running comparison measurement: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    }
  );
}

/**
 * Create a comparison report between two measurement results
 * @param results1 Processed results from the first measurement
 * @param results2 Processed results from the second measurement
 * @param type Measurement type
 * @returns Formatted comparison report as markdown
 */
function createComparisonReport(results1: any, results2: any, type: MeasurementType): string {
  let report = '';

  // Add summary section
  report += '## Summary\n\n';
  
  switch (type) {
    case 'ping':
      report += `- Average RTT for ${results1.target}: ${results1.stats?.avgRtt?.toFixed(2) ?? 'N/A'} ms\n`;
      report += `- Average RTT for ${results2.target}: ${results2.stats?.avgRtt?.toFixed(2) ?? 'N/A'} ms\n`;
      report += `- Average packet loss for ${results1.target}: ${(results1.stats?.avgPacketLoss ?? 0).toFixed(2)}%\n`;
      report += `- Average packet loss for ${results2.target}: ${(results2.stats?.avgPacketLoss ?? 0).toFixed(2)}%\n`;
      
      if (results1.stats?.avgRtt && results2.stats?.avgRtt) {
        const diff = results1.stats.avgRtt - results2.stats.avgRtt;
        const percentDiff = (Math.abs(diff) / ((results1.stats.avgRtt + results2.stats.avgRtt) / 2)) * 100;
        
        report += `\n**Performance difference**: ${Math.abs(diff).toFixed(2)} ms (${percentDiff.toFixed(2)}%) `;
        report += diff > 0 
          ? `slower for ${results1.target} compared to ${results2.target}`
          : `faster for ${results1.target} compared to ${results2.target}`;
      }
      break;
      
    case 'http':
      report += `- Average response time for ${results1.target}: ${results1.stats?.avgResponseTime?.toFixed(2) ?? 'N/A'} ms\n`;
      report += `- Average response time for ${results2.target}: ${results2.stats?.avgResponseTime?.toFixed(2) ?? 'N/A'} ms\n`;
      report += `- Success rate for ${results1.target}: ${((results1.stats?.successRate ?? 0) * 100).toFixed(2)}%\n`;
      report += `- Success rate for ${results2.target}: ${((results2.stats?.successRate ?? 0) * 100).toFixed(2)}%\n`;
      break;
      
    case 'traceroute':
    case 'mtr':
      report += `- Average hop count for ${results1.target}: ${results1.stats?.avgHopCount?.toFixed(2) ?? 'N/A'}\n`;
      report += `- Average hop count for ${results2.target}: ${results2.stats?.avgHopCount?.toFixed(2) ?? 'N/A'}\n`;
      break;
      
    case 'dns':
      report += `- Average query time for ${results1.target}: ${results1.stats?.avgQueryTime?.toFixed(2) ?? 'N/A'} ms\n`;
      report += `- Average query time for ${results2.target}: ${results2.stats?.avgQueryTime?.toFixed(2) ?? 'N/A'} ms\n`;
      report += `- DNS success rate for ${results1.target}: ${((results1.stats?.successRate ?? 0) * 100).toFixed(2)}%\n`;
      report += `- DNS success rate for ${results2.target}: ${((results2.stats?.successRate ?? 0) * 100).toFixed(2)}%\n`;
      break;
  }
  
  // Add probe-by-probe comparison section
  report += '\n## Probe-by-Probe Comparison\n\n';
  
  // Get matching probes
  const probeLocations = results1.results.detailed.map((r: any) => 
    `${r.probe.location} (${r.probe.network})`
  );
  
  for (let i = 0; i < Math.min(results1.results.detailed.length, results2.results.detailed.length); i++) {
    const result1 = results1.results.detailed[i];
    const result2 = results2.results.detailed[i];
    
    if (!result1 || !result2) continue;
    
    report += `### Probe ${i+1}: ${result1.probe.location}, ${result1.probe.network}\n\n`;
    
    switch (type) {
      case 'ping':
        report += `- ${results1.target}: RTT Avg: ${result1.rtt.avg?.toFixed(2) ?? 'N/A'} ms, Loss: ${result1.packetLoss.toFixed(2)}%\n`;
        report += `- ${results2.target}: RTT Avg: ${result2.rtt.avg?.toFixed(2) ?? 'N/A'} ms, Loss: ${result2.packetLoss.toFixed(2)}%\n`;
        
        if (result1.rtt.avg && result2.rtt.avg) {
          const diff = result1.rtt.avg - result2.rtt.avg;
          report += `- Difference: ${Math.abs(diff).toFixed(2)} ms ${diff > 0 ? 'slower' : 'faster'} for ${results1.target}\n`;
        }
        break;
        
      case 'http':
        report += `- ${results1.target}: Status: ${result1.statusCode} ${result1.statusCodeName}, Time: ${result1.timings.total?.toFixed(2) ?? 'N/A'} ms\n`;
        report += `- ${results2.target}: Status: ${result2.statusCode} ${result2.statusCodeName}, Time: ${result2.timings.total?.toFixed(2) ?? 'N/A'} ms\n`;
        break;
        
      case 'traceroute':
      case 'mtr':
        report += `- ${results1.target}: Hops: ${result1.hops?.length ?? 'N/A'}\n`;
        report += `- ${results2.target}: Hops: ${result2.hops?.length ?? 'N/A'}\n`;
        break;
        
      case 'dns':
        report += `- ${results1.target}: Query time: ${result1.time?.toFixed(2) ?? 'N/A'} ms\n`;
        report += `- ${results2.target}: Query time: ${result2.time?.toFixed(2) ?? 'N/A'} ms\n`;
        break;
    }
    
    report += '\n';
  }
  
  // Add conclusion
  report += '## Conclusion\n\n';
  
  if (type === 'ping' && results1.stats?.avgRtt && results2.stats?.avgRtt) {
    const diff = results1.stats.avgRtt - results2.stats.avgRtt;
    report += diff > 0
      ? `Overall, ${results2.target} has lower latency than ${results1.target} by an average of ${Math.abs(diff).toFixed(2)} ms.`
      : `Overall, ${results1.target} has lower latency than ${results2.target} by an average of ${Math.abs(diff).toFixed(2)} ms.`;
  } else if (type === 'http' && results1.stats?.avgResponseTime && results2.stats?.avgResponseTime) {
    const diff = results1.stats.avgResponseTime - results2.stats.avgResponseTime;
    report += diff > 0
      ? `Overall, ${results2.target} has faster response times than ${results1.target} by an average of ${Math.abs(diff).toFixed(2)} ms.`
      : `Overall, ${results1.target} has faster response times than ${results2.target} by an average of ${Math.abs(diff).toFixed(2)} ms.`;
  } else {
    report += `This comparison shows the performance characteristics of ${results1.target} and ${results2.target} from the same set of global probes.`;
  }
  
  return report;
}

/**
 * Format a measurement response for the MCP client
 * @param measurement The measurement response from Globalping
 * @returns Formatted MCP response
 */
function formatMcpResponse(measurement: MeasurementResponse): any {
  // Process the measurement results
  const results = processMeasurementResults(measurement);
  
  // Format the response based on the measurement type
  let summary = '';
  
  switch (measurement.type) {
    case 'ping':
      summary = formatPingSummary(results);
      break;
    case 'traceroute':
      summary = formatTracerouteSummary(results);
      break;
    case 'dns':
      summary = formatDnsSummary(results);
      break;
    case 'mtr':
      summary = formatMtrSummary(results);
      break;
    case 'http':
      summary = formatHttpSummary(results);
      break;
  }
  
  return {
    content: [
      {
        type: 'text',
        text: summary
      }
    ]
  };
}

/**
 * Format a ping measurement summary
 * @param results Processed ping results
 * @returns Formatted ping summary
 */
function formatPingSummary(results: any): string {
  let summary = `# Ping Results for ${results.target}\n\n`;
  
  summary += '## Summary\n\n';
  summary += `- Status: ${results.status}\n`;
  summary += `- Number of probes: ${results.probesCount}\n`;
  summary += `- Average RTT: ${results.results.stats?.avgRtt?.toFixed(2) ?? 'N/A'} ms\n`;
  summary += `- Average packet loss: ${results.results.stats?.avgPacketLoss?.toFixed(2) ?? 'N/A'}%\n\n`;
  
  summary += '## Detailed Results\n\n';
  
  for (const result of results.results.detailed) {
    summary += `### Probe: ${result.probe.location}, ${result.probe.network}\n\n`;
    summary += `- RTT Min: ${result.rtt.min?.toFixed(2) ?? 'N/A'} ms\n`;
    summary += `- RTT Avg: ${result.rtt.avg?.toFixed(2) ?? 'N/A'} ms\n`;
    summary += `- RTT Max: ${result.rtt.max?.toFixed(2) ?? 'N/A'} ms\n`;
    summary += `- Packet Loss: ${result.packetLoss?.toFixed(2) ?? 'N/A'}%\n`;
    summary += `- Resolved address: ${result.resolvedAddress ?? 'N/A'}\n\n`;
  }
  
  return summary;
}

/**
 * Format a traceroute measurement summary
 * @param results Processed traceroute results
 * @returns Formatted traceroute summary
 */
function formatTracerouteSummary(results: any): string {
  let summary = `# Traceroute Results for ${results.target}\n\n`;
  
  summary += '## Summary\n\n';
  summary += `- Status: ${results.status}\n`;
  summary += `- Number of probes: ${results.probesCount}\n`;
  summary += `- Average hop count: ${results.results.stats?.avgHopCount?.toFixed(2) ?? 'N/A'}\n\n`;
  
  summary += '## Detailed Results\n\n';
  
  for (const result of results.results.detailed) {
    summary += `### Probe: ${result.probe.location}, ${result.probe.network}\n\n`;
    summary += `- Resolved address: ${result.resolvedAddress ?? 'N/A'}\n`;
    summary += '- Path:\n\n';
    
    if (result.hops && result.hops.length > 0) {
      for (const hop of result.hops) {
        const rttValues = hop.rtt.filter((rtt: number) => rtt !== null).map((rtt: number) => `${rtt.toFixed(2)} ms`).join(', ');
        summary += `  ${hop.hopNumber}. ${hop.address || '*'} ${hop.hostname ? `(${hop.hostname})` : ''} - ${rttValues || 'N/A'}\n`;
      }
    } else {
      summary += '  No path information available\n';
    }
    
    summary += '\n';
  }
  
  return summary;
}

/**
 * Format a DNS measurement summary
 * @param results Processed DNS results
 * @returns Formatted DNS summary
 */
function formatDnsSummary(results: any): string {
  let summary = `# DNS Results for ${results.target}\n\n`;
  
  summary += '## Summary\n\n';
  summary += `- Status: ${results.status}\n`;
  summary += `- Number of probes: ${results.probesCount}\n`;
  summary += `- Average query time: ${results.results.stats?.avgQueryTime?.toFixed(2) ?? 'N/A'} ms\n\n`;
  
  summary += '## Detailed Results\n\n';
  
  for (const result of results.results.detailed) {
    summary += `### Probe: ${result.probe.location}, ${result.probe.network}\n\n`;
    
    if (result.trace) {
      summary += '- Trace: Yes\n';
      summary += '- Delegation path:\n\n';
      
      if (result.hops && result.hops.length > 0) {
        for (let i = 0; i < result.hops.length; i++) {
          const hop = result.hops[i];
          summary += `  ${i+1}. Resolver: ${hop.resolver}\n`;
          
          if (hop.answers && hop.answers.length > 0) {
            summary += '     Answers:\n';
            for (const answer of hop.answers) {
              summary += `     - ${answer.name} ${answer.ttl} ${answer.class} ${answer.type} ${answer.value}\n`;
            }
          } else {
            summary += '     No answers\n';
          }
          
          summary += `     Time: ${hop.time?.toFixed(2) ?? 'N/A'} ms\n\n`;
        }
      }
    } else {
      summary += `- Status: ${result.statusCodeName}\n`;
      summary += `- Resolver: ${result.resolver}\n`;
      summary += '- Answers:\n';
      
      if (result.answers && result.answers.length > 0) {
        for (const answer of result.answers) {
          summary += `  - ${answer.name} ${answer.ttl} ${answer.class} ${answer.type} ${answer.value}\n`;
        }
      } else {
        summary += '  No answers\n';
      }
      
      summary += `- Query time: ${result.time?.toFixed(2) ?? 'N/A'} ms\n\n`;
    }
  }
  
  return summary;
}

/**
 * Format an MTR measurement summary
 * @param results Processed MTR results
 * @returns Formatted MTR summary
 */
function formatMtrSummary(results: any): string {
  let summary = `# MTR Results for ${results.target}\n\n`;
  
  summary += '## Summary\n\n';
  summary += `- Status: ${results.status}\n`;
  summary += `- Number of probes: ${results.probesCount}\n`;
  summary += `- Average hop count: ${results.results.stats?.avgHopCount?.toFixed(2) ?? 'N/A'}\n\n`;
  
  summary += '## Detailed Results\n\n';
  
  for (const result of results.results.detailed) {
    summary += `### Probe: ${result.probe.location}, ${result.probe.network}\n\n`;
    summary += `- Resolved address: ${result.resolvedAddress ?? 'N/A'}\n`;
    summary += '- Path:\n\n';
    
    if (result.hops && result.hops.length > 0) {
      for (const hop of result.hops) {
        const asnInfo = hop.asn ? ` [AS${hop.asn.join(', AS')}]` : '';
        summary += `  ${hop.hopNumber}. ${hop.address || '*'} ${hop.hostname ? `(${hop.hostname})` : ''}${asnInfo}\n`;
        summary += `     Loss: ${hop.stats.loss?.toFixed(2) ?? 'N/A'}%, RTT: ${hop.stats.avg?.toFixed(2) ?? 'N/A'} ms (min: ${hop.stats.min?.toFixed(2) ?? 'N/A'} ms, max: ${hop.stats.max?.toFixed(2) ?? 'N/A'} ms)\n`;
      }
    } else {
      summary += '  No path information available\n';
    }
    
    summary += '\n';
  }
  
  return summary;
}

/**
 * Format an HTTP measurement summary
 * @param results Processed HTTP results
 * @returns Formatted HTTP summary
 */
function formatHttpSummary(results: any): string {
  let summary = `# HTTP Results for ${results.target}\n\n`;
  
  summary += '## Summary\n\n';
  summary += `- Status: ${results.status}\n`;
  summary += `- Number of probes: ${results.probesCount}\n`;
  summary += `- Average response time: ${results.results.stats?.avgResponseTime?.toFixed(2) ?? 'N/A'} ms\n`;
  
  if (results.results.stats?.statusCodeDistribution) {
    summary += '- Status code distribution:\n';
    for (const [code, count] of Object.entries(results.results.stats.statusCodeDistribution)) {
      summary += `  - ${code}: ${count} probes\n`;
    }
  }
  
  summary += '\n## Detailed Results\n\n';
  
  for (const result of results.results.detailed) {
    summary += `### Probe: ${result.probe.location}, ${result.probe.network}\n\n`;
    summary += `- Status: ${result.statusCode} ${result.statusCodeName}\n`;
    summary += `- Resolved address: ${result.resolvedAddress ?? 'N/A'}\n`;
    summary += '- Timings:\n';
    summary += `  - Total: ${result.timings.total?.toFixed(2) ?? 'N/A'} ms\n`;
    summary += `  - DNS: ${result.timings.dns?.toFixed(2) ?? 'N/A'} ms\n`;
    summary += `  - TCP: ${result.timings.tcp?.toFixed(2) ?? 'N/A'} ms\n`;
    summary += `  - TLS: ${result.timings.tls?.toFixed(2) ?? 'N/A'} ms\n`;
    summary += `  - First byte: ${result.timings.firstByte?.toFixed(2) ?? 'N/A'} ms\n`;
    summary += `  - Download: ${result.timings.download?.toFixed(2) ?? 'N/A'} ms\n`;
    
    if (result.tls) {
      summary += '- TLS:\n';
      summary += `  - Protocol: ${result.tls.protocol}\n`;
      summary += `  - Authorized: ${result.tls.authorized}\n`;
      summary += `  - Expires at: ${result.tls.expiresAt}\n`;
    }
    
    summary += '\n';
  }
  
  return summary;
}
