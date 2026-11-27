/**
 * Formatting of measurement responses as text
 */
import { GLOBALPING_API } from "../config";
import {
	findCommonHeaders,
	findSameProbes,
	formatCommonHeaders,
	formatHttpDetails,
	formatHttpResult,
} from "./format-http";
import { formatPingTotals } from "./format-ping";
import { formatMs, isSelected } from "./helpers";

// Above this length the default output is one line per probe.
const MAX_FULL_OUTPUT_LENGTH = 30_000;

const MAX_DNS_SUMMARY_ANSWERS = 10;

/**
 * Format a measurement response as text
 * @param measurement The measurement response
 * @param output "summary" is one line per probe, "full" is all parsed details of every probe,
 * "headers" is "full" without the response body of HTTP.
 * The default is "full" ("headers" for HTTP) when it is short enough, else "summary".
 * @param probes Numbers of the probes to print, the first probe is 1. The default is all probes.
 * @returns Formatted text
 */
export function formatMeasurement(
	measurement: any,
	output?: "summary" | "headers" | "full",
	probes?: number[],
): string {
	checkProbesExist(measurement, probes);

	try {
		return formatText(measurement, output, probes);
	} catch (error: any) {
		const url = `${GLOBALPING_API.BASE_URL}${GLOBALPING_API.ENDPOINTS.MEASUREMENTS}/${measurement.id}`;
		throw new Error(
			`The results of measurement ${measurement.id} could not be formatted: ${error.message}. You can read the measurement by URL: ${url}`,
		);
	}
}

function formatText(
	measurement: any,
	output?: "summary" | "headers" | "full",
	probes?: number[],
): string {
	const header = formatHeader(measurement);

	if (output === "summary") {
		return header + formatSummary(measurement, probes);
	}

	const level = output ?? (measurement.type === "http" ? "headers" : "full");
	const details = header + formatFull(measurement, level, probes);

	if (output || details.length <= MAX_FULL_OUTPUT_LENGTH) {
		return details;
	}

	return header + formatSummary(measurement, probes);
}

function checkProbesExist(measurement: any, probes?: number[]): void {
	const probesCount = measurement.results.length;
	const missingProbe = probes?.find((number) => number > probesCount);

	if (missingProbe) {
		throw new Error(
			`Probe ${missingProbe} does not exist. This measurement has probe numbers from 1 to ${probesCount}.`,
		);
	}
}

function formatHeader(measurement: any): string {
	let header = `Measurement ID: ${measurement.id}\n`;
	header += `Type: ${measurement.type}\n`;
	header += `Target: ${measurement.target}\n`;
	header += `Status: ${measurement.status}\n`;
	header += `Created: ${measurement.createdAt}\n`;
	header += `Updated: ${measurement.updatedAt}\n`;

	for (const [label, value] of [
		["Locations", measurement.locations],
		["Limit", measurement.limit],
		["Options", measurement.measurementOptions],
	]) {
		if (value != null) {
			header += `${label}: ${typeof value === "object" ? JSON.stringify(value) : value}\n`;
		}
	}

	header += `Probes: ${measurement.probesCount}\n`;

	if (measurement.type === "ping") {
		header += formatPingTotals(measurement.results);
	}

	return header;
}

function formatFull(measurement: any, level: "headers" | "full", probes?: number[]): string {
	if (measurement.type === "http") {
		return formatHttpFull(measurement, level, probes);
	}

	return formatProbesFull(measurement, fullByType[measurement.type] ?? formatRawOutput, probes);
}

