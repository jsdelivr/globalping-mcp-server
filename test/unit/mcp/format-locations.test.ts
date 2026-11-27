import { describe, expect, it } from "vitest";
import { formatLocations } from "../../../src/mcp/format-locations";

const probe = (
	continent: string,
	country: string,
	city: string,
	network: string,
	asn: number,
	tags: string[] = [],
) => ({ location: { continent, country, city, network, asn }, tags });

const probes = [
	...Array.from({ length: 5 }, () =>
		probe("EU", "DE", "Falkenstein", "Hetzner Online", 24940, ["datacenter-network"]),
	),
	probe("EU", "DE", "Berlin", "Deutsche Telekom", 3320, ["eyeball-network", "u-user-home"]),
	probe("EU", "DE", "Berlin", "Deutsche Telekom", 3320, ["eyeball-network"]),
	probe("EU", "FR", "Paris", "OVH", 16276, ["datacenter-network"]),
	probe("NA", "US", "Ashburn", "Amazon.com", 14618, ["aws", "aws-us-east-1"]),
];

describe("formatLocations", () => {
	it("should list countries, big networks and tags", () => {
		expect(formatLocations(probes)).toMatchInlineSnapshot(`
			"Countries with Globalping probes and the number of probes:

			Europe:
			DE: 7, FR: 1

			North America:
			US: 1

			Networks with 5 or more probes (1 of 4):
			Hetzner Online (AS24940)

			Tags:
			aws, aws-us-east-1, datacenter-network, eyeball-network

			Total Probes: 9

			Call this tool with "country" to see all cities, networks and tags of one country.

			Note: To specify locations, use the "magic" field syntax in the locations parameter. For example: ["US", "Europe", "AS13335", "London+UK"]"
		`);
	});

	it("should list all cities, networks and tags of a country", () => {
		expect(formatLocations(probes, "DE")).toMatchInlineSnapshot(`
			"Globalping probes in DE: 7

			Cities with the number of probes:
			Falkenstein: 5, Berlin: 2

			Networks:
			Hetzner Online (AS24940), Deutsche Telekom (AS3320)

			Tags:
			datacenter-network, eyeball-network

			Note: To specify locations, use the "magic" field syntax in the locations parameter. For example: ["US", "Europe", "AS13335", "London+UK"]"
		`);
	});

	it("should say when a country has no probes", () => {
		expect(formatLocations(probes, "JP")).toBe("No probes in JP.");
	});
});
