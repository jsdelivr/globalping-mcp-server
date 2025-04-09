/**
 * Globalping API wrapper functions
 */
import {
	type MeasurementOptions,
	type CreateMeasurementResponse,
	type MeasurementResponse,
	type ErrorResponse,
	MeasurementType,
} from "./types";

const GLOBALPING_API_URL = "https://api.globalping.io/v1";

/**
 * Creates a measurement on the Globalping API
 * @param options The measurement options
 * @param token Optional API token for authenticated requests
 * @returns The created measurement ID and probe count
 */
export async function createMeasurement(
	options: MeasurementOptions,
	token?: string,
): Promise<CreateMeasurementResponse> {
	const headers: HeadersInit = {
		"Content-Type": "application/json",
		Accept: "application/json",
		"User-Agent": "GlobalpingMcpServer/1.0.0",
	};

	// Only add the Authorization header if a non-empty token is provided
	if (token && token.trim() !== "" && token !== "Bearer ") {
		headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
	}

	const response = await fetch(`${GLOBALPING_API_URL}/measurements`, {
		method: "POST",
		headers,
		body: JSON.stringify(options),
	});

	if (!response.ok) {
		const errorData: ErrorResponse = await response.json();
		throw new Error(`Globalping API error (${response.status}): ${errorData.error.message}`);
	}

	return await response.json();
}

/**
 * Polls for a measurement result until it's complete or timeout occurs
 * @param measurementId The measurement ID to poll for
 * @param maxAttempts Maximum number of polling attempts (default 20)
 * @param delayMs Delay between polling attempts in milliseconds (default 500)
 * @param token Optional API token for authenticated requests
 * @returns The complete measurement response
 */
export async function pollMeasurementResult(
	measurementId: string,
	maxAttempts = 20,
	delayMs = 500,
	token?: string,
): Promise<MeasurementResponse> {
	const headers: HeadersInit = {
		Accept: "application/json",
		"User-Agent": "GlobalpingMcpServer/1.0.0",
	};

	// Only add the Authorization header if a non-empty token is provided
	if (token && token.trim() !== "" && token !== "Bearer ") {
		headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
	}

	let attempts = 0;

	while (attempts < maxAttempts) {
		const response = await fetch(`${GLOBALPING_API_URL}/measurements/${measurementId}`, {
			headers,
		});

		if (!response.ok) {
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
 * @param options The measurement options
 * @param token Optional API token for authenticated requests
 * @returns The complete measurement results
 */
export async function runMeasurement(
	options: MeasurementOptions,
	token?: string,
): Promise<MeasurementResponse> {
	// Always enforce a default limit of 3 probes if not specified
	if (!options.limit) {
		options.limit = 3;
	}

	// Ensure limit is within reasonable bounds (1-100)
	if (options.limit < 1) {
		options.limit = 1;
	} else if (options.limit > 100) {
		options.limit = 100;
	}

	const result = await createMeasurement(options, token);
	return await pollMeasurementResult(result.id, 30, 500, token);
}

/**
 * Gets the available locations from the Globalping API
 * @param token Optional API token for authenticated requests
 * @returns The list of available probes
 */
export async function getLocations(token?: string): Promise<any> {
	const headers: HeadersInit = {
		Accept: "application/json",
		"User-Agent": "GlobalpingMcpServer/1.0.0",
	};

	// Only add the Authorization header if a non-empty token is provided
	if (token && token.trim() !== "" && token !== "Bearer ") {
		headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
	}

	const response = await fetch(`${GLOBALPING_API_URL}/probes`, {
		headers,
	});

	if (!response.ok) {
		const errorData: ErrorResponse = await response.json();
		throw new Error(`Globalping API error (${response.status}): ${errorData.error.message}`);
	}

	return await response.json();
}

/**
 * Gets the rate limits for the current user/IP
 * @param token Optional API token for authenticated requests
 * @returns The current rate limits
 */
export async function getRateLimits(token?: string): Promise<any> {
	const headers: HeadersInit = {
		Accept: "application/json",
		"User-Agent": "GlobalpingMcpServer/1.0.0",
	};

	// Only add the Authorization header if a non-empty token is provided
	if (token && token.trim() !== "" && token !== "Bearer ") {
		headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
	}

	const response = await fetch(`${GLOBALPING_API_URL}/limits`, {
		headers,
	});

	if (!response.ok) {
		const errorData: ErrorResponse = await response.json();
		throw new Error(`Globalping API error (${response.status}): ${errorData.error.message}`);
	}

	return await response.json();
}