const fullByType: Record<string, (result: any) => string> = {
	ping: ({ resolvedAddress, stats, timings }) => {
		let text = `Resolved IP: ${resolvedAddress}\n`;
		text += `Packets: ${stats.total} sent, ${stats.rcv} received, ${stats.drop} lost (${stats.loss}%)\n`;

		if (stats.rcv === 0) {
			return text;
		}

		// A reply of TCP ping has no TTL.
		const replies = timings.map(({ rtt, ttl }: any) =>
			ttl == null ? `${rtt} ms` : `${rtt} ms ttl ${ttl}`,
		);
		text += `RTT: min ${stats.min} ms, avg ${stats.avg} ms, max ${stats.max} ms\n`;
		text += `Replies: ${replies.join(", ")}\n`;
		return text;
	},
	traceroute: (result) => {
		const rows = result.hops.map((hop: any, index: number) =>
			hop.resolvedAddress
				? `${index + 1} | ${formatHost(hop)} | ${formatRtts(hop)}`
				: `${index + 1} | no reply`,
		);
		return `Resolved IP: ${result.resolvedAddress}\nHop | Host | RTT ms\n${rows.join("\n")}\n`;
	},
	mtr: (result) => {
		const rows = result.hops.map((hop: any, index: number) => {
			if (!hop.resolvedAddress) {
				return `${index + 1} | no reply`;
			}

			const { stats } = hop;
			return [
				index + 1,
				hop.asn.join(", "),
				formatHost(hop),
				stats.loss,
				stats.total,
				stats.rcv,
				stats.drop,
				stats.min,
				stats.avg,
				stats.max,
				stats.stDev,
				stats.jMin,
				stats.jAvg,
				stats.jMax,
				formatRtts(hop),
			].join(" | ");
		});
		const columns =
			"Hop | ASN | Host | Loss % | Sent | Received | Dropped | Min ms | Avg ms | Max ms | StDev ms | Jitter min ms | Jitter avg ms | Jitter max ms | RTT ms";
		return `Resolved IP: ${result.resolvedAddress}\n${columns}\n${rows.join("\n")}\n`;
	},
	dns: (result) => {
		if (result.hops) {
			return result.hops
				.map((hop: any, index: number) => {
					const code = hop.statusCodeName ? formatDnsResponseCode(hop) : "";
					return `Hop ${index + 1}\n${code}${formatDnsAnswers(hop)}`;
				})
				.join("");
		}

		return formatDnsResponseCode(result) + formatDnsAnswers(result);
	},
};

function formatDnsResponseCode({ statusCodeName, statusCode }: any): string {
	return `Response code: ${statusCodeName} (${statusCode})\n`;
}

function formatHost({ resolvedAddress, resolvedHostname }: any): string {
	return resolvedHostname && resolvedHostname !== resolvedAddress
		? `${resolvedHostname} (${resolvedAddress})`
		: resolvedAddress;
}

function formatRtts(hop: any): string {
	return hop.timings.map((timing: any) => timing.rtt).join(", ");
}

function formatDnsAnswers({ resolver, timings, answers }: any): string {
	const records = answers
		.map(
			(answer: any) =>
				`${answer.name} ${answer.ttl} ${answer.class} ${answer.type} ${answer.value}\n`,
		)
		.join("");
	return `Resolver: ${resolver}, total ${formatMs(timings.total)}\nAnswers: ${answers.length}\n${records}`;
}

function formatHttpFull(measurement: any, level: "headers" | "full", probes?: number[]): string {
	const { results } = measurement;
	const commonHeaders = findCommonHeaders(results, probes);
	const sameTlsProbes = findSameProbes(results, probes, ({ tls }) => tls && JSON.stringify(tls));
	const sameBodyProbes = findSameProbes(results, probes, ({ rawBody }) => rawBody);
	const formatResult = (result: any, number: number) =>
		formatHttpResult(
			result,
			level,
			commonHeaders,
			sameTlsProbes.get(number),
			sameBodyProbes.get(number),
		);
	const formatFailed = (result: any, number: number) =>
		formatHttpDetails(result, sameTlsProbes.get(number));

	return (
		formatCommonHeaders(commonHeaders) +
		formatProbesFull(measurement, formatResult, probes, formatFailed)
	);
}

// A probe that is still running has only a status.
// A probe that failed has a status and what the tool printed.
function formatProbesFull(
	measurement: any,
	formatResult: (result: any, number: number) => string,
	probes?: number[],
	formatFailed?: (result: any, number: number) => string,
): string {
	return measurement.results
		.map(({ probe, result }: any, index: number) => {
			const tags = probe.tags.length > 0 ? `, tags: ${probe.tags.join(", ")}` : "";
			const title = `\nProbe ${index + 1}: ${formatProbeLocation(probe)}${tags}\n`;

			if (result.status === "finished") {
				return title + formatResult(result, index + 1);
			}

			const status = `${title}Status: ${formatProbeStatus(result)}\n`;

			if (result.status === "in-progress") {
				return status;
			}

			const details = formatFailed?.(result, index + 1) ?? "";
			return status + details + formatRawOutput(result);
		})
		.filter((_text: string, index: number) => isSelected(index, probes))
		.join("");
}

function formatRawOutput(result: any): string {
	return result.rawOutput ? `${result.rawOutput}\n` : "";
}

function formatSummary(measurement: any, probes?: number[]): string {
	const lines = measurement.results
		.map(
			({ probe, result }: any, index: number) =>
				`${index + 1}: ${formatProbeLocation(probe)} | ${formatProbeSummary(measurement, result)}\n`,
		)
		.filter((_line: string, index: number) => isSelected(index, probes));

	const levels = measurement.type === "http" ? '"headers" or "full"' : '"full"';

	return `\nResults, one line per probe:\n${lines.join("")}\nFor details call getMeasurement with "probes" and output ${levels}.\n`;
}

