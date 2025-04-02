/**
 * Tests for the MCP server formatting functions
 * 
 * This tests the formatting functions that create human-readable output from 
 * Globalping API results for display to MCP clients.
 */

import { MeasurementResult } from '../src/globalping/api';
import { formatMeasurementResult } from '../src/server';

describe('Globalping Result Formatting', () => {
    it('should format ping results correctly', () => {
        const pingResult: MeasurementResult = {
            id: 'test-id',
            type: 'ping',
            status: 'finished' as const,
            createdAt: '2023-01-01T12:00:00Z',
            updatedAt: '2023-01-01T12:00:10Z',
            probesCount: 1,
            results: [
                {
                    location: { city: 'New York', country: 'US' },
                    result: {
                        stats: { min: 10, max: 20, avg: 15, stddev: 5, packetLoss: 0 },
                        packets: [{ rtt: 10 }, { rtt: 15 }, { rtt: 20 }]
                    }
                }
            ]
        };

        const formatted = formatMeasurementResult(pingResult, 'ping', 'example.com');
        
        // Basic validation of the formatting
        expect(formatted).toContain('Globalping ping results for example.com');
        expect(formatted).toContain('Min: 10ms, Max: 20ms, Avg: 15ms');
        expect(formatted).toContain('Packet Loss: 0%');
    });

    it('should format traceroute results correctly', () => {
        const tracerouteResult: MeasurementResult = {
            id: 'test-id',
            type: 'traceroute',
            status: 'finished' as const,
            createdAt: '2023-01-01T12:00:00Z',
            updatedAt: '2023-01-01T12:00:10Z',
            probesCount: 1,
            results: [
                {
                    location: { city: 'New York', country: 'US' },
                    result: {
                        hops: [
                            { hop: 1, ip: '192.168.1.1', rtt: 5, location: { city: 'Local', country: 'US' } },
                            { hop: 2, ip: '10.0.0.1', rtt: 15, location: { city: 'Router', country: 'US' } }
                        ]
                    }
                }
            ]
        };

        const formatted = formatMeasurementResult(tracerouteResult, 'traceroute', 'example.com');
        
        // Basic validation of the formatting
        expect(formatted).toContain('Globalping traceroute results for example.com');
        expect(formatted).toContain('Hop  IP Address        RTT     Location');
        expect(formatted).toContain('1    192.168.1.1      5ms');
    });
    
    it('should handle empty results gracefully', () => {
        const emptyResult: MeasurementResult = {
            id: 'test-id',
            type: 'ping',
            status: 'finished' as const,
            createdAt: '2023-01-01T12:00:00Z',
            updatedAt: '2023-01-01T12:00:10Z',
            probesCount: 0,
            results: []
        };

        const formatted = formatMeasurementResult(emptyResult, 'ping', 'example.com');
        
        // Should contain header info but show no results
        expect(formatted).toContain('Globalping ping results for example.com');
        expect(formatted).toContain('No results returned');
    });
});
