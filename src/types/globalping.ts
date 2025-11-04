/**
 * Types for the Globalping API based on https://api.globalping.io/v1/spec.yaml
 */
import type { DurableObjectNamespace } from "@cloudflare/workers-types";

// OAuth types
export interface GlobalpingOAuthConfig {
	clientId: string;
	redirectUri: string;
	scope: string;
}

export interface GlobalpingOAuthTokenResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token?: string;
	scope: string;
	created_at?: number;
}

// Environment interface
export interface GlobalpingEnv {
	GLOBALPING_CLIENT_ID: string;
	globalping_mcp_object: DurableObjectNamespace;
	OAUTH_KV: KVNamespace;
}

/**
 * Globalping API Types
 * Based on https://api.globalping.io/v1/spec.yaml
 */

// Measurement types supported by Globalping
export type MeasurementType = "ping" | "traceroute" | "dns" | "mtr" | "http";

// Base measurement request options
export interface BaseMeasurementOptions {
	target: string;
	inProgressUpdates?: boolean;
	locations?: LocationOption[] | string;
	limit?: number;
}

// Ping measurement options
export interface PingMeasurementOptions extends BaseMeasurementOptions {
	type: "ping";
	measurementOptions?: {
		packets?: number;
		ipVersion?: 4 | 6;
	};
}

// Traceroute measurement options
export interface TracerouteMeasurementOptions extends BaseMeasurementOptions {
	type: "traceroute";
	measurementOptions?: {
		port?: number;
		protocol?: "ICMP" | "TCP" | "UDP";
		ipVersion?: 4 | 6;
	};
}

// DNS measurement options
export interface DnsMeasurementOptions extends BaseMeasurementOptions {
	type: "dns";
	measurementOptions?: {
		query?: {
			type?:
				| "A"
				| "AAAA"
				| "ANY"
				| "CNAME"
				| "DNSKEY"
				| "DS"
				| "HTTPS"
				| "MX"
				| "NS"
				| "NSEC"
				| "PTR"
				| "RRSIG"
				| "SOA"
				| "TXT"
				| "SRV"
				| "SVCB";
		};
		resolver?: string;
		port?: number;
		protocol?: "TCP" | "UDP";
		ipVersion?: 4 | 6;
		trace?: boolean;
	};
}

// MTR measurement options
export interface MtrMeasurementOptions extends BaseMeasurementOptions {
	type: "mtr";
	measurementOptions?: {
		port?: number;
		protocol?: "ICMP" | "TCP" | "UDP";
		ipVersion?: 4 | 6;
		packets?: number;
	};
}

// HTTP measurement options
export interface HttpMeasurementOptions extends BaseMeasurementOptions {
	type: "http";
	measurementOptions?: {
		request?: {
			host?: string;
			path?: string;
			query?: string;
			method?: "HEAD" | "GET" | "OPTIONS";
			headers?: Record<string, string>;
		};
		resolver?: string;
		port?: number;
		protocol?: "HTTP" | "HTTPS" | "HTTP2";
		ipVersion?: 4 | 6;
	};
}

// Union type of all measurement options
export type MeasurementOptions =
	| PingMeasurementOptions
	| TracerouteMeasurementOptions
	| DnsMeasurementOptions
	| MtrMeasurementOptions
	| HttpMeasurementOptions;

// Location filtering option
export interface LocationOption {
	continent?: string;
	region?: string;
	country?: string;
	state?: string | null;
	city?: string;
	asn?: number;
	network?: string;
	tags?: string[];
	magic?: string;
	limit?: number;
}

// Response from the create measurement API
export interface CreateMeasurementResponse {
	id: string;
	probesCount: number;
}

// Measurement result statuses
export type TestStatus = "in-progress" | "finished" | "failed" | "offline";
export type MeasurementStatus = "in-progress" | "finished";

// Probe location information
export interface ProbeLocation {
	continent: string;
	region: string;
	country: string;
	state: string | null;
	city: string;
	asn: number;
	network: string;
	latitude: number;
	longitude: number;
	tags: string[];
	resolvers: string[];
}

// Base test result interface
export interface BaseTestResult {
	status: TestStatus;
	rawOutput: string;
}

