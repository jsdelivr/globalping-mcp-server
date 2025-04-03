/**
 * Globalping API Client Module
 * 
 * This module provides functions to interact with the Globalping HTTP API.
 * It handles creating measurements and polling for their results.
 * 
 * The module implements error handling and retry logic appropriate for
 * network measurements, which may take time to complete or occasionally fail
 * due to network conditions.
 * 
 * Note on rate limits: The Globalping API has rate limits that differ for
 * authenticated vs. unauthenticated users. When available, an API token should
 * be used to increase these limits.
 */

import axios, { AxiosError } from 'axios';

/**
 * Constants for the Globalping API
 */
const GLOBALPING_API_URL = "https://api.globalping.io/v1";
const USER_AGENT = "Globalping-MCP-Server (https://github.com/jsdelivr/globalping-mcp-server)"; // Replace with your repo URL later

/**
 * Maximum number of retry attempts for transient errors
 */
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Exponential backoff base time in milliseconds
 */
const RETRY_BASE_DELAY_MS = 1000;

/**
 * Custom error class for Globalping API errors
 * This provides structured error information for better handling by consumers
 */
export class GlobalpingApiError extends Error {
    public statusCode?: number;
    public endpoint: string;
    public requestData?: any;
    public responseData?: any;
    public retryable: boolean;

    constructor({ 
        message, 
        statusCode, 
        endpoint, 
        requestData, 
        responseData, 
        retryable = false 
    }: {
        message: string;
        statusCode?: number;
        endpoint: string;
        requestData?: any;
        responseData?: any;
        retryable?: boolean;
    }) {
        super(message);
        this.name = 'GlobalpingApiError';
        this.statusCode = statusCode;
        this.endpoint = endpoint;
        this.requestData = requestData;
        this.responseData = responseData;
        this.retryable = retryable;
        
        // Ensures proper instanceof checks work in TypeScript
        Object.setPrototypeOf(this, GlobalpingApiError.prototype);
    }

    /**
     * Returns a user-friendly error message
     */
    public getUserMessage(): string {
        if (this.statusCode === 429) {
            return `Globalping API rate limit exceeded. Please try again later or use an API token.`;
        } else if (this.statusCode === 400) {
            return `Invalid request to Globalping API: ${this.message}`;
        } else if (this.statusCode === 401 || this.statusCode === 403) {
            return `Authentication error with Globalping API. Please check your API token.`;
        } else if (this.statusCode && this.statusCode >= 500) {
            return `Globalping API server error (${this.statusCode}). This is likely a temporary issue.`;
        } else {
            return `Error communicating with Globalping API: ${this.message}`;
        }
    }

    /**
     * Returns true if this error might be resolved by retrying
     */
    public isRetryable(): boolean {
        return this.retryable;
    }
}

/**
 * Interface for location specifications
 */
export interface LocationSpecification {
    continent?: "AF" | "AN" | "AS" | "EU" | "NA" | "OC" | "SA";  // Two-letter continent code
    region?: string;     // Geographic region based on UN M49 standard
    country?: string;    // Two-letter country code (ISO 3166-1 alpha-2)
    state?: string | null; // Two-letter US state code
    city?: string;       // City name in English
    asn?: number;        // Autonomous System Number (e.g., 13335 for Cloudflare)
    network?: string;    // Network name (e.g., "Google LLC")
    tags?: string[];     // Array of probe tags for fine-tuning selection
    magic?: string;      // String for fuzzy matching on multiple criteria
    limit?: number;      // Limit of probes from this location constraint (default: 1, max: 200)
}

/**
 * Interface for ping, traceroute and mtr measurement options
 */
export interface NetworkMeasurementOptions {
    packets?: number;       // Number of packets to send
    port?: number;          // Destination port (for TCP/UDP)
    protocol?: 'ICMP' | 'UDP' | 'TCP'; // Protocol to use
    ipVersion?: 4 | 6;      // IP version to use
}

/**
 * Interface for DNS measurement options
 */
