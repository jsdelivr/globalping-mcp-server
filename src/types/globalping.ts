/**
 * Types for the Globalping API.
 * Based on the OpenAPI specification from https://api.globalping.io/openapi.json
 */

// Main measurement types supported by Globalping
export type MeasurementType = 'ping' | 'traceroute' | 'dns' | 'mtr' | 'http';

// Location types
export type ContinentCode = 'AF' | 'AN' | 'AS' | 'EU' | 'NA' | 'OC' | 'SA';
export type CountryCode = string; // ISO 3166-1 alpha-2 code (e.g., 'US', 'DE')
export type CityName = string;
export type StateCode = string | null; // US state code
export type AsnCode = number; // Autonomous System Number
export type NetworkName = string;
export type Tags = string[];

// Location specification - using only magic field as requested
export interface MeasurementLocationOption {
  magic: string;
  limit?: number;
}

// Location specification can be either a list of locations or a previous measurement ID
export type MeasurementLocations = MeasurementLocationOption[] | string;

// Base measurement options shared across all measurement types
export interface BaseMeasurementOptions {
  ipVersion?: 4 | 6;
}

// Ping-specific options
export interface PingOptions extends BaseMeasurementOptions {
  packets?: number; // Default: 3, Min: 1, Max: 16
}

// Traceroute-specific options
export interface TracerouteOptions extends BaseMeasurementOptions {
  port?: number; // Default: 80, Min: 0, Max: 65535
  protocol?: 'ICMP' | 'TCP' | 'UDP'; // Default: 'ICMP'
}

// DNS-specific options
export interface DnsOptions extends BaseMeasurementOptions {
  query?: {
    type?: 'A' | 'AAAA' | 'ANY' | 'CNAME' | 'DNSKEY' | 'DS' | 'HTTPS' | 'MX' | 'NS' | 'NSEC' | 'PTR' | 'RRSIG' | 'SOA' | 'TXT' | 'SRV' | 'SVCB'; // Default: 'A'
  };
  resolver?: string; // IP or hostname of DNS resolver
  port?: number; // Default: 53, Min: 0, Max: 65535
  protocol?: 'TCP' | 'UDP'; // Default: 'UDP'
  trace?: boolean; // Default: false
}

// MTR-specific options
export interface MtrOptions extends BaseMeasurementOptions {
  port?: number; // Default: 80, Min: 0, Max: 65535
  protocol?: 'ICMP' | 'TCP' | 'UDP'; // Default: 'ICMP'
  packets?: number; // Default: 3, Min: 1, Max: 16
}

// HTTP-specific options
export interface HttpOptions extends BaseMeasurementOptions {
  request?: {
    host?: string; // Override for the Host header
    path?: string; // Path portion of the URL
    query?: string; // Query string portion of the URL
    method?: 'HEAD' | 'GET' | 'OPTIONS'; // Default: 'HEAD'
    headers?: Record<string, string>; // Additional request headers
  };
  resolver?: string; // IP or hostname of DNS resolver
  port?: number; // Default: 80, Min: 0, Max: 65535
  protocol?: 'HTTP' | 'HTTPS' | 'HTTP2'; // Default: 'HTTPS'
}

// Union type for measurement options
export type MeasurementOptions = 
  | { type: 'ping', options?: PingOptions }
  | { type: 'traceroute', options?: TracerouteOptions }
  | { type: 'dns', options?: DnsOptions }
  | { type: 'mtr', options?: MtrOptions }
  | { type: 'http', options?: HttpOptions };

// Request to create a measurement
export interface MeasurementRequest {
  type: MeasurementType;
  target: string;
  locations?: MeasurementLocations;
  limit?: number;
  inProgressUpdates?: boolean;
  measurementOptions?: PingOptions | TracerouteOptions | DnsOptions | MtrOptions | HttpOptions;
}

// Response from creating a measurement
export interface CreateMeasurementResponse {
  id: string;
  probesCount: number;
}

