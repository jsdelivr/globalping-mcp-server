/**
 * Tests for auth/account.ts
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { getAccountName, introspectToken } from "../../../src/auth/account";

describe("getAccountName", () => {
	it("should name the user of a personal token", () => {
		expect(getAccountName({ active: true, username: "john", organization: null })).toBe("john");
	});

	it("should name the org of an org token and the user it acts through", () => {
		expect(getAccountName({ active: true, username: "john", organization: "john-org" })).toBe(
			"john-org (via john)",
		);
	});

	it("should return undefined for a token without a user", () => {
		expect(getAccountName({ active: true })).toBeUndefined();
	});
});

describe("introspectToken", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("should return the introspection of the token", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(
				new Response(
					JSON.stringify({ active: true, username: "john", organization: "john-org" }),
				),
			);
		vi.stubGlobal("fetch", fetchMock);

		expect(await introspectToken("abc")).toEqual({
			active: true,
			username: "john",
			organization: "john-org",
		});
		expect(fetchMock.mock.calls[0][1].body.get("token")).toBe("abc");
	});

	it("should return null when the request fails", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));

		expect(await introspectToken("abc")).toBeNull();
	});
});
