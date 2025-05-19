/**
 * Types for the Globalping API based on https://api.globalping.io/v1/spec.yaml
 */
import { OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import {DurableObjectNamespace} from "@cloudflare/workers-types";

// Common types
export interface Location {
	magic?: string;
	continent?: string;
	country?: string;
	region?: string;
	city?: string;
	state?: string;
	asn?: number;
	network?: string;
	tags?: string[];
	measurementId?: string;
}

export interface Pagination {
	limit?: number;
	offset?: number;
}

// Base measurement types
export interface BaseMeasurement {
	target: string;
	type: MeasurementType;
	locations?: Location[];
	limit?: number;
	measurementOptions?: Record<string, any>;
}

export enum MeasurementType {
	PING = "ping",
	TRACEROUTE = "traceroute",
	DNS = "dns",
	MTR = "mtr",
	HTTP = "http",
}

// Ping measurement
export interface PingMeasurementOptions {
	packets?: number;
	packetSize?: number;
}

export interface PingMeasurement extends BaseMeasurement {
	type: MeasurementType.PING;
	measurementOptions?: PingMeasurementOptions;
}

// Traceroute measurement
export interface TracerouteMeasurementOptions {
	protocol?: "ICMP" | "TCP" | "UDP";
	port?: number;
	packetSize?: number;
	maxHops?: number;
}

export interface TracerouteMeasurement extends BaseMeasurement {
	type: MeasurementType.TRACEROUTE;
	measurementOptions?: TracerouteMeasurementOptions;
}

// DNS measurement
export interface DnsMeasurementOptions {
	query?: string;
	type?: string;
	resolver?: string;
	trace?: boolean;
	protocol?: "udp" | "tcp" | "tls" | "https";
}

export interface DnsMeasurement extends BaseMeasurement {
	type: MeasurementType.DNS;
	measurementOptions?: DnsMeasurementOptions;
}

// MTR measurement
export interface MtrMeasurementOptions {
	packets?: number;
	port?: number;
	protocol?: "ICMP" | "TCP" | "UDP";
	packetSize?: number;
	maxHops?: number;
}

export interface MtrMeasurement extends BaseMeasurement {
	type: MeasurementType.MTR;
	measurementOptions?: MtrMeasurementOptions;
}

// HTTP measurement
export interface HttpMeasurementOptions {
	protocol?: "http" | "https";
	path?: string;
	host?: string;
	headers?: Record<string, string>;
	method?: "GET" | "HEAD" | "POST" | "PUT" | "DELETE" | "CONNECT" | "OPTIONS" | "TRACE" | "PATCH";
	body?: string;
	query?: Record<string, string>;
	port?: number;
	protocol2?: string;
	resolveHost?: boolean;
	insecure?: boolean;
	redirects?: boolean;
	ipv4?: boolean;
	ipv6?: boolean;
}

export interface HttpMeasurement extends BaseMeasurement {
	type: MeasurementType.HTTP;
	measurementOptions?: HttpMeasurementOptions;
}

// Measurement response types
export interface CreateMeasurementResponse {
	id: string;
	probesCount: number;
	created: string;
	status: "in-progress" | "complete" | "error";
	results?: ProbeResult[];
}

export interface ProbeResult {
	probe: {
		continent: string;
		region: string;
		country: string;
		state: string;
		city: string;
		asn: number;
		longitude: number;
		latitude: number;
		network: string;
		tags: string[];
	};
	result: {
		status: "finished" | "error" | "timeout";
		rawOutput: string;
		rawError?: string;
	};
	[key: string]: any; // Additional measurement-specific data
}

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

// Tool parameter types for MCP
export interface PingToolParams {
	target: string;
	location?: string; // Magic field
	packets?: number;
	packetSize?: number;
	limit?: number;
}

export interface TracerouteToolParams {
	target: string;
	location?: string; // Magic field
	protocol?: "ICMP" | "TCP" | "UDP";
	port?: number;
	packetSize?: number;
	maxHops?: number;
	limit?: number;
}

export interface DnsToolParams {
	target: string;
	location?: string; // Magic field
	query?: string;
	type?: string;
	resolver?: string;
	trace?: boolean;
	protocol?: "udp" | "tcp" | "tls" | "https";
	limit?: number;
}

export interface MtrToolParams {
	target: string;
	location?: string; // Magic field
	packets?: number;
	port?: number;
	protocol?: "ICMP" | "TCP" | "UDP";
	packetSize?: number;
	maxHops?: number;
	limit?: number;
}

export interface HttpToolParams {
	target: string;
	location?: string; // Magic field
	protocol?: "http" | "https";
	path?: string;
	host?: string;
	headers?: Record<string, string>;
	method?: "GET" | "HEAD" | "POST" | "PUT" | "DELETE" | "CONNECT" | "OPTIONS" | "TRACE" | "PATCH";
	body?: string;
	query?: Record<string, string>;
	port?: number;
	resolveHost?: boolean;
	insecure?: boolean;
	redirects?: boolean;
	ipv4?: boolean;
	ipv6?: boolean;
	limit?: number;
}

export interface CompareToolParams {
	firstTarget: string;
	secondTarget: string;
	location?: string; // Magic field
	type: MeasurementType;
	options?: Record<string, any>;
	limit?: number;
}

export interface GetMeasurementToolParams {
	id: string;
}

// Rate limit info
export interface RateLimitResponse {
	limit: number;
	remaining: number;
	reset: number;
}

// Environment interface
export interface GlobalpingEnv {
	GLOBALPING_CLIENT_ID: string;
	ASSETS: { fetch: typeof fetch };
	globalping_mcp_object: DurableObjectNamespace;
	OAUTH_KV: KVNamespace;
}
