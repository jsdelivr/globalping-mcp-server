/**
 * Globalping API wrapper functions
 */
import { GlobalpingMCP } from "..";
import {
	type MeasurementOptions,
	type CreateMeasurementResponse,
	type MeasurementResponse,
	type ErrorResponse,
} from "./types";

const GLOBALPING_API_URL = "https://api.globalping.io/v1";
let headers: HeadersInit = {
	"Accept": "application/json",
	"User-Agent": "GlobalpingMcpServer/1.0.0",
};

/**
 * Creates a measurement on the Globalping API
 * @param options The measurement options
 * @param token Optional API token for authenticated requests
 * @returns The created measurement ID and probe count
 */
export async function createMeasurement(
	agent: GlobalpingMCP,
	options: MeasurementOptions,
	token: string,
): Promise<CreateMeasurementResponse> {

	if (!token) {
		console.log(`API Call: No token provided`);
		throw new Error(`Globalping API error: No token provided`);
	}

	headers = {
		...headers,
		"Content-Type": "application/json",
		"Authorization": token,
	};

	const response = await fetch(`${GLOBALPING_API_URL}/measurements`, {
		method: "POST",
		headers,
		body: JSON.stringify(options),
	});

	if (!response.ok) {
		const errorData: ErrorResponse = await response.json();

		if (response.status === 401 || response.status === 403) {
			console.log(`API Call: Authentication error - token may be invalid or expired`);
			agent.setOAuthStatus(false);
		}

		throw new Error(`Globalping API error (${response.status}): ${errorData.error.message}`);
	}

	return await response.json();
}

/**
 * Polls for a measurement result until it's complete or timeout occurs
 * @param measurementId The measurement ID to poll for
 * @param maxAttempts Maximum number of polling attempts (default 20)
 * @param delayMs Delay between polling attempts in milliseconds (default 500)
 * @param token API token for authenticated requests
 * @returns The complete measurement response
 */
export async function pollMeasurementResult(
	agent: GlobalpingMCP,
	measurementId: string,
	maxAttempts = 20,
	delayMs = 500,
	token: string,
): Promise<MeasurementResponse> {

	if (!token) {
		console.log(`API Call: No token provided`);
		throw new Error(`Globalping API error: No token provided`);
	}

	headers = {
		...headers,
		"Authorization": token,
	};

	let attempts = 0;

	while (attempts < maxAttempts) {
		const response = await fetch(`${GLOBALPING_API_URL}/measurements/${measurementId}`, {
			headers,
		});

		if (!response.ok) {
			if (response.status === 401 || response.status === 403) {
				console.log(`API Call: Authentication error - token may be invalid or expired`);
				agent.setOAuthStatus(false);
				throw new Error(`Globalping API error: Authentication error - token may be invalid or expired`);
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
 * @param options The measurement options
 * @param token Optional API token for authenticated requests
 * @returns The complete measurement results
 */
export async function runMeasurement(
	agent: GlobalpingMCP,
	options: MeasurementOptions,
	token: string,
): Promise<MeasurementResponse> {

	if (!token) {
		console.log(`API Call: No token provided`);
		throw new Error(`Globalping API error: No token provided`);
	}

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

	const result = await createMeasurement(agent, options, token);
	return await pollMeasurementResult(agent, result.id, 30, 500, token);
}

/**
 * Gets the available locations from the Globalping API
 * @param token Optional API token for authenticated requests
 * @returns The list of available probes
 */
export async function getLocations(agent: GlobalpingMCP, token: string): Promise<any> {
	if (!token) {
		console.log(`API Call: No token provided`);
		throw new Error(`Globalping API error: No token provided`);
	}

	headers = {
		...headers,
		"Authorization": token,
	};

	console.log(`API Call: Calling ${GLOBALPING_API_URL}/probes`);
	const response = await fetch(`${GLOBALPING_API_URL}/probes`, {
		headers,
	});

	if (!response.ok) {
		const errorData: ErrorResponse = await response.json();
		if (response.status === 401 || response.status === 403) {
			console.log(`API Call: Authentication error - token may be invalid or expired`);
			agent.setOAuthStatus(false);
		}

		throw new Error(`Globalping API error (${response.status}): ${errorData.error.message}`);
	}

	return await response.json();
}

/**
 * Gets the rate limits for the current user/IP
 * @param token Optional API token for authenticated requests
 * @returns The current rate limits
 */
export async function getRateLimits(agent: GlobalpingMCP, token: string): Promise<any> {

	if (!token) {
		console.log(`API Call: No token provided`);
		throw new Error(`Globalping API error: No token provided`);
	}

	headers = {
		...headers,
		"Authorization": token,
	};

	console.log(`API Call: Calling ${GLOBALPING_API_URL}/limits`);
	const response = await fetch(`${GLOBALPING_API_URL}/limits`, {
		headers,
	});

	if (!response.ok) {
		try {
			const errorData: ErrorResponse = await response.json();
			console.log(`API Call: Error response: ${JSON.stringify(errorData)}`);

			// Check for auth-related errors
			if (response.status === 401 || response.status === 403) {
				console.log(`API Call: Authentication error - token may be invalid or expired`);
				agent.setOAuthStatus(false);
			}

			throw new Error(`Globalping API error (${response.status}): ${errorData.error.message}`);
		} catch (e) {
			console.log(`API Call: Failed to parse error response: ${e}`);

			// Still check for auth errors even if we can't parse the JSON
			if (response.status === 401 || response.status === 403) {
				console.log(`API Call: Authentication error - token may be invalid or expired`);
				agent.setOAuthStatus(false);
			}

			throw new Error(`Globalping API error (${response.status})`);
		}
	}

	return await response.json();
}