export interface DnsMeasurementOptions {
    type?: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'NS' | 'PTR' | 'SOA' | 'SRV' | 'TXT'; // DNS record type
    resolver?: string;     // Custom DNS resolver
    protocol?: 'UDP' | 'TCP'; // Protocol to use for DNS queries
    port?: number;        // Port for DNS queries (default 53)
    ipVersion?: 4 | 6;    // IP version to use
    trace?: boolean;      // Whether to use recursive query trace mode
}

/**
 * Interface for HTTP measurement options
 */
export interface HttpMeasurementOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'; // HTTP method
    protocol?: 'HTTP' | 'HTTPS'; // Protocol (usually determined from URL)
    port?: number;       // Custom port
    path?: string;       // Path to request
    headers?: Record<string, string>; // HTTP headers
    ipVersion?: 4 | 6;   // IP version to use
    body?: string;       // Request body for POST, PUT, etc.
    resolveWithIP?: boolean; // Whether to resolve hostname immediately
    certificateCheck?: boolean; // Whether to validate SSL certificates
}

/**
 * Basic interface for the measurement request payload
 */
export interface MeasurementRequest {
    type: 'ping' | 'traceroute' | 'dns' | 'mtr' | 'http';
    target: string;
    locations?: LocationSpecification[];
    measurementOptions?: NetworkMeasurementOptions | DnsMeasurementOptions | HttpMeasurementOptions;
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
 * Interface for probe results
 */
export interface ProbeResult {
    probe: {
        continent: string;
        region: string;
        country: string;
        city: string;
        asn: number;
        network: string;
        latitude: number;
        longitude: number;
        [key: string]: any;
    };
    result: {
        status: 'finished' | 'failed';
        rawOutput?: string;
        [key: string]: any; // Type-specific results
    };
}

/**
 * Interface for the measurement result
 */
export interface MeasurementResult {
    id: string;
    type: 'ping' | 'traceroute' | 'dns' | 'mtr' | 'http';
    status: 'in-progress' | 'finished' | 'failed';
    createdAt: string;
    updatedAt: string;
    probesCount: number;
    results: ProbeResult[]; // Array of probe results
}

/**
 * Helper function to determine if an error is likely transient and can be retried
 * 
 * @param error - The error to check
 * @returns True if the error is likely transient and can be retried
 */
function isRetryableError(error: any): boolean {
    const statusCode = error?.response?.status;
    
    // Network errors without status codes are often retryable
    if (!statusCode && (error.code === 'ECONNRESET' || 
                        error.code === 'ETIMEDOUT' || 
                        error.code === 'ECONNREFUSED')) {
        return true;
    }
    
    // 429 (rate limit) might be retryable after a delay
    // 5xx errors are server errors that might resolve on retry
    return statusCode === 429 || (statusCode && statusCode >= 500 && statusCode < 600);
}

/**
 * Helper function to extract error details from an axios error
 * 
 * @param error - The error to extract details from
 * @param endpoint - The API endpoint that was called
 * @param requestData - The data that was sent in the request
 * @returns A GlobalpingApiError with structured information
 */
function createStructuredError(error: any, endpoint: string, requestData?: any): GlobalpingApiError {
    let statusCode: number | undefined;
    let message = error.message || 'Unknown error';
    let responseData: any;
    let retryable = false;
    
    // Handle axios errors specially
    if (error.isAxiosError) {
        statusCode = error.response?.status;
        responseData = error.response?.data;
        
        // Log the complete validation error if available
        if (statusCode === 400 && responseData?.error?.params) {
            console.error(`[Globalping API] Validation error details:`, JSON.stringify(responseData.error.params, null, 2));
        }
        
        // Enhance message with more details when possible
        if (responseData?.error?.message) {
            message = responseData.error.message;
        }
    }
    
    // Determine retryability based on status code or error type
    retryable = isRetryableError(error);
    
    // Create a structured error
    return new GlobalpingApiError({
        message,
        statusCode,
        endpoint,
        requestData,
        responseData,
        retryable
    });
}

/**
 * Creates a new measurement request via the Globalping HTTP API.
 * Includes retry logic for transient errors.
 * 
 * @param requestPayload - The measurement request details.
 * @param apiToken - Optional Globalping API token.
 * @returns The response from the API containing the measurement ID and URL.
 * @throws GlobalpingApiError if the request fails
 */
export async function createMeasurement(
    requestPayload: MeasurementRequest,
    apiToken?: string
): Promise<CreateMeasurementResponse> {
    // Set proper limit to 1 if not specified and there's only one location
    if (!requestPayload.limit && 
        requestPayload.locations && 
        requestPayload.locations.length === 1 && 
        !requestPayload.locations[0].limit) {
        requestPayload.locations[0].limit = 1;
    }

    // Ensure inProgressUpdates is always false for HTTP API
    requestPayload.inProgressUpdates = false;
    
    console.error(`[Globalping API] Creating measurement: ${requestPayload.type} to ${requestPayload.target}`);
    console.error(`[Globalping API] Request payload: ${JSON.stringify(requestPayload, null, 2)}`);
    
    const url = `${GLOBALPING_API_URL}/measurements`;
    const endpoint = 'POST /measurements';
    
    const headers: Record<string, string> = {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/json',
    };

    if (apiToken) {
        headers['Authorization'] = `Bearer ${apiToken}`;
    }

    let attempt = 0;
    
    while (attempt < MAX_RETRY_ATTEMPTS) {
        try {
            attempt++;
            
            // Add exponential backoff for retries
            if (attempt > 1) {
                const backoffTime = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
                console.error(`[Globalping API] Retry attempt ${attempt}/${MAX_RETRY_ATTEMPTS} after ${backoffTime}ms`);
                await new Promise(resolve => setTimeout(resolve, backoffTime));
            }
            
            const response = await axios.post<CreateMeasurementResponse>(url, requestPayload, { headers });
            console.error(`[Globalping API] Measurement created successfully. ID: ${response.data.id}`);
            console.error(`[Globalping API] Response data: ${JSON.stringify(response.data, null, 2)}`);
            return response.data;
        } catch (error) {
            const structuredError = createStructuredError(error, endpoint, requestPayload);
            
            console.error(`[Globalping API] Error creating measurement: ${structuredError.message}`);
            if (structuredError.statusCode) {
                console.error(`[Globalping API] Response Status: ${structuredError.statusCode}`);
            }
            console.error(`[Globalping API] Response data: ${JSON.stringify(structuredError.responseData, null, 2)}`);
            
            // If it's the last attempt or not retryable, throw the error
            if (attempt >= MAX_RETRY_ATTEMPTS || !structuredError.isRetryable()) {
                throw structuredError;
            }
            
            // Otherwise, continue to the next iteration (which will retry after delay)
        }
    }
    
    // This shouldn't be reached due to the throw in the catch block,
    // but TypeScript needs it for type safety
    throw new GlobalpingApiError({
        message: 'Maximum retry attempts reached',
        endpoint,
        requestData: requestPayload
    });
}

/**
 * Fetches the result of a specific measurement by its ID.
 * 
 * This function does not include retries as it's frequently called during polling.
 * The polling function handles the retry logic instead.
 * 
 * @param measurementId - The ID of the measurement.
 * @param apiToken - Optional Globalping API token.
 * @returns The measurement result object.
 * @throws GlobalpingApiError if the request fails and is not a 404
 */
export async function getMeasurementResult(
    measurementId: string,
    apiToken?: string
): Promise<MeasurementResult | null> {
    const url = `${GLOBALPING_API_URL}/measurements/${measurementId}`;
    const endpoint = `GET /measurements/${measurementId}`;
    
    const headers: Record<string, string> = {
        'User-Agent': USER_AGENT,
    };

    if (apiToken) {
        headers['Authorization'] = `Bearer ${apiToken}`;
    }

    try {
        const response = await axios.get<MeasurementResult>(url, { headers });
        console.error(`[Globalping API] Response data: ${JSON.stringify(response.data, null, 2)}`);
        return response.data;
    } catch (error) {
        const axiosError = error as AxiosError;
        
        // If it's a 404, the measurement might still be initializing, so return null
        if (axiosError.response?.status === 404) {
            return null;
        }
        
        // For other errors, create a structured error
        const structuredError = createStructuredError(error, endpoint);
        
        console.error(`[Globalping API] Error fetching measurement result for ${measurementId}: ${structuredError.message}`);
        if (structuredError.statusCode) {
            console.error(`[Globalping API] Response Status: ${structuredError.statusCode}`);
        }
        console.error(`[Globalping API] Response data: ${JSON.stringify(structuredError.responseData, null, 2)}`);
        
        throw structuredError;
    }
}

/**
 * Polls the Globalping API for the result of a measurement until it's finished or failed.
 * 
 * This function implements retry logic with exponential backoff for transient errors.
 * It will continue polling until the measurement is complete or the timeout is reached.
 * 
 * @param measurementId - The ID of the measurement to poll.
 * @param apiToken - Optional Globalping API token.
 * @param timeoutMs - Maximum time to poll in milliseconds.
 * @param intervalMs - Interval between polling attempts in milliseconds.
 * @returns The final measurement result.
 * @throws GlobalpingApiError if polling fails or times out
 */
export async function pollForResult(
    measurementId: string,
    apiToken?: string,
    timeoutMs: number = 60000, // Default timeout 60 seconds
    intervalMs: number = 2000   // Default interval 2 seconds
): Promise<MeasurementResult> {
    console.error(`[Globalping API] Polling for measurement ${measurementId} results (timeout: ${timeoutMs}ms, interval: ${intervalMs}ms)`);
    
    const startTime = Date.now();
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 3;
    
    while (Date.now() - startTime < timeoutMs) {
        try {
            // Wait for the polling interval
            await new Promise(resolve => setTimeout(resolve, intervalMs));
            
            // Attempt to get the result
            const result = await getMeasurementResult(measurementId, apiToken);
            
            // Reset error counter on successful request
            consecutiveErrors = 0;
            
            // If we got a result and it's finished, return it
            if (result && (result.status === 'finished' || result.status === 'failed')) {
                console.error(`[Globalping API] Measurement ${measurementId} completed with status: ${result.status}`);
                console.error(`[Globalping API] Response data: ${JSON.stringify(result, null, 2)}`);
                return result;
            }
            
            // If we're running out of time, increase polling frequency
            const timeRemaining = timeoutMs - (Date.now() - startTime);
            if (timeRemaining < timeoutMs * 0.2) {
                intervalMs = Math.max(500, intervalMs / 2);
                console.error(`[Globalping API] Approaching timeout, increasing polling frequency to ${intervalMs}ms`);
            }
        } catch (error) {
            consecutiveErrors++;
            
            // If we've had too many consecutive errors, throw
            if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                console.error(`[Globalping API] Too many consecutive polling errors for ${measurementId}`);
                throw new GlobalpingApiError({
                    message: `Failed to poll for measurement results after ${MAX_CONSECUTIVE_ERRORS} consecutive errors`,
                    endpoint: `GET /measurements/${measurementId}`,
                    retryable: false
                });
            }
            
            // Otherwise, log the error and continue
            console.error(`[Globalping API] Error during polling (attempt ${consecutiveErrors}): ${error instanceof Error ? error.message : 'Unknown error'}`);
            
            // Increase interval on errors to avoid overwhelming the API
            intervalMs = Math.min(intervalMs * 1.5, 5000);
        }
    }
    
    // If we've reached here, we've timed out
    throw new GlobalpingApiError({
        message: `Polling timed out after ${timeoutMs}ms`,
        endpoint: `GET /measurements/${measurementId}`,
        retryable: false
    });
}
