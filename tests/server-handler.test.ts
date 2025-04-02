/**
 * Tests for the Globalping MCP handlers
 * 
 * This file tests the handler functions that process measurement requests
 * and interact with the Globalping API.
 */

// Set NODE_ENV to 'test' before any imports to prevent server initialization
process.env.NODE_ENV = 'test';
// Set up API token for testing
process.env.GLOBALPING_API_TOKEN = 'test-token';

import { MeasurementResult } from '../src/globalping/api.js';
import * as api from '../src/globalping/api.js';
import { __test__ } from '../src/server.js';

// Extract the handler function to test directly
const { handleGlobalpingRequest } = __test__;

// Mock axios-based modules
jest.mock('axios');

// Mock the globalping API module
jest.mock('../src/globalping/api.js', () => {
  // Save original module for type access
  const originalModule = jest.requireActual('../src/globalping/api.js');
  
  // Create mock functions
  return {
    __esModule: true,
    ...originalModule,
    createMeasurement: jest.fn(),
    pollForResult: jest.fn(),
  };
});

// Mock external dependencies to prevent startup
jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn().mockImplementation(() => ({
    onDisconnect: jest.fn(),
    close: jest.fn(),
  })),
}));

jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    tool: jest.fn(),
  })),
}));

describe('Globalping Handler Functions', () => {
  // Mock responses
  const mockCreateResponse = {
    id: 'test-measurement-id',
    probesCount: 3,
    probesRequested: 3,
    url: 'https://api.globalping.io/v1/measurements/test-measurement-id'
  };

  // Sample ping result
  const mockPingResult: MeasurementResult = {
    id: 'test-measurement-id',
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

  // Set up and tear down for each test
  beforeEach(() => {
    // Clear mock state
    jest.clearAllMocks();
    
    // Suppress console error output during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.error
    jest.restoreAllMocks();
  });

  /**
   * Test successful ping request flow
   */
  it('should process a ping request and return formatted results', async () => {
    // Set up mocks
    (api.createMeasurement as jest.Mock).mockResolvedValue(mockCreateResponse);
    (api.pollForResult as jest.Mock).mockResolvedValue(mockPingResult);

    // Call the handler
    const params = { target: 'example.com', packets: 4 };
    const result = await handleGlobalpingRequest('ping', params);

    // Verify expected behavior
    expect(api.createMeasurement).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ping',
        target: 'example.com',
        limit: expect.any(Number),
        measurementOptions: expect.objectContaining({
          packets: 4
        })
      }),
      'test-token'
    );

    expect(api.pollForResult).toHaveBeenCalledWith(
      'test-measurement-id',
      'test-token'
    );

    // Check response format
    expect(result).toHaveProperty('content');
    expect(result.content[0]).toHaveProperty('text');
    expect(result.content[0].text).toContain('Globalping ping results for example.com');
    expect(result.isError).toBeFalsy();
  });

  /**
   * Test failed API creation
   */
  it('should handle failed measurement creation', async () => {
    // Mock API failure
    (api.createMeasurement as jest.Mock).mockResolvedValue(null);

    // Call the handler
    const params = { target: 'example.com' };
    const result = await handleGlobalpingRequest('ping', params);

    // Verify error response
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Failed to create ping measurement');
  });

  /**
   * Test polling timeout
   */
  it('should handle polling timeout', async () => {
    // Set up mocks for creation success but polling failure
    (api.createMeasurement as jest.Mock).mockResolvedValue(mockCreateResponse);
    (api.pollForResult as jest.Mock).mockResolvedValue(null);

    // Call the handler
    const params = { target: 'example.com' };
    const result = await handleGlobalpingRequest('ping', params);

    // Verify error response
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Polling timed out or failed');
  });

  /**
   * Test error handling for exceptions
   */
  it('should handle unexpected errors during API calls', async () => {
    // Mock an exception
    (api.createMeasurement as jest.Mock).mockRejectedValue(
      new Error('Network connection error')
    );

    // Call the handler
    const params = { target: 'example.com' };
    const result = await handleGlobalpingRequest('ping', params);

    // Verify error response
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('internal error occurred');
    expect(result.content[0].text).toContain('Network connection error');
  });

  /**
   * Test limit parameter handling
   */
  it('should use default probe limit if not specified', async () => {
    // Set up mocks
    (api.createMeasurement as jest.Mock).mockResolvedValue(mockCreateResponse);
    (api.pollForResult as jest.Mock).mockResolvedValue(mockPingResult);

    // Call without limit parameter
    const params = { target: 'example.com' };
    await handleGlobalpingRequest('ping', params);

    // Verify default limit was used
    expect(api.createMeasurement).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 3 // DEFAULT_PROBE_LIMIT value
      }),
      expect.any(String)
    );
  });

  /**
   * Test handler for different measurement types
   */
  it('should properly format traceroute measurement options', async () => {
    // Set up mocks
    (api.createMeasurement as jest.Mock).mockResolvedValue(mockCreateResponse);
    (api.pollForResult as jest.Mock).mockResolvedValue({
      ...mockPingResult,
      type: 'traceroute'
    });

    // Call with traceroute type
    const params = { 
      target: 'example.com',
      protocol: 'ICMP',
      port: 443,
      ipVersion: '4' as const
    };
    await handleGlobalpingRequest('traceroute', params);

    // Verify traceroute options were properly formatted
    expect(api.createMeasurement).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'traceroute',
        measurementOptions: expect.objectContaining({
          protocol: 'ICMP',
          port: 443,
          ipVersion: '4',
          packets: expect.any(Number)
        })
      }),
      expect.any(String)
    );
  });
});
