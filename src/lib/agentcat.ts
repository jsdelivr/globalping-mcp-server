import type { RedactEventFunction } from "agentcat";

const REDACTED_HEADER_VALUE = "[REDACTED]";

function redactAuthorizationHeader(headers: unknown): unknown {
	if (!headers || typeof headers !== "object" || Array.isArray(headers)) {
		return headers;
	}

	return Object.fromEntries(
		Object.entries(headers).map(([name, value]) => [
			name,
			name.toLowerCase() === "authorization" ? REDACTED_HEADER_VALUE : value,
		]),
	);
}

/**
 * Removes incoming MCP Authorization values from AgentCat telemetry events.
 */
export const redactAgentCatEvent: RedactEventFunction = (event) => {
	let redactedEvent = event;
	const requestInfoHeaders = redactedEvent.parameters?.extra?.requestInfo?.headers;
	if (requestInfoHeaders && typeof requestInfoHeaders === "object") {
		redactedEvent = {
			...redactedEvent,
			parameters: {
				...redactedEvent.parameters,
				extra: {
					...redactedEvent.parameters.extra,
					requestInfo: {
						...redactedEvent.parameters.extra.requestInfo,
						headers: redactAuthorizationHeader(requestInfoHeaders),
					},
				},
			},
		};
	}

	const incomingHeaders = redactedEvent.parameters?.extra?.http?.req?.headers;
	if (incomingHeaders && typeof incomingHeaders === "object") {
		redactedEvent = {
			...redactedEvent,
			parameters: {
				...redactedEvent.parameters,
				extra: {
					...redactedEvent.parameters.extra,
					http: {
						...redactedEvent.parameters.extra.http,
						req: {
							...redactedEvent.parameters.extra.http.req,
							headers: redactAuthorizationHeader(incomingHeaders),
						},
					},
				},
			},
		};
	}

	return redactedEvent;
};
