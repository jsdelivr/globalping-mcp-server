import { describe, expect, it } from "vitest";
import { redactAgentCatEvent } from "../../../src/lib";

describe("redactAgentCatEvent", () => {
	it("redacts credential headers from current and v2 AgentCat request metadata without mutating other event data", () => {
		const originalEvent = {
			duration: 42,
			resourceName: "http",
			parameters: {
				request: {
					params: {
						arguments: {
							target: "example.com",
							headers: { "X-Api-Key": "measurement-api-key-secret" },
						},
					},
				},
				extra: {
					requestInfo: {
						url: "https://mcp.globalping.io/mcp",
						headers: {
							Authorization: "Bearer incoming-authorization-secret",
							"X-Authorization": "Bearer x-authorization-secret",
							"Proxy-Authorization": "Basic incoming-proxy-secret",
							"X-Original-Authorization": "Bearer original-authorization-secret",
							"x-forwarded-authorization": "Bearer forwarded-authorization-secret",
							"X-Auth": "incoming-auth-secret",
							"X-Hub-Signature-256": "signature-secret",
							"X-Access-Token": "incoming-token-secret",
							"X-Secret": "incoming-secret",
							"X-Secret-Key": "incoming-secret-key",
							"X-Password": "incoming-password",
							"X-Credential": "incoming-credential",
							"X-Signature-Ed25519": "ed25519-signature-secret",
							"X-Token-Count": "12",
							"X-Password-Policy": "strong",
							"X-Public-Key": "public-key-value",
							"X-Client-Id": "incoming-client-id",
						},
					},
					http: {
						req: {
							headers: {
								authorization: "Bearer v2-authorization-secret",
								Cookie: "session=incoming-cookie-secret",
								"Set-Cookie": "incoming-set-cookie-secret",
								"User-Agent": "agentcat-redaction-test/1.0",
							},
						},
					},
				},
			},
		};

		const event = redactAgentCatEvent(originalEvent as any) as any;

		expect(event).not.toBe(originalEvent);
		expect(event.duration).toBe(42);
		expect(event.resourceName).toBe("http");
		expect(event.parameters.request.params.arguments).toEqual({
			target: "example.com",
			headers: { "X-Api-Key": "measurement-api-key-secret" },
		});
		expect(event.parameters.extra.requestInfo.headers).toMatchObject({
			Authorization: "[REDACTED]",
			"X-Authorization": "Bearer x-authorization-secret",
			"Proxy-Authorization": "Basic incoming-proxy-secret",
			"X-Original-Authorization": "Bearer original-authorization-secret",
			"x-forwarded-authorization": "Bearer forwarded-authorization-secret",
			"X-Auth": "incoming-auth-secret",
			"X-Hub-Signature-256": "signature-secret",
			"X-Access-Token": "incoming-token-secret",
			"X-Secret": "incoming-secret",
			"X-Secret-Key": "incoming-secret-key",
			"X-Password": "incoming-password",
			"X-Credential": "incoming-credential",
			"X-Signature-Ed25519": "ed25519-signature-secret",
			"X-Token-Count": "12",
			"X-Password-Policy": "strong",
			"X-Public-Key": "public-key-value",
			"X-Client-Id": "incoming-client-id",
		});
		expect(event.parameters.extra.http.req.headers).toEqual({
			authorization: "[REDACTED]",
			Cookie: "session=incoming-cookie-secret",
			"Set-Cookie": "incoming-set-cookie-secret",
			"User-Agent": "agentcat-redaction-test/1.0",
		});
		expect(originalEvent.parameters.extra.requestInfo.headers.Authorization).toBe(
			"Bearer incoming-authorization-secret",
		);
		expect(originalEvent.parameters.extra.requestInfo.headers["X-Token-Count"]).toBe("12");
		expect(originalEvent.parameters.request.params.arguments.target).toBe("example.com");
	});
});