// Measurement status
export type MeasurementStatus = 'in-progress' | 'finished';
export type TestStatus = 'in-progress' | 'finished' | 'failed' | 'offline';

// Probe location information
export interface ProbeLocation {
  continent: ContinentCode;
  region: string;
  country: CountryCode;
  state: StateCode;
  city: CityName;
  asn: AsnCode;
  network: NetworkName;
  latitude: number;
  longitude: number;
  tags: Tags;
  resolvers: string[];
}

// Base test result
export interface BaseTestResult {
  status: TestStatus;
  rawOutput: string;
}

// Test result for finished measurements, depends on the measurement type
export interface TestResult extends BaseTestResult {
  // Additional fields depend on the measurement type and status
  resolvedAddress?: string | null;
  resolvedHostname?: string | null;
  stats?: {
    min?: number | null;
    avg?: number | null;
    max?: number | null;
    total?: number;
    rcv?: number;
    drop?: number;
    loss?: number;
  };
  timings?: Array<{
    rtt?: number;
    ttl?: number;
  }>;
  hops?: Array<any>; // Structure depends on measurement type
  // HTTP-specific fields
  statusCode?: number;
  statusCodeName?: string;
  headers?: Record<string, string | string[]>;
  rawHeaders?: string;
  rawBody?: string | null;
  truncated?: boolean;
  tls?: any;
  // DNS-specific fields
  statusCode?: number;
  statusCodeName?: string;
  answers?: Array<{
    name: string;
    type: string;
    ttl: number;
    class: string;
    value: string;
  }>;
}

// Measurement result for a single probe
export interface MeasurementResultItem {
  probe: ProbeLocation;
  result: TestResult;
}

// Complete measurement response
export interface MeasurementResponse {
  id: string;
  type: MeasurementType;
  target: string;
  status: MeasurementStatus;
  createdAt: string;
  updatedAt: string;
  probesCount: number;
  locations?: MeasurementLocationOption[];
  limit?: number;
  measurementOptions?: any;
  results: MeasurementResultItem[];
}

// Error response
export interface ErrorResponse {
  error: {
    type: string;
    message: string;
    params?: Record<string, string>;
  };
}

// Tool parameter types for MCP tools
export interface MeasurementToolParams {
  target: string;
  locations?: string[];
  limit?: number;
  token?: string;
}

export interface PingToolParams extends MeasurementToolParams {
  packets?: number;
  ipVersion?: 4 | 6;
}

export interface TracerouteToolParams extends MeasurementToolParams {
  port?: number;
  protocol?: 'ICMP' | 'TCP' | 'UDP';
  ipVersion?: 4 | 6;
}

export interface DnsToolParams extends MeasurementToolParams {
  queryType?: 'A' | 'AAAA' | 'ANY' | 'CNAME' | 'DNSKEY' | 'DS' | 'HTTPS' | 'MX' | 'NS' | 'NSEC' | 'PTR' | 'RRSIG' | 'SOA' | 'TXT' | 'SRV' | 'SVCB';
  resolver?: string;
  port?: number;
  protocol?: 'TCP' | 'UDP';
  trace?: boolean;
  ipVersion?: 4 | 6;
}

export interface MtrToolParams extends MeasurementToolParams {
  port?: number;
  protocol?: 'ICMP' | 'TCP' | 'UDP';
  packets?: number;
  ipVersion?: 4 | 6;
}

export interface HttpToolParams extends MeasurementToolParams {
  host?: string;
  path?: string;
  query?: string;
  method?: 'HEAD' | 'GET' | 'OPTIONS';
  headers?: Record<string, string>;
  resolver?: string;
  port?: number;
  protocol?: 'HTTP' | 'HTTPS' | 'HTTP2';
  ipVersion?: 4 | 6;
}

export interface ComparisonToolParams {
  target: string;
  locations: string[];
  comparisonTarget: string;
  measurementType: MeasurementType;
  limit?: number;
  token?: string;
  options?: any; // Depends on measurement type
}
