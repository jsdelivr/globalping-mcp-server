/**
 * Mock Environment Helpers for E2E Tests
 *
 * Provides reusable mock implementations of Cloudflare Workers environment
 * including KV, Durable Objects, and OAuth providers
 */
import { vi } from "vitest";
import type { GlobalpingEnv, Props, State } from "../../../src/types";
import type { AuthRequest } from "@cloudflare/workers-oauth-provider";

/**
 * Create a mock KV namespace
 */
export function createMockKV() {
	const store = new Map<string, string>();

	return {
		get: vi.fn(async (key: string) => store.get(key) || null),
		put: vi.fn(async (key: string, value: string, options?: any) => {
			store.set(key, value);
			if (options?.expirationTtl) {
				// In real environment, this would expire after TTL
				setTimeout(() => store.delete(key), options.expirationTtl * 1000);
			}
		}),
		delete: vi.fn(async (key: string) => {
			store.delete(key);
		}),
		list: vi.fn(async (options?: { prefix?: string }) => {
			const keys = Array.from(store.keys())
				.filter((key) => !options?.prefix || key.startsWith(options.prefix))
				.map((name) => ({ name }));
			return { keys, list_complete: true, cursor: "" };
		}),
		getWithMetadata: vi.fn(async (key: string) => ({
			value: store.get(key) || null,
			metadata: null,
		})),
		// Internal method to clear all data
		_clear: () => store.clear(),
		// Internal method to get all data (for testing)
		_getAll: () => Object.fromEntries(store.entries()),
	};
}

/**
 * Create a mock OAuth provider
 */
export function createMockOAuthProvider() {
	return {
		parseAuthRequest: vi.fn(async (req: Request): Promise<AuthRequest> => {
			const url = new URL(req.url);
			return {
				responseType: (url.searchParams.get("response_type") || "code") as "code" | "token",
				clientId: url.searchParams.get("client_id") || "",
				redirectUri: url.searchParams.get("redirect_uri") || "",
				scope: [url.searchParams.get("scope") || ""],
				state: url.searchParams.get("state") || "",
				codeChallenge: url.searchParams.get("code_challenge") || "",
				codeChallengeMethod: (url.searchParams.get("code_challenge_method") || "S256") as
					| "S256"
					| "plain",
			};
		}),
		completeAuthorization: vi.fn(
			async (params: {
				request: AuthRequest;
				userId: string;
				metadata?: any;
				scope?: string;
				props?: any;
			}) => {
				const url = new URL(params.request.redirectUri);
				url.searchParams.append("code", "mock-auth-code");
				url.searchParams.append("state", params.request.state || "");
				return { redirectTo: url.toString() };
			},
		),
	};
}

/**
 * Create a mock Durable Object namespace
 */
export function createMockDurableObjectNamespace() {
	const objects = new Map<string, any>();

	return {
		idFromName: vi.fn((name: string) => ({
			toString: () => name,
			equals: (other: any) => other.toString() === name,
		})),
		idFromString: vi.fn((id: string) => ({
			toString: () => id,
			equals: (other: any) => other.toString() === id,
		})),
		get: vi.fn((id: any) => {
			const key = id.toString();
			if (!objects.has(key)) {
				objects.set(key, createMockDurableObject());
			}
			return objects.get(key);
		}),
		// Internal method to clear all objects
		_clear: () => objects.clear(),
	};
}

/**
 * Create a mock Durable Object instance
 */
export function createMockDurableObject() {
	return {
		fetch: vi.fn(async (req: Request) => {
			return new Response("Mock Durable Object response", { status: 200 });
		}),
	};
}

/**
 * Create a complete mock environment for testing
 */
export function createMockEnv(overrides?: Partial<GlobalpingEnv>): GlobalpingEnv {
	return {
		GLOBALPING_CLIENT_ID: "test-client-id",
		OAUTH_KV: createMockKV() as any,
		globalping_mcp_object: createMockDurableObjectNamespace() as any,
		...overrides,
	};
}

/**
 * Create mock props for authenticated OAuth user
 */
export function createMockOAuthProps(overrides?: Partial<Props>): Props {
	return {
		accessToken: "Bearer oauth:token:12345",
		refreshToken: "refresh:token:67890",
		state: "state-abc",
		userName: "testuser",
		clientId: "client-123",
		isAuthenticated: true,
		...overrides,
	};
}

/**
 * Create mock props for API key user
 */
export function createMockAPIKeyProps(overrides?: Partial<Props>): Props {
	return {
		accessToken: "Bearer abcdefghijklmnopqrstuvwxyz123456",
		refreshToken: "",
		state: "",
		userName: "API Token User",
		clientId: "",
		isAuthenticated: true,
		...overrides,
	};
}

/**
 * Create mock state for MCP agent
 */
export function createMockState(overrides?: Partial<State>): State {
	return {
		measurements: {},
		oAuth: {},
		lastMeasurementId: undefined,
		...overrides,
	};
}

/**
 * Create a mock execution context
 */
export function createMockExecutionContext() {
	return {
		waitUntil: vi.fn((promise: Promise<any>) => promise),
		passThroughOnException: vi.fn(),
	};
}

/**
 * Create a mock Request object with auth headers
 */
export function createAuthenticatedRequest(
	url: string,
	token: string,
	options?: RequestInit,
): Request {
	return new Request(url, {
		...options,
		headers: {
			Authorization: `Bearer ${token}`,
			...options?.headers,
		},
	});
}

/**
 * Wait for async operations to complete
 */
export async function waitForAsync(ms = 0) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Clean up all mocks
 */
export function cleanupMocks(env: ReturnType<typeof createMockEnv>) {
	if (env.OAUTH_KV && "_clear" in env.OAUTH_KV) {
		(env.OAUTH_KV as any)._clear();
	}
	if (env.globalping_mcp_object && "_clear" in env.globalping_mcp_object) {
		(env.globalping_mcp_object as any)._clear();
	}
	vi.clearAllMocks();
}
