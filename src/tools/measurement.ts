/**
 * Core measurement functionality for processing Globalping measurement results
 */
import {
  MeasurementResponse,
  MeasurementResultItem,
  MeasurementType,
  TestResult
} from '../types/globalping.js';

/**
 * Process a measurement and format the results for MCP clients
 * @param measurement The measurement response from Globalping
 * @returns Formatted results for the MCP client
 */
export function processMeasurementResults(measurement: MeasurementResponse): any {
  // Extract basic information
  const { id, type, target, status, createdAt, updatedAt, probesCount, results } = measurement;

  // Create a summary object
  const summary = {
    id,
    type,
    target,
    status,
    createdAt,
    updatedAt,
    probesCount,
    results: processByMeasurementType(type, results)
  };

  return summary;
}

/**
 * Process results based on measurement type
 * @param type The measurement type
 * @param results The measurement results from all probes
 * @returns Processed results formatted by measurement type
 */
function processByMeasurementType(type: MeasurementType, results: MeasurementResultItem[]): any {
  // Filter out only the finished results
  const finishedResults = results.filter(r => r.result.status === 'finished');
  
  // Create detailed results based on the measurement type
  const detailedResults = finishedResults.map(result => {
    const { probe, result: testResult } = result;
    
    // Common information for all probe results
    const probeInfo = {
      location: formatLocation(probe),
      network: probe.network,
      asn: probe.asn,
      tags: probe.tags
    };

    // Format the result based on the measurement type
    return {
      probe: probeInfo,
      ...formatTestResult(type, testResult)
    };
  });

  // Create aggregate statistics
  const stats = calculateAggregateStats(type, finishedResults);

  return {
    detailed: detailedResults,
    stats,
    rawCount: results.length,
    successCount: finishedResults.length
  };
}

/**
 * Format a probe location for display
 * @param probe The probe location information
 * @returns Formatted location string
 */
function formatLocation(probe: any): string {
  const parts = [];
  
  if (probe.city) {
    parts.push(probe.city);
  }
  
  if (probe.state) {
    parts.push(probe.state);
  }
  
  if (probe.country) {
    parts.push(probe.country);
  }
  
  if (probe.continent) {
    parts.push(getFullContinentName(probe.continent));
  }
  
  return parts.join(', ');
}

/**
 * Format test results based on measurement type
 * @param type The measurement type
 * @param result The test result
 * @returns Formatted test result
 */
function formatTestResult(type: MeasurementType, result: TestResult): any {
  switch (type) {
    case 'ping':
      return formatPingResult(result);
    case 'traceroute':
      return formatTracerouteResult(result);
    case 'dns':
      return formatDnsResult(result);
    case 'mtr':
      return formatMtrResult(result);
    case 'http':
      return formatHttpResult(result);
    default:
      return { raw: result };
  }
}

/**
 * Format ping test results
 * @param result The ping test result
 * @returns Formatted ping result
 */
function formatPingResult(result: TestResult): any {
  return {
    resolvedAddress: result.resolvedAddress,
    rtt: {
      min: result.stats?.min ?? null,
      avg: result.stats?.avg ?? null,
      max: result.stats?.max ?? null,
    },
    packetLoss: result.stats?.loss ?? 0,
    packets: {
      sent: result.stats?.total ?? 0,
      received: result.stats?.rcv ?? 0,
      dropped: result.stats?.drop ?? 0
    },
    timings: result.timings
  };
}

/**
 * Format traceroute test results
 * @param result The traceroute test result
 * @returns Formatted traceroute result
 */
function formatTracerouteResult(result: TestResult): any {
  return {
    resolvedAddress: result.resolvedAddress,
    hops: result.hops?.map((hop, index) => ({
      hopNumber: index + 1,
      address: hop.resolvedAddress,
      hostname: hop.resolvedHostname,
      rtt: hop.timings?.map(t => t.rtt) ?? []
    }))
  };
}

/**
 * Format DNS test results
 * @param result The DNS test result
 * @returns Formatted DNS result
 */
function formatDnsResult(result: TestResult): any {
  if (result.hops) {
    // This is a trace DNS result
    return {
      trace: true,
      hops: result.hops.map(hop => ({
        resolver: hop.resolver,
        answers: hop.answers,
        time: hop.timings?.total
      }))
    };
  } else {
    // This is a simple DNS result
    return {
      trace: false,
      statusCode: result.statusCode,
      statusCodeName: result.statusCodeName,
      resolver: (result as any).resolver,
      answers: (result as any).answers,
      time: (result as any).timings?.total
    };
  }
}

/**
 * Format MTR test results
 * @param result The MTR test result
 * @returns Formatted MTR result
 */
function formatMtrResult(result: TestResult): any {
  return {
    resolvedAddress: result.resolvedAddress,
    resolvedHostname: result.resolvedHostname,
    hops: result.hops?.map((hop, index) => ({
      hopNumber: index + 1,
      address: hop.resolvedAddress,
      hostname: hop.resolvedHostname,
      asn: hop.asn,
      stats: {
        min: hop.stats?.min,
        avg: hop.stats?.avg,
        max: hop.stats?.max,
        loss: hop.stats?.loss
      }
    }))
  };
}

