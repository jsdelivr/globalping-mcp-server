import { SELF } from "cloudflare:test";
import { expect } from "vitest";

interface SSEEvent {
	event: string;
	data: string;
}

const readSSEEvent = async (
	reader: ReadableStreamDefaultReader<Uint8Array>,
	buffer: { value: string },
): Promise<SSEEvent> => {
	const decoder = new TextDecoder();

	while (true) {
		const separatorIndex = buffer.value.indexOf("\n\n");
		if (separatorIndex !== -1) {
			const rawEvent = buffer.value.slice(0, separatorIndex);
			buffer.value = buffer.value.slice(separatorIndex + 2);
			const fields = Object.fromEntries(
				rawEvent.split("\n").map((line) => {
					const separator = line.indexOf(":");
					return [line.slice(0, separator), line.slice(separator + 1).trimStart()];
				}),
			);
			return { event: fields.event ?? "message", data: fields.data ?? "" };
		}

		const { done, value } = await reader.read();
		if (done) {
			throw new Error("Legacy SSE stream ended before the expected event arrived");
		}
		buffer.value += decoder.decode(value, { stream: true }).replaceAll("\r\n", "\n");
	}
};

export const exerciseLegacySSE = async (authorization: string) => {
	const headers = {
		Host: "localhost",
		Authorization: authorization,
	};
	const response = await SELF.fetch("https://localhost/sse", {
		headers: { ...headers, Accept: "text/event-stream" },
	});
	expect(response.status).toBe(200);
	expect(response.headers.get("Content-Type")).toContain("text/event-stream");
	expect(response.body).not.toBeNull();

	const reader = response.body!.getReader();
	const buffer = { value: "" };
	try {
		const endpointEvent = await readSSEEvent(reader, buffer);
		expect(endpointEvent.event).toBe("endpoint");
		const endpoint = new URL(endpointEvent.data, "https://localhost");
		expect(endpoint.pathname).toBe("/sse/message");
		expect(endpoint.searchParams.get("sessionId")).toBeTruthy();

		const postMessage = async (message: unknown) => {
			const postResponse = await SELF.fetch(endpoint, {
				method: "POST",
				headers: {
					...headers,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(message),
			});
			expect(postResponse.status).toBe(202);
		};

		await postMessage({
			jsonrpc: "2.0",
			id: 1,
			method: "initialize",
			params: {
				protocolVersion: "2024-11-05",
				capabilities: {},
				clientInfo: { name: "legacy-sse-test", version: "1.0.0" },
			},
		});
		const initializeEvent = await readSSEEvent(reader, buffer);
		expect(initializeEvent.event).toBe("message");
		expect(JSON.parse(initializeEvent.data)).toMatchObject({
			jsonrpc: "2.0",
			id: 1,
			result: { serverInfo: { name: "Globalping MCP" } },
		});

		await postMessage({ jsonrpc: "2.0", method: "notifications/initialized" });
		await postMessage({ jsonrpc: "2.0", id: 2, method: "tools/list" });
		const toolsEvent = await readSSEEvent(reader, buffer);
		expect(toolsEvent.event).toBe("message");
		const toolsMessage = JSON.parse(toolsEvent.data);
		expect(toolsMessage).toMatchObject({ jsonrpc: "2.0", id: 2 });
		expect(toolsMessage.result.tools.length).toBeGreaterThan(0);
	} finally {
		await reader.cancel();
	}
};
