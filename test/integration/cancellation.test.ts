import { SELF } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const token = "abcdefghijklmnopqrstuvwxyz123456";

describe("MCP request cancellation", () => {
	let originalFetch: typeof globalThis.fetch;
	let pollCount: number;
	let pollAborted: boolean;

	beforeEach(() => {
		originalFetch = globalThis.fetch;
		pollCount = 0;
		pollAborted = false;
		globalThis.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
			const request = input instanceof Request ? input : new Request(input, init);
			if (request.url === "https://api.globalping.io/v1/measurements" && request.method === "POST") {
				return Response.json({ id: "cancelled-measurement", probesCount: 1 });
			}
			if (
				request.url === "https://api.globalping.io/v1/measurements/cancelled-measurement" &&
				request.method === "GET"
			) {
				pollCount++;
				request.signal.addEventListener("abort", () => {
					pollAborted = true;
				});
				return Response.json(
					{
						id: "cancelled-measurement",
						type: "ping",
						status: "in-progress",
						createdAt: "2026-01-01T00:00:00Z",
						updatedAt: "2026-01-01T00:00:00Z",
						target: "example.com",
						probesCount: 1,
						results: [],
					},
					{ headers: { ETag: '"poll-1"' } },
				);
			}
			return originalFetch(input, init);
		}) as typeof globalThis.fetch;
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it("aborts an active measurement and stops polling", async () => {
		const send = async (message: unknown, sessionId?: string) =>
			SELF.fetch("http://localhost/mcp", {
				method: "POST",
				headers: {
					Host: "localhost",
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
					Accept: "application/json, text/event-stream",
					...(sessionId && { "Mcp-Session-Id": sessionId }),
				},
				body: JSON.stringify(message),
			});

		const initializeResponse = await send({
			jsonrpc: "2.0",
			id: 1,
			method: "initialize",
			params: {
				protocolVersion: "2024-11-05",
				capabilities: {},
				clientInfo: { name: "cancellation-test", version: "1.0.0" },
			},
		});
		expect(initializeResponse.status).toBe(200);
		await initializeResponse.text();
		const sessionId = initializeResponse.headers.get("Mcp-Session-Id");
		expect(sessionId).toBeTruthy();
		await send({ jsonrpc: "2.0", method: "notifications/initialized" }, sessionId!);

		const callResponse = await send(
			{
				jsonrpc: "2.0",
				id: 2,
				method: "tools/call",
				params: { name: "ping", arguments: { target: "example.com" } },
			},
			sessionId!,
		);
		expect(callResponse.status).toBe(200);
		await vi.waitFor(() => expect(pollCount).toBe(1));

		const cancellationResponse = await send(
			{
				jsonrpc: "2.0",
				method: "notifications/cancelled",
				params: { requestId: 2, reason: "Integration test cancellation" },
			},
			sessionId!,
		);
		expect(cancellationResponse.status).toBe(202);
		await vi.waitFor(() => expect(pollAborted).toBe(true));

		await new Promise((resolve) => setTimeout(resolve, 600));
		expect(pollCount).toBe(1);
		await callResponse.body?.cancel();
	});
});
