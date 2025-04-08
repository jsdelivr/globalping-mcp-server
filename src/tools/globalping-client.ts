/**
 * Globalping API client
 * Handles all communication with the Globalping API
 */
import {
  MeasurementRequest,
  CreateMeasurementResponse,
  MeasurementResponse,
  ErrorResponse,
  MeasurementType,
  PingOptions,
  TracerouteOptions,
  DnsOptions,
  MtrOptions,
  HttpOptions,
  MeasurementLocationOption
} from '../types/globalping';

const API_BASE_URL = 'https://api.globalping.io';
const POLL_INTERVAL_MS = 500; // 500ms polling interval as recommended in the API docs
const DEFAULT_PROBES_COUNT = 3; // Default number of probes when not specified

export class GlobalpingClient {
  private readonly baseUrl: string;
  private readonly userAgent: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
    this.userAgent = 'GlobalpingMcpServer/1.0.0';
  }

  /**
   * Create a measurement with the Globalping API
   * @param request The measurement request parameters
   * @param token Optional API token
   * @returns The created measurement ID and probe count
   */
  async createMeasurement(
    request: MeasurementRequest,
    token?: string
  ): Promise<CreateMeasurementResponse> {
    try {
      // Build request headers
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'User-Agent': this.userAgent,
        'Accept-Encoding': 'br'
      };

      // Add authentication if token is provided
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Make API request
      const response = await fetch(`${this.baseUrl}/v1/measurements`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request)
      });

      // Handle unsuccessful responses
      if (!response.ok) {
        const errorData = await response.json() as ErrorResponse;
        throw new Error(`Globalping API error: ${errorData.error.message}`);
      }

      // Parse and return the response
      const data = await response.json() as CreateMeasurementResponse;
      return data;
    } catch (error) {
      console.error('Error creating measurement:', error);
      throw error;
    }
  }

  /**
   * Get a measurement by ID
   * @param id The measurement ID
   * @returns The measurement data
   */
  async getMeasurement(id: string): Promise<MeasurementResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/measurements/${id}`, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept-Encoding': 'br'
        }
      });

      if (!response.ok) {
        const errorData = await response.json() as ErrorResponse;
        throw new Error(`Globalping API error: ${errorData.error.message}`);
      }

      return await response.json() as MeasurementResponse;
    } catch (error) {
      console.error(`Error getting measurement ${id}:`, error);
      throw error;
    }
  }

  /**
   * Poll for a measurement until it's complete
   * @param id The measurement ID to poll
   * @returns The completed measurement data
   */
  async pollMeasurementUntilComplete(id: string): Promise<MeasurementResponse> {
    let measurement: MeasurementResponse;
    let attempts = 0;
    const MAX_ATTEMPTS = 120; // 60 seconds (120 * 500ms)

    do {
      // Get the current state of the measurement
      measurement = await this.getMeasurement(id);
      
      // If the measurement is complete, return it
      if (measurement.status !== 'in-progress') {
        return measurement;
      }
      
      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      attempts++;

      if (attempts >= MAX_ATTEMPTS) {
        throw new Error('Measurement polling timed out after 60 seconds');
      }
    } while (true);
  }

  /**
   * Run a measurement and wait for it to complete
   * @param type Measurement type (ping, traceroute, etc.)
   * @param target The target to measure
   * @param locations Array of location strings to use
   * @param options Measurement-specific options
   * @param limit Number of probes per location (defaults to 3)
   * @param token Optional API token for authentication
   * @returns The complete measurement results
   */
  async runMeasurement(
    type: MeasurementType,
    target: string,
    locations: string[] = [],
    options: PingOptions | TracerouteOptions | DnsOptions | MtrOptions | HttpOptions = {},
    limit: number = DEFAULT_PROBES_COUNT,
    token?: string
  ): Promise<MeasurementResponse> {
    // Build location objects with magic field
    const locationOptions: MeasurementLocationOption[] = locations.map(loc => ({
      magic: loc
    }));

    // Create the measurement request
    const request: MeasurementRequest = {
      type,
      target,
      locations: locationOptions,
      limit,
      measurementOptions: options
    };

    // Create the measurement
    const createResponse = await this.createMeasurement(request, token);
    console.log(`Created measurement ${createResponse.id} with ${createResponse.probesCount} probes`);

    // Poll until the measurement is complete
    return await this.pollMeasurementUntilComplete(createResponse.id);
  }

  /**
   * Run a comparison measurement using a previous measurement ID
   * @param type Measurement type
   * @param target The new target to measure
   * @param measurementId Previous measurement ID to use for comparison
   * @param options Measurement-specific options
   * @param token Optional API token
   * @returns The complete measurement results
   */
  async runComparisonMeasurement(
    type: MeasurementType,
    target: string,
    measurementId: string,
    options: PingOptions | TracerouteOptions | DnsOptions | MtrOptions | HttpOptions = {},
    token?: string
  ): Promise<MeasurementResponse> {
    // Create the measurement request
    const request: MeasurementRequest = {
      type,
      target,
      locations: measurementId, // Use the measurement ID directly as location
      measurementOptions: options
    };

    // Create the measurement
    const createResponse = await this.createMeasurement(request, token);
    console.log(`Created comparison measurement ${createResponse.id} using ${measurementId} as reference`);

    // Poll until the measurement is complete
    return await this.pollMeasurementUntilComplete(createResponse.id);
  }
}
