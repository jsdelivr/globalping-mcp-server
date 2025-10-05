/**
 * Tests for api/error-handler.ts
 */
import { describe, it, expect, vi } from "vitest";
import { handleAuthError, createErrorMessage, handleAPIError } from "../../src/api/error-handler";
import type { ErrorResponse } from "../../src/types";

// Mock GlobalpingMCP
const createMockAgent = () => {
	return {
		setIsAuthenticated: vi.fn(),
	};
};

describe("handleAuthError", () => {
	it("should handle 401 Unauthorized error", () => {
		const agent = createMockAgent();
		const response = new Response(null, { status: 401 });
		const token = "Bearer test-token-12345678901234567890";

		const result = handleAuthError(agent as any, response, token);

		expect(result).toBe(true);
		expect(agent.setIsAuthenticated).toHaveBeenCalledWith(false);
	});

	it("should handle 403 Forbidden error", () => {
		const agent = createMockAgent();
		const response = new Response(null, { status: 403 });
		const token = "Bearer test-token-12345678901234567890";

		const result = handleAuthError(agent as any, response, token);

		expect(result).toBe(true);
		expect(agent.setIsAuthenticated).toHaveBeenCalledWith(false);
	});

	it("should return false for 404 Not Found", () => {
		const agent = createMockAgent();
		const response = new Response(null, { status: 404 });
		const token = "Bearer test-token-12345678901234567890";

		const result = handleAuthError(agent as any, response, token);

		expect(result).toBe(false);
		expect(agent.setIsAuthenticated).not.toHaveBeenCalled();
	});

	it("should return false for 500 Internal Server Error", () => {
		const agent = createMockAgent();
		const response = new Response(null, { status: 500 });
		const token = "Bearer test-token-12345678901234567890";

		const result = handleAuthError(agent as any, response, token);

		expect(result).toBe(false);
		expect(agent.setIsAuthenticated).not.toHaveBeenCalled();
	});

	it("should return false for 200 OK", () => {
		const agent = createMockAgent();
		const response = new Response(null, { status: 200 });
		const token = "Bearer test-token-12345678901234567890";

		const result = handleAuthError(agent as any, response, token);

		expect(result).toBe(false);
		expect(agent.setIsAuthenticated).not.toHaveBeenCalled();
	});

	it("should handle short token correctly", () => {
		const agent = createMockAgent();
		const response = new Response(null, { status: 401 });
		const token = "Bearer short";

		const result = handleAuthError(agent as any, response, token);

		expect(result).toBe(true);
		expect(agent.setIsAuthenticated).toHaveBeenCalledWith(false);
	});
});

describe("createErrorMessage", () => {
	it("should create error message from error response", () => {
		const response = new Response(null, { status: 400 });
		const errorData: ErrorResponse = {
			error: {
				type: "validation_error",
				message: "Invalid target parameter",
			},
		};

		const message = createErrorMessage(response, errorData);

		expect(message).toBe("Globalping API error (400): Invalid target parameter");
	});

	it("should handle 404 error", () => {
		const response = new Response(null, { status: 404 });
		const errorData: ErrorResponse = {
			error: {
				type: "not_found",
				message: "Measurement not found",
			},
		};

		const message = createErrorMessage(response, errorData);

		expect(message).toBe("Globalping API error (404): Measurement not found");
	});

	it("should handle 500 error", () => {
		const response = new Response(null, { status: 500 });
		const errorData: ErrorResponse = {
			error: {
				type: "internal_error",
				message: "Internal server error",
			},
		};

		const message = createErrorMessage(response, errorData);

		expect(message).toBe("Globalping API error (500): Internal server error");
	});

	it("should handle error with params", () => {
		const response = new Response(null, { status: 400 });
		const errorData: ErrorResponse = {
			error: {
				type: "validation_error",
				message: "Invalid parameter",
				params: {
					field: "target",
					reason: "required",
				},
			},
		};

		const message = createErrorMessage(response, errorData);

		expect(message).toContain("400");
		expect(message).toContain("Invalid parameter");
	});

	it("should handle long error messages", () => {
		const response = new Response(null, { status: 400 });
		const longMessage = "This is a very long error message ".repeat(10);
		const errorData: ErrorResponse = {
			error: {
				type: "validation_error",
				message: longMessage,
			},
		};

		const message = createErrorMessage(response, errorData);

		expect(message).toContain(longMessage);
	});
});

