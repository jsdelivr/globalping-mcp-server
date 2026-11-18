/**
 * MCP tool helper functions
 */

/**
 * Parse locations parameter into the correct format
 * @param locations Array of location strings or single string
 * @returns Parsed locations
 */
export function parseLocations(locations?: string[] | string): { magic: string }[] | undefined {
	if (!locations) return undefined;

	if (typeof locations === "string") {
		return [{ magic: locations }];
	}

	return locations.map((loc) => ({ magic: loc }));
}

export function formatMs(value?: number | null): string {
	return value == null ? "N/A" : `${value} ms`;
}
