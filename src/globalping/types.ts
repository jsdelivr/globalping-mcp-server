/**
 * Globalping API Types
 * 
 * This file contains type definitions for the Globalping API to ensure consistent
 * usage throughout the MCP server. These types help in validating inputs, handling
 * responses, and providing better error reporting.
 */

/**
 * Supported measurement types in the Globalping API
 */
export type MeasurementType = 'ping' | 'traceroute' | 'dns' | 'mtr' | 'http';

/**
 * Continent code using ISO 3166-1 alpha-2 format
 */
export type ContinentCode = 'AF' | 'AN' | 'AS' | 'EU' | 'NA' | 'OC' | 'SA';

/**
 * Country code using ISO 3166-1 alpha-2 format
 */
export type CountryCode = string;

/**
 * Location specification for Globalping measurements
 * Represents filters for probe selection
 */
export interface Location {
    continent?: ContinentCode;
    country?: CountryCode;
    region?: string;
    state?: string | null;
    city?: string;
    asn?: number;
    network?: string;
    tags?: string[];
    magic?: string;
    limit?: number;
}

/**
 * Measurement request structure for the Globalping API
 */
export interface MeasurementRequest {
    type: MeasurementType;
    target: string;
    locations?: Location[];
    limit?: number;
    measurementOptions?: Record<string, any>;
}

/**
 * Detailed measurement options for different measurement types
 */
export interface MeasurementOptions {
    ping?: {
        packets?: number;
        protocol?: 'icmp' | 'tcp';
        port?: number;
    };
    traceroute?: {
        protocol?: 'icmp' | 'tcp' | 'udp';
        port?: number;
        maxHops?: number;
    };
    dns?: {
        query?: {
            type: string;
            name: string;
        };
        resolver?: string;
        protocol?: 'udp' | 'tcp' | 'https';
    };
    mtr?: {
        packets?: number;
        protocol?: 'icmp' | 'tcp' | 'udp';
        port?: number;
        maxHops?: number;
    };
    http?: {
        method?: 'GET' | 'HEAD';
        protocol?: 'http' | 'https';
        path?: string;
        host?: string;
        query?: Record<string, string>;
        headers?: Record<string, string>;
        resolveWithDns?: boolean;
        followRedirects?: boolean;
    };
}

/**
 * Measurement response structure from the Globalping API
 */
export interface MeasurementResponse {
    id: string;
    type: MeasurementType;
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    createdAt: string;
    updatedAt: string;
    probesCount?: number;
    results?: ProbeResult[];
    error?: {
        message: string;
        code: string;
    };
}

/**
 * Structure of a single probe result
 */
export interface ProbeResult {
    probeId: string;
    result: any; // Type varies based on measurement type
    probe: {
        continent: string;
        country: string;
        region?: string;
        city?: string;
        asn?: number;
        network?: string;
        tags?: string[];
    };
}

/**
 * Structure of a single measurement result
 * This is a legacy type kept for backward compatibility
 */
export interface MeasurementResult {
    probeId: string;
    result: any; // Type varies based on measurement type
    probe: {
        continent: string;
        country: string;
        region?: string;
        city?: string;
        asn?: number;
        network?: string;
        tags?: string[];
    };
}

/**
 * Error response from the Globalping API
 */
export interface GlobalpingApiErrorResponse {
    statusCode: number;
    error: string;
    message: string;
}
