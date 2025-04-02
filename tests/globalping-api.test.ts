/**
 * Tests for the Globalping API client module
 */

import axios from 'axios';
import { 
    createMeasurement, 
    getMeasurementResult,
    pollForResult,
    MeasurementRequest,
    CreateMeasurementResponse,
    MeasurementResult
} from '../src/globalping/api';

// Mock axios to avoid making actual API calls during tests
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Globalping API Client', () => {
    // Reset mocks before each test
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    describe('createMeasurement', () => {
        const mockRequest: MeasurementRequest = {
            type: 'ping',
            target: 'example.com',
            measurementOptions: {
                packets: 4
            }
        };

        const mockResponse: CreateMeasurementResponse = {
            id: 'test-measurement-id',
            probesCount: 5,
            probesRequested: 5,
            url: 'https://api.globalping.io/v1/measurements/test-measurement-id'
        };

        it('should create a measurement successfully', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

            const result = await createMeasurement(mockRequest);

            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://api.globalping.io/v1/measurements',
                { ...mockRequest, inProgressUpdates: false },
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'User-Agent': expect.any(String),
                        'Content-Type': 'application/json'
                    })
                })
            );
            expect(result).toEqual(mockResponse);
        });

        it('should include Authorization header when token is provided', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });
            const apiToken = 'test-token';

            await createMeasurement(mockRequest, apiToken);

            expect(mockedAxios.post).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(Object),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': `Bearer ${apiToken}`
                    })
                })
            );
        });

        it('should handle errors and return null', async () => {
            const error = new Error('Network error');
            mockedAxios.post.mockRejectedValueOnce(error);

            const result = await createMeasurement(mockRequest);

            expect(console.error).toHaveBeenCalled();
            expect(result).toBeNull();
        });
    });

    describe('getMeasurementResult', () => {
        const measurementId = 'test-measurement-id';
        const mockResult: MeasurementResult = {
            id: measurementId,
            type: 'ping',
            status: 'finished',
            createdAt: '2025-04-02T14:48:20Z',
            updatedAt: '2025-04-02T14:48:30Z',
            probesCount: 5,
            results: []
        };

        it('should get measurement result successfully', async () => {
            mockedAxios.get.mockResolvedValueOnce({ data: mockResult });

            const result = await getMeasurementResult(measurementId);

            expect(mockedAxios.get).toHaveBeenCalledWith(
                `https://api.globalping.io/v1/measurements/${measurementId}`,
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'User-Agent': expect.any(String)
                    })
                })
            );
            expect(result).toEqual(mockResult);
        });

        it('should include Authorization header when token is provided', async () => {
            mockedAxios.get.mockResolvedValueOnce({ data: mockResult });
            const apiToken = 'test-token';

            await getMeasurementResult(measurementId, apiToken);

            expect(mockedAxios.get).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': `Bearer ${apiToken}`
                    })
                })
            );
        });

        it('should handle 404 errors quietly', async () => {
            const axiosError = {
                response: {
                    status: 404,
                    data: { message: 'Measurement not found' }
                },
                message: '404 Not Found'
            };
            mockedAxios.get.mockRejectedValueOnce(axiosError);

            const result = await getMeasurementResult(measurementId);

            // Should not log 404 errors
            expect(console.error).not.toHaveBeenCalledWith(
                expect.stringContaining('Error fetching measurement')
            );
            expect(result).toBeNull();
        });

        it('should handle other errors and log them', async () => {
            const axiosError = {
                response: {
                    status: 500,
                    data: { message: 'Internal Server Error' }
                },
                message: '500 Internal Server Error'
            };
            mockedAxios.get.mockRejectedValueOnce(axiosError);

            const result = await getMeasurementResult(measurementId);

            expect(console.error).toHaveBeenCalled();
            expect(result).toBeNull();
        });
    });

    describe('pollForResult', () => {
        const measurementId = 'test-measurement-id';
        const finishedResult: MeasurementResult = {
            id: measurementId,
            type: 'ping',
            status: 'finished',
            createdAt: '2025-04-02T14:48:20Z',
            updatedAt: '2025-04-02T14:48:30Z',
            probesCount: 5,
            results: []
        };

        // Explicitly clear all mocks for each test
        beforeEach(() => {
            jest.clearAllMocks();
        });

        // Test for when measurement immediately returns as finished
        it('should return result when measurement is immediately finished', async () => {
            // Mock the axios get call to return a finished result
            mockedAxios.get.mockResolvedValueOnce({ data: finishedResult });
            
            // Call pollForResult
            const result = await pollForResult(measurementId);
            
            // Verify the result
            expect(mockedAxios.get).toHaveBeenCalledTimes(1);
            expect(result).toEqual(finishedResult);
        });
        
        // Test for when measurement immediately returns as failed
        it('should return result when measurement has failed', async () => {
            const failedResult = { ...finishedResult, status: 'failed' as const };
            
            // Mock axios to return failed result
            mockedAxios.get.mockResolvedValueOnce({ data: failedResult });
            
            // Call pollForResult
            const result = await pollForResult(measurementId);
            
            // Verify result
            expect(result).toEqual(failedResult);
            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('failed')
            );
        });

        // Test for timeout scenario by mocking the Date.now function
        it('should timeout after specified duration', async () => {
            // Mock implementation to simulate timeout
            // This is the key change - we're directly mocking the implementation of pollForResult
            // to simulate a timeout without relying on timer mocks
            
            // Save original implementation
            const originalDateNow = Date.now;
            
            try {
                // Create a mock for Date.now that will simulate time passing
                let time = 0;
                Date.now = jest.fn().mockImplementation(() => {
                    // Increment by 1000ms each time Date.now is called
                    time += 1000; 
                    return time;
                });
                
                // Mock axios to always return in-progress
                const inProgressResult = { ...finishedResult, status: 'in-progress' as const };
                mockedAxios.get.mockResolvedValue({ data: inProgressResult });
                
                // Call with short timeout to speed up test execution
                const result = await pollForResult(measurementId, undefined, 5000, 1000);
                
                // Verify axios was called multiple times (at least once)
                expect(mockedAxios.get.mock.calls.length).toBeGreaterThanOrEqual(1);
                
                // Result should be null due to timeout
                expect(result).toBeNull();
                
                // Verify appropriate error was logged
                expect(console.error).toHaveBeenCalledWith(
                    expect.stringContaining('Polling timed out')
                );
            } finally {
                // Restore original Date.now
                Date.now = originalDateNow;
            }
        });
    });
});
