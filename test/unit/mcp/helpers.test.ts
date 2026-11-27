/**
 * Tests for mcp/helpers.ts
 */
import { describe, expect, it } from "vitest";
import { formatAccountName, parseLocations } from "../../../src/mcp/helpers";

describe("parseLocations", () => {
	it("should return undefined for undefined input", () => {
		const result = parseLocations(undefined);
		expect(result).toBeUndefined();
	});

	it("should parse single string location", () => {
		const result = parseLocations("US");
		expect(result).toEqual([{ magic: "US" }]);
	});

	it("should parse array of locations", () => {
		const result = parseLocations(["US", "Europe", "Asia"]);
		expect(result).toEqual([{ magic: "US" }, { magic: "Europe" }, { magic: "Asia" }]);
	});

	it("should parse empty array", () => {
		const result = parseLocations([]);
		expect(result).toEqual([]);
	});

	it("should parse single item array", () => {
		const result = parseLocations(["London"]);
		expect(result).toEqual([{ magic: "London" }]);
	});

	it("should parse locations with special characters", () => {
		const result = parseLocations(["London+UK", "AS13335"]);
		expect(result).toEqual([{ magic: "London+UK" }, { magic: "AS13335" }]);
	});

	it("should parse measurement ID as location", () => {
		const result = parseLocations(["01HT4DGF5ZS7B2M93QP5ZTS3DN"]);
		expect(result).toEqual([{ magic: "01HT4DGF5ZS7B2M93QP5ZTS3DN" }]);
	});

	it("should handle empty string", () => {
		const result = parseLocations("");
		expect(result).toEqual(undefined);
	});
});

describe("formatAccountName", () => {
	it("should return the user of a personal token", () => {
		expect(formatAccountName({ username: "testuser" })).toBe("testuser");
	});

	it("should return the organization with its user", () => {
		expect(formatAccountName({ username: "testuser", organization: "testorg" })).toBe(
			"testorg (via testuser)",
		);
	});
});
