/**
 * Globalping API Client Module
 * 
 * This module provides functions to interact with the Globalping HTTP API.
 * It handles creating measurements and polling for their results.
 */

import axios, { AxiosError } from 'axios';

/**
 * Constants for the Globalping API
 */
const GLOBALPING_API_URL = "https://api.globalping.io/v1";
const USER_AGENT = "Globalping-MCP-Server (https://github.com/jsdelivr/globalping-mcp-server)"; // Replace with your repo URL later

/**
 * Basic interface for the measurement request payload
 */
export interface MeasurementRequest {
    type: 'ping' | 'traceroute' | 'dns' | 'mtr' | 'http';
    target: string;
    locations?: { 
        country?: string; 
        continent?: string; 
        region?: string; 
        city?: string; 
        asn?: number; 
        network?: string; 
        tag?: string; 
        limit?: number 
    }[];
    measurementOptions?: {
        packets?: number; // For ping, traceroute, mtr
        port?: number; // For traceroute, dns, mtr, http
        protocol?: string; // For traceroute, dns, mtr, http
        ipVersion?: 4 | 6; // Global
        // Add other measurement-specific options as needed
        [key: string]: any; // Allow additional properties
    };
    limit?: number; // Global limit for probes
    inProgressUpdates?: boolean; // Always false for HTTP API polling
}

/**
 * Interface for the response when creating a measurement
 */
export interface CreateMeasurementResponse {
    id: string;
    probesCount: number;
    probesRequested: number;
    url: string; // URL to check measurement status/results
}

/**
 * Interface for the measurement result (can be complex, start simple)
 */
export interface MeasurementResult {
    id: string;
    type: string;
    status: 'in-progress' | 'finished' | 'failed';
    createdAt: string;
    updatedAt: string;
    probesCount: number;
    results: any[]; // Results structure varies greatly by type, 'any[]' for now
}

/**
 * Creates a new measurement request via the Globalping HTTP API.
 * 
 * @param requestPayload - The measurement request details.
 * @param apiToken - Optional Globalping API token.
 * @returns The response from the API containing the measurement ID and URL.
 */
export async function createMeasurement(
    requestPayload: MeasurementRequest,
    apiToken?: string
): Promise<CreateMeasurementResponse | null> {
    const url = `${GLOBALPING_API_URL}/measurements`;
    const headers: Record<string, string> = {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/json',
    };

    if (apiToken) {
        headers['Authorization'] = `Bearer ${apiToken}`;
    }

    // Ensure inProgressUpdates is false for HTTP polling
    requestPayload.inProgressUpdates = false;

    console.error(`[Globalping API] Creating measurement: ${requestPayload.type} to ${requestPayload.target}`); // Log to stderr

    try {
        const response = await axios.post<CreateMeasurementResponse>(url, requestPayload, { headers });
        console.error(`[Globalping API] Measurement created successfully. ID: ${response.data.id}`); // Log to stderr
        return response.data;
    } catch (error) {
        const axiosError = error as AxiosError;
        console.error(`[Globalping API] Error creating measurement: ${axiosError.message}`); // Log to stderr
        if (axiosError.response) {
            console.error(`[Globalping API] Response Status: ${axiosError.response.status}`); // Log to stderr
            console.error(`[Globalping API] Response Data:`, axiosError.response.data); // Log to stderr
        }
        return null;
    }
}

/**
 * Fetches the result of a specific measurement by its ID.
 * 
 * @param measurementId - The ID of the measurement.
 * @param apiToken - Optional Globalping API token.
 * @returns The measurement result object.
 */
export async function getMeasurementResult(
    measurementId: string,
    apiToken?: string
): Promise<MeasurementResult | null> {
    const url = `${GLOBALPING_API_URL}/measurements/${measurementId}`;
    const headers: Record<string, string> = {
        'User-Agent': USER_AGENT,
    };

    if (apiToken) {
        headers['Authorization'] = `Bearer ${apiToken}`;
    }

    // console.error(`[Globalping API] Fetching result for measurement ID: ${measurementId}`); // Potentially too verbose

    try {
        const response = await axios.get<MeasurementResult>(url, { headers });
        return response.data;
    } catch (error) {
        const axiosError = error as AxiosError;
        // Don't log 404s excessively during polling, but log other errors
        if (axiosError.response?.status !== 404) {
            console.error(`[Globalping API] Error fetching measurement result for ${measurementId}: ${axiosError.message}`); // Log to stderr
            if (axiosError.response) {
                console.error(`[Globalping API] Response Status: ${axiosError.response.status}`); // Log to stderr
                console.error(`[Globalping API] Response Data:`, axiosError.response.data); // Log to stderr
            }
        } else {
            // Measurement might still be in progress or just created
            // console.error(`[Globalping API] Measurement ${measurementId} not found yet (404).`);
        }
        return null;
    }
}

/**
 * Polls the Globalping API for the result of a measurement until it's finished or failed.
 * 
 * @param measurementId - The ID of the measurement to poll.
 * @param apiToken - Optional Globalping API token.
 * @param timeoutMs - Maximum time to poll in milliseconds.
 * @param intervalMs - Interval between polling attempts in milliseconds.
 * @returns The final measurement result, or null if timed out or an error occurred.
 */
export async function pollForResult(
    measurementId: string,
    apiToken?: string,
    timeoutMs: number = 60000, // Default timeout 60 seconds
    intervalMs: number = 2000   // Default interval 2 seconds
): Promise<MeasurementResult | null> {
    const startTime = Date.now();
    console.error(`[Globalping API] Polling for result of measurement ${measurementId}...`); // Log to stderr

    while (Date.now() - startTime < timeoutMs) {
        const result = await getMeasurementResult(measurementId, apiToken);

        if (result) {
            if (result.status === 'finished') {
                console.error(`[Globalping API] Measurement ${measurementId} finished.`); // Log to stderr
                return result;
            } else if (result.status === 'failed') {
                console.error(`[Globalping API] Measurement ${measurementId} failed.`); // Log to stderr
                // Consider returning the failed result object for more context
                return result;
            }
            // If status is 'in-progress', continue polling
        } else {
            // getMeasurementResult returned null (e.g., 404 or other error)
            // Continue polling, maybe the measurement is not ready yet
        }

        // Wait before the next poll
        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    console.error(`[Globalping API] Polling timed out for measurement ${measurementId} after ${timeoutMs}ms.`); // Log to stderr
    return null; // Timeout reached
}
