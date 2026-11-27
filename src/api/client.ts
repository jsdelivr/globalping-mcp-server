/**
 * Globalping API client wrapper for the official globalping library
 * Centralizes API communication and error handling
 */
import { GLOBALPING_API, GLOBALPING_AUTH } from "../config";
import type { MeasurementOptions, CreateMeasurementResponse } from "../types";
import type { GlobalpingMCP } from "../index";
import { Globalping, type MeasurementResponse, type TypedMeasurementRequest } from "globalping";

/**
 * Validate token is present
 * @param token The token to validate
 * @throws Error if no token provided
 */
function validateToken(token: string): void {
	if (!token) {
		console.log("API Call: No token provided");
		throw new Error("Globalping API error: No token provided");
	}
}

/**
 * Creates a measurement on the Globalping API
 * @param agent The GlobalpingMCP instance
 * @param options The measurement options
 * @param token API token for authenticated requests
 * @returns The created measurement ID and probe count
 */
export async function createMeasurement(
	agent: GlobalpingMCP,
	options: TypedMeasurementRequest,
	token: string,
): Promise<CreateMeasurementResponse> {
	validateToken(token);

	const globalping = new Globalping({ auth: token });
	const result = await globalping.createMeasurement(options);

	if (!result.ok) {
		// Handle authentication errors using library's static method
		if (Globalping.isHttpStatus(401, result)) {
			agent.setIsAuthenticated(false);
		}
		throw new Error(
			`Globalping API error (${result.response.status}): ${JSON.stringify(result.data)}`,
		);
	}

	return result.data;
}

/**
 * Polls for a measurement result until it's complete or timeout occurs
 * @param measurementId The measurement ID to poll for
 * @param token API token for authenticated requests
 * @param signal Optional cancellation signal for polling
 * @returns The complete measurement response
 */
export async function pollMeasurementResult(
	measurementId: string,
	token: string,
	signal?: AbortSignal,
): Promise<MeasurementResponse> {
	validateToken(token);

	const globalping = new Globalping({ auth: token });
	const result = await globalping.awaitMeasurement(
		measurementId,
		signal ? { signal } : undefined,
	);

	if (!result.ok) {
		throw new Error(
			`Globalping API error (${result.response.status}): ${JSON.stringify(result.data)}`,
		);
	}

	return result.data;
}

/**
 * Runs a measurement on the Globalping API and waits for the results
 * @param agent The GlobalpingMCP instance
 * @param options The measurement options
 * @param token API token for authenticated requests
 * @param signal Optional cancellation signal for polling
 * @returns The complete measurement results
 */
export async function runMeasurement(
	agent: GlobalpingMCP,
	options: MeasurementOptions,
	token: string,
	signal?: AbortSignal,
): Promise<MeasurementResponse> {
	validateToken(token);

	const defaultLimit = Math.max(
		GLOBALPING_API.DEFAULT_LIMIT,
		Array.isArray(options.locations) ? options.locations.length : 0,
	);

	if (!options.limit || options.limit < GLOBALPING_API.MIN_LIMIT) {
		options.limit = defaultLimit;
	}

	if (options.limit > GLOBALPING_API.MAX_LIMIT) {
		options.limit = GLOBALPING_API.MAX_LIMIT;
	}

	const result = await createMeasurement(agent, options as TypedMeasurementRequest, token);

	try {
		return await pollMeasurementResult(result.id, token, signal);
	} catch (error: any) {
		if (signal?.aborted) {
			throw error;
		}
		const message = error.message || String(error);
		throw new Error(
			message.includes(result.id) ? message : `${message}\nMeasurement ID: ${result.id}`,
		);
	}
}

/**
 * Gets the current result and status of a measurement
 * @param measurementId The measurement ID to get
 * @param token API token for authenticated requests
 * @returns The measurement response, which may still be in progress
 */
export async function getMeasurement(
	measurementId: string,
	token: string,
): Promise<MeasurementResponse> {
	validateToken(token);

	const globalping = new Globalping({ auth: token });
	const result = await globalping.getMeasurement(measurementId);

	if (!result.ok) {
		throw new Error(
			`Globalping API error (${result.response.status}): ${JSON.stringify(result.data)}`,
		);
	}

	return result.data;
}

/**
 * Gets the state and the owner of a token from the Globalping auth server
 * @param token The token to check
 * @returns The state of the token, with its account when it is active
 */
export async function introspectToken(
	token: string,
): Promise<{ active: boolean; username?: string; organization?: string }> {
	const response = await fetch(GLOBALPING_AUTH.INTROSPECT_URL, {
		method: "POST",
		body: new URLSearchParams({ token }),
	});

	if (!response.ok) {
		throw new Error(`Globalping auth error (${response.status})`);
	}

	return response.json();
}

/**
 * Gets the available locations from the Globalping API
 * @param token API token for authenticated requests
 * @returns The list of available probes
 */
export async function getLocations(token: string): Promise<any> {
	validateToken(token);

	console.log(`API Call: Calling ${GLOBALPING_API.BASE_URL}${GLOBALPING_API.ENDPOINTS.PROBES}`);

	const globalping = new Globalping({ auth: token });
	const result = await globalping.listProbes();

	if (!result.ok) {
		throw new Error(
			`Globalping API error (${result.response.status}): ${JSON.stringify(result.data)}`,
		);
	}

	return result.data;
}

/**
 * Gets the rate limits for the current user/IP
 * @param agent The GlobalpingMCP instance
 * @param token API token for authenticated requests
 * @returns The current rate limits
 */
export async function getRateLimits(agent: GlobalpingMCP, token: string): Promise<any> {
	validateToken(token);

	console.log(`API Call: Calling ${GLOBALPING_API.BASE_URL}${GLOBALPING_API.ENDPOINTS.LIMITS}`);

	const globalping = new Globalping({ auth: token });
	const result = await globalping.getLimits();

	if (!result.ok) {
		// Handle authentication errors using library's static method
		if (Globalping.isHttpStatus(401, result)) {
			agent.setIsAuthenticated(false);
		}
		throw new Error(
			`Globalping API error (${result.response.status}): ${JSON.stringify(result.data)}`,
		);
	}

	return result.data;
}