describe("handleAPIError", () => {
	it("should throw error with parsed error message", async () => {
		const agent = createMockAgent();
		const errorData: ErrorResponse = {
			error: {
				type: "validation_error",
				message: "Invalid request",
			},
		};

		const response = new Response(JSON.stringify(errorData), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});

		const token = "Bearer test-token-12345678901234567890";

		await expect(handleAPIError(agent as any, response, token)).rejects.toThrow(
			"Globalping API error (400)",
		);
	});

	it("should handle auth error and throw", async () => {
		const agent = createMockAgent();
		const errorData: ErrorResponse = {
			error: {
				type: "unauthorized",
				message: "Invalid token",
			},
		};

		const response = new Response(JSON.stringify(errorData), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});

		const token = "Bearer test-token-12345678901234567890";

		await expect(handleAPIError(agent as any, response, token)).rejects.toThrow(
			"Globalping API error (401)",
		);

		expect(agent.setIsAuthenticated).toHaveBeenCalledWith(false);
	});

	it("should handle JSON parse error", async () => {
		const agent = createMockAgent();
		const response = new Response("Not JSON", {
			status: 500,
			headers: { "Content-Type": "text/plain" },
		});

		const token = "Bearer test-token-12345678901234567890";

		await expect(handleAPIError(agent as any, response, token)).rejects.toThrow(
			"Globalping API error (500)",
		);
	});

	it("should handle auth error even when JSON parse fails", async () => {
		const agent = createMockAgent();
		const response = new Response("Not JSON", {
			status: 401,
			headers: { "Content-Type": "text/plain" },
		});

		const token = "Bearer test-token-12345678901234567890";

		await expect(handleAPIError(agent as any, response, token)).rejects.toThrow(
			"Globalping API error (401)",
		);

		expect(agent.setIsAuthenticated).toHaveBeenCalledWith(false);
	});

	it("should handle empty response body", async () => {
		const agent = createMockAgent();
		const response = new Response("", {
			status: 500,
		});

		const token = "Bearer test-token-12345678901234567890";

		await expect(handleAPIError(agent as any, response, token)).rejects.toThrow(
			"Globalping API error (500)",
		);
	});

	it("should handle 403 Forbidden with auth error", async () => {
		const agent = createMockAgent();
		const errorData: ErrorResponse = {
			error: {
				type: "forbidden",
				message: "Access denied",
			},
		};

		const response = new Response(JSON.stringify(errorData), {
			status: 403,
			headers: { "Content-Type": "application/json" },
		});

		const token = "Bearer test-token-12345678901234567890";

		await expect(handleAPIError(agent as any, response, token)).rejects.toThrow(
			"Globalping API error (403)",
		);

		expect(agent.setIsAuthenticated).toHaveBeenCalledWith(false);
	});

	it("should handle malformed JSON response", async () => {
		const agent = createMockAgent();
		const response = new Response("{invalid json", {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});

		const token = "Bearer test-token-12345678901234567890";

		await expect(handleAPIError(agent as any, response, token)).rejects.toThrow(
			"Globalping API error (500)",
		);
	});

	it("should handle null response body", async () => {
		const agent = createMockAgent();
		const response = new Response(null, {
			status: 500,
		});

		const token = "Bearer test-token-12345678901234567890";

		await expect(handleAPIError(agent as any, response, token)).rejects.toThrow(
			"Globalping API error (500)",
		);
	});

	it("should handle error response with complex error object", async () => {
		const agent = createMockAgent();
		const errorData: ErrorResponse = {
			error: {
				type: "rate_limit_exceeded",
				message: "Too many requests",
				params: {
					limit: "100",
					window: "1h",
					retry_after: "3600",
				},
			},
		};

		const response = new Response(JSON.stringify(errorData), {
			status: 429,
			headers: { "Content-Type": "application/json" },
		});

		const token = "Bearer test-token-12345678901234567890";

		await expect(handleAPIError(agent as any, response, token)).rejects.toThrow(
			"Globalping API error (429)",
		);
	});
});