function formatProbeSummary(measurement: any, result: any): string {
	if (result.status === "in-progress") {
		return result.status;
	}

	if (result.status !== "finished") {
		const status = formatProbeStatus(result);
		const output = result.rawOutput?.trim() ?? "";
		const isOneLine = output !== "" && !output.includes("\n");
		return isOneLine ? `${status}: ${output}` : status;
	}

	return summaryByType[measurement.type]?.(result, measurement) ?? result.status;
}

const summaryByType: Record<string, (result: any, measurement: any) => string> = {
	ping: ({ resolvedAddress, stats }) => {
		const rtt =
			stats.rcv === 0 ? "" : `, rtt min/avg/max ${stats.min}/${stats.avg}/${stats.max} ms`;
		return `IP ${resolvedAddress}, ${stats.drop}/${stats.total} lost (${stats.loss}%)${rtt}`;
	},
	traceroute: (result) => {
		const index = result.hops.findLastIndex((hop: any) => hop.resolvedAddress);

		if (index === -1) {
			return `${result.hops.length} hops, no replies`;
		}

		const hop = result.hops[index];
		const target = isTargetReached(result)
			? `target ${result.resolvedAddress} reached`
			: `no reply from target, last reply from ${hop.resolvedAddress} on hop ${index + 1}`;
		const rtt = hop.timings.length === 0 ? "" : `, rtt ${hop.timings[0].rtt} ms`;
		return `${result.hops.length} hops, ${target}${rtt}`;
	},
	mtr: (result) => {
		const index = result.hops.findLastIndex((hop: any) => hop.resolvedAddress);

		if (index === -1) {
			return `${result.hops.length} hops, no replies`;
		}

		const hop = result.hops[index];
		const target = isTargetReached(result)
			? `target ${result.resolvedAddress} reached`
			: `no reply from target, last reply from ${hop.resolvedAddress} on hop ${index + 1}`;
		return `${result.hops.length} hops, ${target}, loss ${hop.stats.loss}%, rtt ${hop.stats.avg} ms`;
	},
	dns: (result, measurement) => {
		// A trace has the final answers in its last hop.
		const hops = result.hops ?? [result];
		const last = hops.at(-1) ?? { answers: [] };
		const total = hops.reduce((sum: number, hop: any) => sum + hop.timings.total, 0);
		const queryType = measurement.measurementOptions?.query?.type ?? "A";
		// Only the records of a trace hop that answer the query.
		const answers = result.hops
			? last.answers.filter(
					({ type }: any) => queryType === "ANY" || [queryType, "CNAME"].includes(type),
				)
			: last.answers;
		const shown = answers.slice(0, MAX_DNS_SUMMARY_ANSWERS);
		const answersByType = Object.groupBy(shown, (answer: any) => answer.type);
		const records = Object.entries(answersByType)
			.map(
				([type, group]: any) =>
					`${type} ${group.map((answer: any) => answer.value).join(", ")}`,
			)
			.join("; ");
		const more =
			answers.length > shown.length ? ` and ${answers.length - shown.length} more` : "";

		return [
			last.statusCodeName,
			records ? records + more : "no answers",
			last.resolver && last.resolver !== "private" && `resolver ${last.resolver}`,
			`total ${formatMs(total)}`,
		]
			.filter(Boolean)
			.join(", ");
	},
	http: (result) => {
		const statusName = result.statusCodeName ? ` ${result.statusCodeName}` : "";
		const certificate =
			result.tls?.authorized === false ? `, certificate not valid (${result.tls.error})` : "";
		return `${result.statusCode}${statusName}, IP ${result.resolvedAddress}, total ${formatMs(result.timings.total)}, first byte ${formatMs(result.timings.firstByte)}${certificate}`;
	},
};

// A route can end at a router that replies when the target does not.
// The last line of the raw output has the address of the target only when the target replied.
function isTargetReached(result: any): boolean {
	const lastLine = result.rawOutput.trimEnd().split("\n").at(-1);
	return lastLine.includes(`(${result.resolvedAddress})`);
}

function formatProbeStatus(result: any): string {
	return result.failureSource ? `${result.status} (${result.failureSource})` : result.status;
}

function formatProbeLocation(probe: any): string {
	let location = probe.city;

	if (probe.state) {
		location += ` (${probe.state})`;
	}

	for (const part of [probe.country, probe.continent, probe.network]) {
		if (part) {
			location += `, ${part}`;
		}
	}

	if (probe.asn !== undefined && probe.asn !== null) {
		location += ` (AS${probe.asn})`;
	}

	return location;
}
