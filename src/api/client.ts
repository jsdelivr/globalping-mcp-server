/**
 * Globalping API client
 * Centralized API communication
 */
import { GLOBALPING_API, HTTP_HEADERS } from "../config";
import { sanitizeToken } from "../auth";
import { handleAPIError, handleAuthError } from "./error-handler";
import type {
	MeasurementOptions,
	CreateMeasurementResponse,
	MeasurementResponse,
	ErrorResponse,
} from "../types";
import type { GlobalpingMCP } from "../index";

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
 * Build headers for API requests
 * @param token The authorization token
 * @param includeContentType Whether to include Content-Type header
 * @returns Headers object
 */
function buildHeaders(token: string, includeContentType = false): HeadersInit {
	const headers: HeadersInit = {
		Accept: HTTP_HEADERS.ACCEPT,
		"User-Agent": HTTP_HEADERS.USER_AGENT,
		Authorization: sanitizeToken(token),
	};

	if (includeContentType) {
		headers["Content-Type"] = HTTP_HEADERS.CONTENT_TYPE;
	}

	return headers;
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
	options: MeasurementOptions,
	token: string,
): Promise<CreateMeasurementResponse> {
	validateToken(token);

	const response = await fetch(
		`${GLOBALPING_API.BASE_URL}${GLOBALPING_API.ENDPOINTS.MEASUREMENTS}`,
		{
			method: "POST",
			headers: buildHeaders(token, true),
			body: JSON.stringify(options),
		},
	);

	if (!response.ok) {
		await handleAPIError(agent, response, token);
	}

	return await response.json();
}

/**
 * Polls for a measurement result until it's complete or timeout occurs
 * @param agent The GlobalpingMCP instance
 * @param measurementId The measurement ID to poll for
 * @param token API token for authenticated requests
 * @param maxAttempts Maximum number of polling attempts
 * @param delayMs Delay between polling attempts in milliseconds
 * @returns The complete measurement response
 */
export async function pollMeasurementResult(
	agent: GlobalpingMCP,
	measurementId: string,
	token: string,
	maxAttempts = GLOBALPING_API.POLL_CONFIG.MAX_ATTEMPTS,
	delayMs = GLOBALPING_API.POLL_CONFIG.DELAY_MS,
): Promise<MeasurementResponse> {
	validateToken(token);

	const headers = buildHeaders(token);
	let attempts = 0;

	while (attempts < maxAttempts) {
		const response = await fetch(
			`${GLOBALPING_API.BASE_URL}${GLOBALPING_API.ENDPOINTS.MEASUREMENTS}/${measurementId}`,
			{ headers },
		);

		if (!response.ok) {
			if (handleAuthError(agent, response, token)) {
				throw new Error(
					"Globalping API error: Authentication error - token may be invalid or expired",
				);
			}
			attempts++;
			await new Promise((resolve) => setTimeout(resolve, delayMs));
			continue;
		}

		const data: MeasurementResponse = await response.json();

		// Check if all measurements are complete
		const allComplete =
			data.status === "finished" ||
			data.results.every((m) => m.result.status !== "in-progress");

		if (allComplete) {
			return data;
		}

		attempts++;
		await new Promise((resolve) => setTimeout(resolve, delayMs));
	}

	throw new Error(`Timeout waiting for measurement results after ${maxAttempts} attempts`);
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

	const result = await createMeasurement(agent, options, token);
	return await pollMeasurementResult(
		agent,
		result.id,
		token,
		GLOBALPING_API.POLL_CONFIG.MAX_ATTEMPTS,
		GLOBALPING_API.POLL_CONFIG.DELAY_MS,
	);
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
	const response = await fetch(`${GLOBALPING_API.BASE_URL}${GLOBALPING_API.ENDPOINTS.PROBES}`, {
		headers: buildHeaders(token),
	});

	if (!response.ok) {
		await handleAPIError(agent, response, token);
	}

	return await response.json();
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
	const response = await fetch(`${GLOBALPING_API.BASE_URL}${GLOBALPING_API.ENDPOINTS.LIMITS}`, {
		headers: buildHeaders(token),
	});

	if (!response.ok) {
		await handleAPIError(agent, response, token);
	}

	return await response.json();
}
