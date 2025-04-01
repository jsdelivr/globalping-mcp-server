import ky, { HTTPError } from "ky";
import type { Options as KyOptions } from "ky";

// Define interfaces based on Globalping API documentation
// These ensure type safety when interacting with the API.

// Base interface for measurement options
interface BaseMeasurementOptions {
  limit?: number;
  locations?: { continent?: string; country?: string; state?: string, city?: string, asn?: number, network?: string, tags?: string[] }[];
  measurementOptions?: {
    // Common measurement options if any (e.g., packets for ping/mtr)
    packets?: number;
  };
}

// Specific measurement options
export interface PingOptions extends BaseMeasurementOptions {
  type: "ping";
  target: string;
  measurementOptions?: {
    packets?: number; // Override base if needed
  };
}

export interface TracerouteOptions extends BaseMeasurementOptions {
  type: "traceroute";
  target: string;
  protocol?: "TCP" | "UDP" | "ICMP";
   port?: number;
   measurementOptions?: {
      packets?: number; // Example, adjust based on actual API
   }
}

export interface DnsOptions extends BaseMeasurementOptions {
  type: "dns";
  target: string;
  query?: {
    type?: "A" | "AAAA" | "CNAME" | "MX" | "NS" | "PTR" | "SOA" | "SRV" | "TXT";
    resolver?: string;
    protocol?: "UDP" | "TCP";
    port?: number;
  };
}

export interface MtrOptions extends BaseMeasurementOptions {
    type: 'mtr';
    target: string;
    protocol?: 'TCP' | 'UDP' | 'ICMP';
    port?: number;
    measurementOptions?: {
        packets?: number;
    }
}

export interface HttpOptions extends BaseMeasurementOptions {
    type: 'http';
    target: string;
    protocol?: 'HTTP' | 'HTTPS' | 'HTTP2';
    port?: number;
    request?: {
        method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
        path?: string;
        query?: string;
        headers?: Record<string, string>;
        body?: string;
    };
}


// Union type for all possible measurement requests
export type MeasurementRequest = PingOptions | TracerouteOptions | DnsOptions | MtrOptions | HttpOptions;

// Interface for the response when creating a measurement
export interface CreateMeasurementResponse {
  id: string;
  probesCount: number;
  // Add other relevant fields if needed
}

// Interface for the full measurement result
export interface MeasurementResult {
  id: string;
  type: string;
  status: "in-progress" | "finished" | "failed";
  createdAt: string;
  updatedAt: string;
  target: string;
  probesCount: number;
  results: ProbeResult[];
  // Add other relevant fields like stats if available
  stats?: any; // Define more specific stats types if possible
}

export interface ProbeResult {
    probe: {
        continent: string;
        region: string;
        country: string;
        state: string | null;
        city: string;
        asn: number;
        longitude: number;
        latitude: number;
        network: string;
        tags: string[];
        resolvers?: string[];
    };
    result: {
        status: 'finished' | 'failed' | 'timeout'; // etc.
        rawOutput: string;
        // Parsed results vary significantly by type
        // Add specific result types (e.g., PingResult, DnsResult) if needed
        [key: string]: any; // Placeholder for measurement-specific results
    };
}


const GLOBALPING_API_URL = "https://api.globalping.io/v1";
const USER_AGENT = "globalping-mcp-server/0.1.0"; // Identify your client

// Helper to create Ky instance with common options
function getApiClient(apiKey?: string): typeof ky {
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  return ky.create({
    prefixUrl: GLOBALPING_API_URL,
    headers: headers,
    timeout: 30000, // 30 second timeout for API calls
    throwHttpErrors: true, // Automatically throw for 4xx/5xx responses
  });
}

/**
 * Creates a new measurement request on the Globalping API.
 * @param measurementRequest The measurement configuration.
 * @param apiKey Optional Globalping API key.
 * @returns The ID of the created measurement.
 */
