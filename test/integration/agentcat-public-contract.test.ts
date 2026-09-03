import { SELF, env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

declare global {
	namespace Cloudflare {
		interface Env {
			MCPCAT_PROJECT_ID?: string;
		}
	}
}

const token = "abcdefghijklmnopqrstuvwxyz123456";

const parseResponse = async (response: Response) => {
	const text = await response.text();
	const dataLine = text.split("\n").find((line) => line.startsWith("data: "));
	return JSON.parse(dataLine ? dataLine.slice(6) : text);
};

const propertyKeys = (value: unknown): string[] => {
	if (!value || typeof value !== "object") {
		return [];
	}
	return Object.entries(value).flatMap(([key, child]) => [key, ...propertyKeys(child)]);
};

describe("AgentCat public MCP contract", () => {
	let originalFetch: typeof globalThis.fetch;
	let originalProjectId: string | undefined;
	let telemetryFetch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		originalFetch = globalThis.fetch;
		originalProjectId = env.MCPCAT_PROJECT_ID;
		env.MCPCAT_PROJECT_ID = "agentcat-public-contract-test";
		telemetryFetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
			const url = new URL(
				typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
			);
			if (url.hostname.endsWith("agentcat.com")) {
				return new Response("{}", {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			}
			return originalFetch(input, init);
		});
		globalThis.fetch = telemetryFetch as typeof globalThis.fetch;
	});

	afterEach(() => {
		env.MCPCAT_PROJECT_ID = originalProjectId;
		globalThis.fetch = originalFetch;
	});

	it("does not expose disabled AgentCat context or session fields", async () => {
		const send = async (message: unknown, sessionId?: string) => {
			const response = await SELF.fetch("http://localhost/mcp", {
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
			expect([200, 202]).toContain(response.status);
			return response;
		};

		const initializeResponse = await send({
			jsonrpc: "2.0",
			id: 1,
			method: "initialize",
			params: {
				protocolVersion: "2024-11-05",
				capabilities: {},
				clientInfo: { name: "agentcat-contract-test", version: "1.0.0" },
			},
		});
		await parseResponse(initializeResponse.clone());
		const sessionId = initializeResponse.headers.get("Mcp-Session-Id");
		expect(sessionId).toBeTruthy();

		await send({ jsonrpc: "2.0", method: "notifications/initialized" }, sessionId!);
		const listResponse = await send(
			{ jsonrpc: "2.0", id: 2, method: "tools/list" },
			sessionId!,
		);
		const listMessage = await parseResponse(listResponse);
		const tools = listMessage.result.tools as any[];
		expect(tools.some((tool) => tool.name === "get_more_tools")).toBe(true);
		for (const tool of tools.filter((tool) => tool.name !== "get_more_tools")) {
			expect(Object.keys(tool.inputSchema?.properties ?? {})).not.toContain("context");
		}
		const publicKeys = tools.flatMap((tool) => [
			...Object.keys(tool.inputSchema?.properties ?? {}),
			...Object.keys(tool.outputSchema?.properties ?? {}),
		]);
		expect(publicKeys).not.toContain("session_id");
		expect(publicKeys).not.toContain("agent_id");
		expect(publicKeys).not.toContain("mcp_session");

		const callResponse = await send(
			{
				jsonrpc: "2.0",
				id: 3,
				method: "tools/call",
				params: { name: "compareLocations", arguments: {} },
			},
			sessionId!,
		);
		const callMessage = await parseResponse(callResponse);
		expect(callMessage.result.structuredContent).toHaveProperty("guide");
		expect(callMessage.result.content[0].text).not.toMatch(/^\[session_id /);
		expect(propertyKeys(callMessage.result)).not.toEqual(
			expect.arrayContaining(["context", "session_id", "agent_id", "mcp_session"]),
		);

		await vi.waitFor(() => {
			const telemetryUrls = telemetryFetch.mock.calls.map(([input]) =>
				typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
			);
			expect(telemetryUrls.some((url) => url.includes("agentcat.com"))).toBe(true);
		});
	});
});
