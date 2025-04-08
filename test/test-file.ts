/**
 * Tests for the Globalping API client
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GlobalpingClient } from '../src/api/globalping-client';

// Mock fetch globally
vi.stubGlobal('fetch', vi.fn());

describe('GlobalpingClient', () => {
  let client: GlobalpingClient;
  
  beforeEach(() => {
    client = new GlobalpingClient();
    vi.resetAllMocks();
  });
  
  describe('createMeasurement', () => {
    it('should create a measurement with the correct parameters', async () => {
      // Mock successful response
      const mockResponse = {
        id: 'test-id-123',
        probesCount: 3
      };
      
      // Setup the fetch mock
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });
      
      // Call the method
      const result = await client.createMeasurement({
        type: 'ping',
        target: 'example.com',
        locations: [{ magic: 'London' }, { magic: 'New York' }],
        limit: 3,
        measurementOptions: {
          packets: 5
        }
      });
      
      // Check the result
      expect(result).toEqual(mockResponse);
      
      // Check that fetch was called correctly
      expect(fetch).toHaveBeenCalledWith(
        'https://api.globalping.io/v1/measurements',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'User-Agent': expect.any(String)
          }),
          body: expect.any(String)
        })
      );
      
      // Check that the body was correct
      const requestBody = JSON.parse((fetch as any).mock.calls[0][1].body);
      expect(requestBody).toEqual({
        type: 'ping',
        target: 'example.com',
        locations: [{ magic: 'London' }, { magic: 'New York' }],
        limit: 3,
        measurementOptions: {
          packets: 5
        }
      });
    });
    
    it('should include the token in headers when provided', async () => {
      // Mock successful response
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'test-id-123', probesCount: 3 })
      });
      
      // Call the method with a token
      await client.createMeasurement({
        type: 'ping',
        target: 'example.com'
      }, 'test-token-123');
      
      // Check that the token was included in the headers
      expect(fetch).toHaveBeenCalledWith(
        'https://api.globalping.io/v1/measurements',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token-123'
          })
        })
      );
    });
    
    it('should throw an error when the API returns an error', async () => {
      // Mock error response
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: {
            type: 'validation_error',
            message: 'Invalid parameters',
            params: {
              target: 'Target is required'
            }
          }
        })
      });
      
      // Call the method and expect it to throw
      await expect(client.createMeasurement({
        type: 'ping',
        target: ''
      })).rejects.toThrow('Globalping API error: Invalid parameters');
    });
  });
  
  describe('getMeasurement', () => {
    it('should retrieve a measurement by ID', async () => {
      // Mock successful response
      const mockResponse = {
        id: 'test-id-123',
        type: 'ping',
        target: 'example.com',
        status: 'finished',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:01Z',
        probesCount: 3,
        results: []
      };
      
      // Setup the fetch mock
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });
      
      // Call the method
      const result = await client.getMeasurement('test-id-123');
      
      // Check the result
      expect(result).toEqual(mockResponse);
      
      // Check that fetch was called correctly
      expect(fetch).toHaveBeenCalledWith(
        'https://api.globalping.io/v1/measurements/test-id-123',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.any(String)
          })
        })
      );
    });
    
    it('should throw an error when the API returns an error', async () => {
      // Mock error response
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: {
            type: 'not_found',
            message: 'Measurement not found'
          }
        })
      });
      
      // Call the method and expect it to throw
      await expect(client.getMeasurement('non-existent-id')).rejects.toThrow('Globalping API error: Measurement not found');
    });
  });
  
  describe('pollMeasurementUntilComplete', () => {
    it('should poll until the measurement is complete', async () => {
      // Mock responses
      const inProgressResponse = {
        id: 'test-id-123',
        type: 'ping',
        target: 'example.com',
        status: 'in-progress',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:01Z',
        probesCount: 3,
        results: []
      };
      
      const finishedResponse = {
        ...inProgressResponse,
        status: 'finished'
      };
      
      // Setup the fetch mock to return in-progress first, then finished
      (fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => inProgressResponse
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => finishedResponse
        });
      
      // Mock setTimeout
      vi.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return 0 as any;
      });
      
      // Call the method
      const result = await client.pollMeasurementUntilComplete('test-id-123');
      
      // Check the result
      expect(result).toEqual(finishedResponse);
      
      // Check that fetch was called twice
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });
});
