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

export function formatAccountName(owner: {
	username?: string;
	organization?: string;
}): string | undefined {
	return owner.organization ? `${owner.organization} (via ${owner.username})` : owner.username;
}

// Probe numbers start from 1. Without probes every probe is selected.
export function isSelected(index: number, probes?: number[]): boolean {
	return !probes || probes.includes(index + 1);
}

export function formatMs(value?: number | null): string {
	return value == null ? "N/A" : `${value} ms`;
}
