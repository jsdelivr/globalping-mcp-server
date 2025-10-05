/**
 * API error handling utilities
 */
import { HTTP_STATUS } from "../config";
import { maskToken } from "../auth";
import type { ErrorResponse } from "../types";
import type { GlobalpingMCP } from "../index";

/**
 * Handle authentication errors from API responses
 * @param agent The GlobalpingMCP instance
 * @param response The HTTP response
 * @param token The token used for the request
 * @returns True if an auth error was handled
 */
export function handleAuthError(agent: GlobalpingMCP, response: Response, token: string): boolean {
	if (response.status === HTTP_STATUS.UNAUTHORIZED || response.status === HTTP_STATUS.FORBIDDEN) {
		console.log(
			`API Call: Authentication error - token ${maskToken(token)} may be invalid or expired`,
		);
		agent.setIsAuthenticated(false);
		return true;
	}
	return false;
}

/**
 * Create an error message from an API error response
 * @param response The HTTP response
 * @param errorData The parsed error data
 * @returns Error message string
 */
export function createErrorMessage(response: Response, errorData: ErrorResponse): string {
	return `Globalping API error (${response.status}): ${errorData.error.message}`;
}

/**
 * Handle API errors with proper logging and error handling
 * @param agent The GlobalpingMCP instance
 * @param response The HTTP response
 * @param token The token used for the request
 * @throws Error with formatted message
 */
export async function handleAPIError(
	agent: GlobalpingMCP,
	response: Response,
	token: string,
): Promise<never> {
	try {
		const errorData: ErrorResponse = await response.json();
		console.log(`API Call: Error response: ${JSON.stringify(errorData)}`);

		handleAuthError(agent, response, token);
		throw new Error(createErrorMessage(response, errorData));
	} catch (e) {
		console.log(`API Call: Failed to parse error response: ${e}`);

		// Still check for auth errors even if we can't parse the JSON
		handleAuthError(agent, response, token);

		throw new Error(`Globalping API error (${response.status})`);
	}
}