export async function createMeasurement(
  measurementRequest: MeasurementRequest,
  apiKey?: string
): Promise<string> {
  const apiClient = getApiClient(apiKey);
  console.log(
    `Creating Globalping measurement: ${JSON.stringify(measurementRequest)}`
  );

  try {
    const response = await apiClient
      .post("measurements", {
        json: measurementRequest,
      })
      .json<CreateMeasurementResponse>();
    console.log(
      `Measurement created successfully. ID: ${response.id}, Probes: ${response.probesCount}`
    );
    return response.id;
  } catch (error) {
    console.error("Error creating Globalping measurement:", error);
    if (error instanceof HTTPError) {
      const responseBody = await error.response.text();
      console.error("API Error Response:", responseBody);
      throw new Error(
        `Globalping API error (${error.response.status}): ${responseBody || error.message}`
      );
    }
    throw new Error(`Failed to create measurement: ${error}`);
  }
}

/**
 * Retrieves the result of a specific measurement.
 * @param measurementId The ID of the measurement.
 * @param apiKey Optional Globalping API key.
 * @returns The measurement result object.
 */
export async function getMeasurementResult(
  measurementId: string,
  apiKey?: string
): Promise<MeasurementResult> {
  const apiClient = getApiClient(apiKey);
  console.log(`Fetching result for measurement ID: ${measurementId}`);

  try {
    const result = await apiClient
      .get(`measurements/${measurementId}`)
      .json<MeasurementResult>();
    console.log(
      `Fetched result for ${measurementId}. Status: ${result.status}`
    );
    return result;
  } catch (error) {
    console.error(
      `Error fetching result for measurement ${measurementId}:`,
      error
    );
    if (error instanceof HTTPError) {
       const responseBody = await error.response.text();
       console.error("API Error Response:", responseBody);
      throw new Error(
        `Globalping API error (${error.response.status}): ${responseBody || error.message}`
      );
    }
    throw new Error(`Failed to fetch measurement result: ${error}`);
  }
}

/**
 * Polls for the measurement result until it's finished or failed, or timeout occurs.
 * @param measurementId The ID of the measurement.
 * @param apiKey Optional Globalping API key.
 * @param timeoutMs Maximum time to wait in milliseconds. Defaults to 5 minutes.
 * @param intervalMs Polling interval in milliseconds. Defaults to 5 seconds.
 * @returns The final measurement result.
 * @throws Error if the measurement fails or times out.
 */
export async function pollMeasurementResult(
  measurementId: string,
  apiKey?: string,
  timeoutMs: number = 5 * 60 * 1000, // 5 minutes default timeout
  intervalMs: number = 5000 // 5 seconds default interval
): Promise<MeasurementResult> {
  const startTime = Date.now();
  console.log(
    `Polling for result of measurement ${measurementId} (Timeout: ${timeoutMs / 1000}s, Interval: ${intervalMs / 1000}s)`
  );

  return new Promise((resolve, reject) => {
    const checkStatus = async () => {
      if (Date.now() - startTime > timeoutMs) {
        console.error(`Polling timed out for measurement ${measurementId}.`);
        return reject(
          new Error(`Polling timed out after ${timeoutMs / 1000} seconds.`)
        );
      }

      try {
        const result = await getMeasurementResult(measurementId, apiKey);

        if (result.status === "finished") {
          console.log(`Measurement ${measurementId} finished.`);
          return resolve(result);
        } else if (result.status === "failed") {
          console.error(`Measurement ${measurementId} failed.`);
          // Attempt to include more failure details if available
          const failureReason = result.results?.find(r => r.result.status === 'failed')?.result?.rawOutput || 'Unknown reason';
          return reject(
            new Error(`Measurement failed: ${failureReason}`)
          );
        } else {
          // Status is 'in-progress' or potentially another state, continue polling
          console.log(
            `Measurement ${measurementId} status: ${result.status}. Polling again in ${intervalMs / 1000}s...`
          );
          setTimeout(checkStatus, intervalMs);
        }
      } catch (error) {
        console.error(
          `Error during polling for measurement ${measurementId}:`,
          error
        );
        // Decide if the error is fatal or if polling should continue
        // For now, we reject on any API error during polling.
        return reject(
          new Error(`API error during polling: ${error}`)
        );
      }
    };

    // Initial check
    checkStatus();
  });
}
