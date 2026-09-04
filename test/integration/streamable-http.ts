import { SELF } from "cloudflare:test";
import { expect } from "vitest";

const parseResponse = async (response: Response) => {
	const text = await response.text();
	const dataLine = text.split("\n").find((line) => line.startsWith("data: "));
	return JSON.parse(dataLine ? dataLine.slice(6) : text);
};

export const exerciseStreamableHTTP = async (path: "/mcp" | "/streamable-http", token: string) => {
	const send = (message: unknown, sessionId?: string) =>
		SELF.fetch(`https://localhost${path}`, {
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
			clientInfo: { name: "streamable-http-test", version: "1.0.0" },
		},
	});
	expect(initializeResponse.status).toBe(200);
	const initializeMessage = await parseResponse(initializeResponse.clone());
	expect(initializeMessage).toMatchObject({
		jsonrpc: "2.0",
		id: 1,
		result: { serverInfo: { name: "Globalping MCP" } },
	});
	const sessionId = initializeResponse.headers.get("Mcp-Session-Id");
	expect(sessionId).toBeTruthy();

	const initializedResponse = await send(
		{ jsonrpc: "2.0", method: "notifications/initialized" },
		sessionId!,
	);
	expect(initializedResponse.status).toBe(202);

	const toolsResponse = await send(
		{ jsonrpc: "2.0", id: 2, method: "tools/list" },
		sessionId!,
	);
	expect(toolsResponse.status).toBe(200);
	const toolsMessage = await parseResponse(toolsResponse);
	expect(toolsMessage).toMatchObject({ jsonrpc: "2.0", id: 2 });
	expect(toolsMessage.result.tools.length).toBeGreaterThan(0);
};
