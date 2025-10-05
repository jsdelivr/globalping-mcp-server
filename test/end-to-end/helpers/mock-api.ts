/**
 * Mock API Helpers for E2E Tests
 *
 * Provides reusable mock responses for Globalping API and OAuth endpoints
 */
import type {
	MeasurementResponse,
	CreateMeasurementResponse,
	MeasurementType,
	GlobalpingOAuthTokenResponse,
} from "../../../src/types";

let measurementIdCounter = 0;

/**
 * Create a mock measurement creation response
 */
export function createMockCreateMeasurementResponse(
	overrides?: Partial<CreateMeasurementResponse>,
): CreateMeasurementResponse {
	return {
		id: `measurement-${Date.now()}-${measurementIdCounter++}`,
		probesCount: 3,
		...overrides,
	};
}

/**
 * Create a mock measurement response
 */
export function createMockMeasurementResponse(
	type: MeasurementType,
	overrides?: Partial<MeasurementResponse>,
): MeasurementResponse {
	const baseResponse: MeasurementResponse = {
		id: `measurement-${Date.now()}`,
		type,
		status: "finished",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		target: "example.com",
		probesCount: 3,
		results: [],
		...overrides,
	};

	return baseResponse;
}

/**
 * Create a mock ping measurement response with results
 */
export function createMockPingMeasurement(target = "google.com"): MeasurementResponse {
	return {
		id: `ping-${Date.now()}`,
		type: "ping",
		status: "finished",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		target,
		probesCount: 3,
		results: [
			{
				probe: {
					continent: "NA",
					region: "Northern America",
					country: "US",
					state: null,
					city: "New York",
					asn: 15169,
					network: "Google LLC",
					latitude: 40.7128,
					longitude: -74.006,
					tags: [],
					resolvers: ["8.8.8.8"],
				},
				result: {
					status: "finished",
					rawOutput: `PING ${target} (142.250.185.46): 56 data bytes\n64 bytes from 142.250.185.46: icmp_seq=0 ttl=118 time=10.123 ms`,
					resolvedAddress: "142.250.185.46",
					resolvedHostname: target,
					stats: {
						min: 10.123,
						avg: 12.456,
						max: 15.789,
						total: 3,
						rcv: 3,
						drop: 0,
						loss: 0,
					},
					timings: [
						{ rtt: 10.123, ttl: 118 },
						{ rtt: 12.456, ttl: 118 },
						{ rtt: 15.789, ttl: 118 },
					],
				},
			},
		],
	};
}

/**
 * Create a mock traceroute measurement response
 */
export function createMockTracerouteMeasurement(target = "google.com"): MeasurementResponse {
	return {
		id: `traceroute-${Date.now()}`,
		type: "traceroute",
		status: "finished",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		target,
		probesCount: 1,
		results: [
			{
				probe: {
					continent: "EU",
					region: "Western Europe",
					country: "DE",
					state: null,
					city: "Frankfurt",
					asn: 8075,
					network: "Microsoft Corporation",
					latitude: 50.1109,
					longitude: 8.6821,
					tags: [],
					resolvers: [],
				},
				result: {
					status: "finished",
					rawOutput: "traceroute output",
					resolvedAddress: "142.250.185.46",
					resolvedHostname: target,
					hops: [
						{
							resolvedAddress: "192.168.1.1",
							resolvedHostname: "gateway",
							timings: [{ rtt: 1.234 }],
						},
						{
							resolvedAddress: "10.0.0.1",
							resolvedHostname: "isp-router",
							timings: [{ rtt: 5.678 }],
						},
					],
				},
			},
		],
	};
}

/**
 * Create a mock DNS measurement response
 */
export function createMockDNSMeasurement(target = "example.com"): MeasurementResponse {
	return {
		id: `dns-${Date.now()}`,
		type: "dns",
		status: "finished",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		target,
		probesCount: 1,
		results: [
			{
				probe: {
					continent: "AS",
					region: "Eastern Asia",
					country: "JP",
					state: null,
					city: "Tokyo",
					asn: 2497,
					network: "Internet Initiative Japan Inc.",
					latitude: 35.6895,
					longitude: 139.6917,
					tags: [],
					resolvers: ["1.1.1.1"],
				},
				result: {
					status: "finished",
					rawOutput: "DNS query output",
					statusCode: 0,
					statusCodeName: "NOERROR",
					resolver: "1.1.1.1",
					answers: [
						{
							name: target,
							type: "A",
							ttl: 300,
							class: "IN",
							value: "93.184.216.34",
						},
					],
					timings: {
						total: 15.432,
					},
				},
			},
		],
	};
}

/**
 * Create a mock HTTP measurement response
 */
export function createMockHTTPMeasurement(target = "example.com"): MeasurementResponse {
	return {
		id: `http-${Date.now()}`,
		type: "http",
		status: "finished",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		target,
		probesCount: 1,
		results: [
			{
				probe: {
					continent: "OC",
					region: "Australia and New Zealand",
					country: "AU",
					state: null,
					city: "Sydney",
					asn: 13335,
					network: "Cloudflare, Inc.",
					latitude: -33.8688,
					longitude: 151.2093,
					tags: [],
					resolvers: [],
				},
				result: {
					status: "finished",
					rawOutput: "HTTP/1.1 200 OK",
					resolvedAddress: "93.184.216.34",
					rawHeaders: "content-type: text/html\ncontent-length: 1256",
					rawBody: "<!DOCTYPE html><html>...</html>",
					truncated: false,
					headers: {
						"content-type": "text/html",
						"content-length": "1256",
					},
					statusCode: 200,
					statusCodeName: "OK",
					timings: {
						total: 145.23,
						dns: 12.34,
						tcp: 23.45,
						tls: 45.67,
						firstByte: 89.12,
						download: 55.88,
					},
					tls: null,
				},
			},
		],
	};
}

