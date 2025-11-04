/**
 * Globalping API client wrapper for the official globalping library
 * Centralizes API communication and error handling
 */
import { GLOBALPING_API } from "../config";
import type { MeasurementOptions, MeasurementResponse, CreateMeasurementResponse } from "../types";
import type { GlobalpingMCP } from "../index";
import { Globalping, type TypedMeasurementRequest } from "globalping";

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
		if (Globalping.isHttpStatus(401, result) || Globalping.isHttpStatus(403, result)) {
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
 * @param agent The GlobalpingMCP instance
 * @param measurementId The measurement ID to poll for
 * @param token API token for authenticated requests
 * @returns The complete measurement response
 */
export async function pollMeasurementResult(
	agent: GlobalpingMCP,
	measurementId: string,
	token: string,
): Promise<MeasurementResponse> {
	validateToken(token);

	const globalping = new Globalping({ auth: token });
	const result = await globalping.awaitMeasurement(measurementId);

	if (!result.ok) {
		// Handle authentication errors using library's static method
		if (Globalping.isHttpStatus(401, result) || Globalping.isHttpStatus(403, result)) {
			agent.setIsAuthenticated(false);
		}
		throw new Error(
			`Globalping API error (${result.response.status}): ${JSON.stringify(result.data)}`,
		);
	}

	return result.data as MeasurementResponse;
}

/**
 * Runs a measurement on the Globalping API and waits for the results
 * @param agent The GlobalpingMCP instance
 * @param options The measurement options
 * @param token API token for authenticated requests
 * @returns The complete measurement results
 */
export async function runMeasurement(
	agent: GlobalpingMCP,
	options: MeasurementOptions,
	token: string,
): Promise<MeasurementResponse> {
	validateToken(token);

	// Always enforce a default limit if not specified
	if (!options.limit) {
		options.limit = GLOBALPING_API.DEFAULT_LIMIT;
	}

	// Ensure limit is within reasonable bounds
	if (options.limit < GLOBALPING_API.MIN_LIMIT) {
		options.limit = GLOBALPING_API.DEFAULT_LIMIT;
	} else if (options.limit > GLOBALPING_API.MAX_LIMIT) {
		options.limit = GLOBALPING_API.MAX_LIMIT;
	}

	const result = await createMeasurement(agent, options as TypedMeasurementRequest, token);
	return await pollMeasurementResult(agent, result.id, token);
}

/**
 * Gets the available locations from the Globalping API
 * @param agent The GlobalpingMCP instance
 * @param token API token for authenticated requests
 * @returns The list of available probes
 */
export async function getLocations(agent: GlobalpingMCP, token: string): Promise<any> {
	validateToken(token);

	console.log(`API Call: Calling ${GLOBALPING_API.BASE_URL}${GLOBALPING_API.ENDPOINTS.PROBES}`);

	const globalping = new Globalping({ auth: token });
	const result = await globalping.listProbes();

	if (!result.ok) {
		// Handle authentication errors using library's static method
		if (Globalping.isHttpStatus(401, result) || Globalping.isHttpStatus(403, result)) {
			agent.setIsAuthenticated(false);
		}
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
		if (Globalping.isHttpStatus(401, result) || Globalping.isHttpStatus(403, result)) {
			agent.setIsAuthenticated(false);
		}
		throw new Error(
			`Globalping API error (${result.response.status}): ${JSON.stringify(result.data)}`,
		);
	}

	return result.data;
}