/**
 * Format HTTP test results
 * @param result The HTTP test result
 * @returns Formatted HTTP result
 */
function formatHttpResult(result: TestResult): any {
  return {
    resolvedAddress: result.resolvedAddress,
    statusCode: result.statusCode,
    statusCodeName: result.statusCodeName,
    headers: result.headers,
    timings: {
      total: (result as any).timings?.total,
      dns: (result as any).timings?.dns,
      tcp: (result as any).timings?.tcp,
      tls: (result as any).timings?.tls,
      firstByte: (result as any).timings?.firstByte,
      download: (result as any).timings?.download
    },
    tls: (result as any).tls ? {
      protocol: (result as any).tls.protocol,
      authorized: (result as any).tls.authorized,
      expiresAt: (result as any).tls.expiresAt
    } : null,
    bodyTruncated: (result as any).truncated
  };
}

/**
 * Calculate aggregate statistics for all probes
 * @param type The measurement type
 * @param results The measurement results from all probes
 * @returns Aggregate statistics
 */
function calculateAggregateStats(type: MeasurementType, results: MeasurementResultItem[]): any {
  switch (type) {
    case 'ping':
      return calculatePingStats(results);
    case 'http':
      return calculateHttpStats(results);
    case 'traceroute':
    case 'mtr':
      return calculatePathStats(results);
    case 'dns':
      return calculateDnsStats(results);
    default:
      return {};
  }
}

/**
 * Calculate ping statistics across all probes
 * @param results The ping measurement results
 * @returns Aggregate ping statistics
 */
function calculatePingStats(results: MeasurementResultItem[]): any {
  const rtts = results
    .filter(r => r.result.status === 'finished' && r.result.stats?.avg !== null)
    .map(r => r.result.stats!.avg!);

  const packetLoss = results
    .filter(r => r.result.status === 'finished')
    .map(r => r.result.stats?.loss ?? 0);

  if (rtts.length === 0) return { avgRtt: null, avgPacketLoss: null };

  return {
    avgRtt: calculateAverage(rtts),
    minRtt: Math.min(...rtts),
    maxRtt: Math.max(...rtts),
    avgPacketLoss: calculateAverage(packetLoss)
  };
}

/**
 * Calculate HTTP statistics across all probes
 * @param results The HTTP measurement results
 * @returns Aggregate HTTP statistics
 */
function calculateHttpStats(results: MeasurementResultItem[]): any {
  const totalTimes = results
    .filter(r => r.result.status === 'finished' && (r.result as any).timings?.total)
    .map(r => (r.result as any).timings.total);

  const statusCodes = results
    .filter(r => r.result.status === 'finished' && r.result.statusCode)
    .map(r => r.result.statusCode);

  // Count status code occurrences
  const statusCodeCounts = statusCodes.reduce((acc, code) => {
    acc[code!] = (acc[code!] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  return {
    avgResponseTime: totalTimes.length > 0 ? calculateAverage(totalTimes) : null,
    statusCodeDistribution: statusCodeCounts,
    successRate: statusCodes.filter(code => code && code >= 200 && code < 300).length / statusCodes.length
  };
}

/**
 * Calculate path-based statistics (traceroute, MTR)
 * @param results The traceroute or MTR measurement results
 * @returns Aggregate path statistics
 */
function calculatePathStats(results: MeasurementResultItem[]): any {
  const hopCounts = results
    .filter(r => r.result.status === 'finished' && r.result.hops)
    .map(r => r.result.hops!.length);

  return {
    avgHopCount: hopCounts.length > 0 ? calculateAverage(hopCounts) : null,
    minHopCount: hopCounts.length > 0 ? Math.min(...hopCounts) : null,
    maxHopCount: hopCounts.length > 0 ? Math.max(...hopCounts) : null
  };
}

/**
 * Calculate DNS statistics across all probes
 * @param results The DNS measurement results
 * @returns Aggregate DNS statistics
 */
function calculateDnsStats(results: MeasurementResultItem[]): any {
  const queryTimes = results
    .filter(r => r.result.status === 'finished' && (r.result as any).timings?.total)
    .map(r => (r.result as any).timings.total);

  const statusCodes = results
    .filter(r => r.result.status === 'finished' && r.result.statusCode !== undefined)
    .map(r => r.result.statusCode!);

  // Success rate based on NOERROR status code (0)
  const successfulQueries = statusCodes.filter(code => code === 0).length;

  return {
    avgQueryTime: queryTimes.length > 0 ? calculateAverage(queryTimes) : null,
    successRate: statusCodes.length > 0 ? successfulQueries / statusCodes.length : null
  };
}

/**
 * Calculate the average of an array of numbers
 * @param values Array of numbers
 * @returns Average value
 */
function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/**
 * Get the full continent name from the code
 * @param code Continent code (e.g., 'NA')
 * @returns Full continent name
 */
function getFullContinentName(code: string): string {
  const continents: Record<string, string> = {
    'AF': 'Africa',
    'AN': 'Antarctica',
    'AS': 'Asia',
    'EU': 'Europe',
    'NA': 'North America',
    'OC': 'Oceania',
    'SA': 'South America'
  };
  
  return continents[code] || code;
}