/**
 * Create a mock in-progress measurement response
 */
export function createMockInProgressMeasurement(type: MeasurementType): MeasurementResponse {
	return {
		id: `${type}-in-progress-${Date.now()}`,
		type,
		status: "in-progress",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		target: "example.com",
		probesCount: 1,
		results: [
			{
				probe: {
					continent: "NA",
					region: "Northern America",
					country: "US",
					state: null,
					city: "New York",
					asn: 15169,
					network: "Google LLC",
					latitude: 40.7128,
					longitude: -74.006,
					tags: [],
					resolvers: [],
				},
				result: {
					status: "in-progress",
					rawOutput: "",
				},
			},
		],
	};
}

/**
 * Create a mock probes list response
 */
export function createMockProbesList() {
	return [
		{
			location: {
				continent: "NA",
				country: "US",
				city: "New York",
				network: "Cloudflare",
				asn: 13335,
			},
			online: true,
		},
		{
			location: {
				continent: "EU",
				country: "DE",
				city: "Frankfurt",
				network: "Hetzner",
				asn: 24940,
			},
			online: true,
		},
		{
			location: {
				continent: "AS",
				country: "SG",
				city: "Singapore",
				network: "DigitalOcean",
				asn: 14061,
			},
			online: true,
		},
	];
}

/**
 * Create a mock rate limits response
 */
export function createMockRateLimits(authenticated = false) {
	if (authenticated) {
		return {
			rateLimit: {
				measurements: {
					create: {
						type: "account",
						limit: 1000,
						remaining: 950,
						reset: 86400,
					},
				},
			},
			credits: {
				remaining: 10000,
			},
		};
	}

	return {
		rateLimit: {
			measurements: {
				create: {
					type: "ip",
					limit: 100,
					remaining: 95,
					reset: 3600,
				},
			},
		},
	};
}

/**
 * Create a mock OAuth token response
 */
export function createMockOAuthTokenResponse(
	overrides?: Partial<GlobalpingOAuthTokenResponse>,
): GlobalpingOAuthTokenResponse {
	return {
		access_token: `oauth:access:${Date.now()}`,
		token_type: "Bearer",
		expires_in: 3600,
		refresh_token: `oauth:refresh:${Date.now()}`,
		scope: "measurements",
		created_at: Math.floor(Date.now() / 1000),
		...overrides,
	};
}

/**
 * Create a mock user data response
 */
export function createMockUserData(overrides?: any) {
	return {
		username: "testuser",
		email: "test@example.com",
		created_at: new Date().toISOString(),
		...overrides,
	};
}

/**
 * Create a mock error response
 */
export function createMockErrorResponse(type: string, message: string, status = 400) {
	return {
		status,
		ok: false,
		json: async () => ({
			error: {
				type,
				message,
			},
		}),
		text: async () =>
			JSON.stringify({
				error: {
					type,
					message,
				},
			}),
	};
}

/**
 * Mock fetch implementation for Globalping API
 */
export function createGlobalpingAPIFetch() {
	const measurements = new Map<string, MeasurementResponse>();

	return async (url: string | URL, init?: RequestInit): Promise<Response> => {
		const urlStr = url.toString();

		// Handle measurement creation
		if (urlStr.includes("/measurements") && init?.method === "POST") {
			const body = JSON.parse(init.body as string);
			const createResponse = createMockCreateMeasurementResponse();

			// Create and store the measurement
			let measurement: MeasurementResponse;
			switch (body.type) {
				case "ping":
					measurement = createMockPingMeasurement(body.target);
					break;
				case "traceroute":
					measurement = createMockTracerouteMeasurement(body.target);
					break;
				case "dns":
					measurement = createMockDNSMeasurement(body.target);
					break;
				case "http":
					measurement = createMockHTTPMeasurement(body.target);
					break;
				default:
					measurement = createMockMeasurementResponse(body.type, { target: body.target });
			}

			measurement.id = createResponse.id;
			measurements.set(createResponse.id, measurement);

			return {
				ok: true,
				json: async () => createResponse,
			} as Response;
		}

		// Handle measurement retrieval
		if (urlStr.includes("/measurements/") && init?.method !== "POST") {
			const id = urlStr.split("/measurements/")[1];
			const measurement = measurements.get(id);

			if (measurement) {
				return {
					ok: true,
					json: async () => measurement,
				} as Response;
			}

			return createMockErrorResponse("not_found", "Measurement not found", 404) as Response;
		}

		// Handle probes list
		if (urlStr.includes("/probes")) {
			return {
				ok: true,
				json: async () => createMockProbesList(),
			} as Response;
		}

		// Handle rate limits
		if (urlStr.includes("/limits")) {
			const authHeader = (init?.headers as any)?.Authorization || "";
			const isAuthenticated = authHeader.includes("oauth:");
			return {
				ok: true,
				json: async () => createMockRateLimits(isAuthenticated),
			} as Response;
		}

		return createMockErrorResponse("not_found", "Endpoint not found", 404) as Response;
	};
}