// Finished ping test result
export interface FinishedPingTestResult extends BaseTestResult {
	status: "finished";
	resolvedAddress: string | null;
	resolvedHostname: string | null;
	stats: {
		min: number | null;
		avg: number | null;
		max: number | null;
		total: number;
		rcv: number;
		drop: number;
		loss: number;
	};
	timings: Array<{
		rtt: number;
		ttl: number;
	}>;
}

// Finished traceroute test result
export interface FinishedTracerouteTestResult extends BaseTestResult {
	status: "finished";
	resolvedAddress: string | null;
	resolvedHostname: string | null;
	hops: Array<{
		resolvedAddress: string | null;
		resolvedHostname: string | null;
		timings: Array<{
			rtt: number;
		}>;
	}>;
}

// DNS answer
export interface DnsAnswer {
	name: string;
	type: string;
	ttl: number;
	class: string;
	value: string;
}

// DNS hop result
export interface DnsTestHopResult {
	resolver: string;
	answers: DnsAnswer[];
	timings: {
		total: number;
	};
}

// Finished simple DNS test result
export interface FinishedSimpleDnsTestResult extends BaseTestResult {
	status: "finished";
	statusCode: number;
	statusCodeName: string;
	resolver: string;
	answers: DnsAnswer[];
	timings: {
		total: number;
	};
}

// Finished trace DNS test result
export interface FinishedTraceDnsTestResult extends BaseTestResult {
	status: "finished";
	hops: DnsTestHopResult[];
}

// Finished MTR test result
export interface FinishedMtrTestResult extends BaseTestResult {
	status: "finished";
	resolvedAddress: string | null;
	resolvedHostname: string | null;
	hops: Array<{
		resolvedAddress: string | null;
		resolvedHostname: string | null;
		asn: number[];
		stats: {
			min: number;
			avg: number;
			max: number;
			stDev: number;
			jMin: number;
			jAvg: number;
			jMax: number;
			total: number;
			rcv: number;
			drop: number;
			loss: number;
		};
		timings: Array<{
			rtt: number;
		}>;
	}>;
}

// TLS certificate information
export interface TlsCertificate {
	authorized: boolean;
	protocol: string;
	cipherName: string;
	createdAt: string;
	expiresAt: string;
	subject: {
		CN?: string;
		alt?: string;
	};
	issuer: {
		C?: string;
		O?: string;
		CN?: string;
	};
	keyType: "RSA" | "EC" | null;
	keyBits: number | null;
	serialNumber: string;
	fingerprint256: string;
	publicKey: string | null;
	error?: string;
}

// Finished HTTP test result
export interface FinishedHttpTestResult extends BaseTestResult {
	status: "finished";
	resolvedAddress: string | null;
	rawHeaders: string;
	rawBody: string | null;
	truncated: boolean;
	headers: Record<string, string | string[]>;
	statusCode: number;
	statusCodeName: string;
	timings: {
		total: number | null;
		dns: number | null;
		tcp: number | null;
		tls: number | null;
		firstByte: number | null;
		download: number | null;
	};
	tls: TlsCertificate | null;
}

// In-progress test result
export interface InProgressTestResult extends BaseTestResult {
	status: "in-progress";
}

// Failed test result
export interface FailedTestResult extends BaseTestResult {
	status: "failed";
}

// Offline test result
export interface OfflineTestResult extends BaseTestResult {
	status: "offline";
}

// Union type of all test results
export type TestResult =
	| InProgressTestResult
	| FailedTestResult
	| OfflineTestResult
	| FinishedPingTestResult
	| FinishedTracerouteTestResult
	| FinishedSimpleDnsTestResult
	| FinishedTraceDnsTestResult
	| FinishedMtrTestResult
	| FinishedHttpTestResult;

// Measurement result item
export interface MeasurementResultItem {
	probe: ProbeLocation;
	result: TestResult;
}

// Complete measurement response
export interface MeasurementResponse {
	id: string;
	type: MeasurementType;
	status: MeasurementStatus;
	createdAt: string;
	updatedAt: string;
	target: string;
	probesCount: number;
	locations?: LocationOption[];
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
