const MIN_PROBES_OF_LISTED_NETWORK = 5;

const NOTE =
	'Note: To specify locations, use the "magic" field syntax in the locations parameter. For example: ["US", "Europe", "AS13335", "London+UK"]';

const continentNames: Record<string, string> = {
	AF: "Africa",
	AN: "Antarctica",
	AS: "Asia",
	EU: "Europe",
	NA: "North America",
	OC: "Oceania",
	SA: "South America",
};

type Probe = {
	location: { continent: string; country: string; city: string; network: string; asn: number };
	tags: string[];
};

// Returns each value with the number of its copies, the most common value first.
function countValues(values: string[]): [string, number][] {
	const counts = new Map<string, number>();

	for (const value of values) {
		counts.set(value, (counts.get(value) ?? 0) + 1);
	}

	return [...counts].sort((a, b) => b[1] - a[1]);
}

function formatCounts(counts: [string, number][]): string {
	return counts.map(([name, count]) => `${name}: ${count}`).join(", ");
}

function countNetworks(probes: Probe[]): [string, number][] {
	return countValues(probes.map(({ location }) => `${location.network} (AS${location.asn})`));
}

// Tags of users start with "u-". They are not listed.
function listTags(probes: Probe[]): string {
	const tags = probes.flatMap((probe) => probe.tags.filter((tag) => !tag.startsWith("u-")));
	return [...new Set(tags)].sort().join(", ");
}

function formatCountry(probes: Probe[], country: string): string {
	if (probes.length === 0) {
		return `No probes in ${country}.`;
	}

	const names = (counts: [string, number][]) => counts.map(([name]) => name).join(", ");

	return [
		`Globalping probes in ${country}: ${probes.length}`,
		`Cities with the number of probes:\n${formatCounts(countValues(probes.map((probe) => probe.location.city)))}`,
		`Networks:\n${names(countNetworks(probes))}`,
		`Tags:\n${listTags(probes)}`,
		NOTE,
	].join("\n\n");
}

export function formatLocations(probes: Probe[], country?: string): string {
	if (country) {
		return formatCountry(
			probes.filter((probe) => probe.location.country === country),
			country,
		);
	}

	const continents = countValues(probes.map((probe) => probe.location.continent)).map(
		([continent]) => {
			const countries = countValues(
				probes
					.filter((probe) => probe.location.continent === continent)
					.map((probe) => probe.location.country),
			);

			return `${continentNames[continent]}:\n${formatCounts(countries)}`;
		},
	);

	const networks = countNetworks(probes);
	const listedNetworks = networks.filter(([, count]) => count >= MIN_PROBES_OF_LISTED_NETWORK);

	return [
		"Countries with Globalping probes and the number of probes:",
		...continents,
		`Networks with ${MIN_PROBES_OF_LISTED_NETWORK} or more probes (${listedNetworks.length} of ${networks.length}):\n${listedNetworks.map(([name]) => name).join(", ")}`,
		`Tags:\n${listTags(probes)}`,
		`Total Probes: ${probes.length}`,
		'Call this tool with "country" to see all cities, networks and tags of one country.',
		NOTE,
	].join("\n\n");
}
