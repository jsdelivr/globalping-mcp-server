/**
 * HTTP parts of the measurement text
 */
import { formatMs, isSelected } from "./helpers";

// Header lines that all finished probes have. One probe has nothing to share.
export function findCommonHeaders(results: any): string[] {
	const headers: string[][] = results
		.filter(({ result }: any) => result.status === "finished")
		.map(({ result }: any) => splitHeaders(result));

	if (headers.length < 2) {
		return [];
	}

	return headers[0].filter((line) => headers.every((lines) => lines.includes(line)));
}

export function formatCommonHeaders(commonHeaders: string[]): string {
	if (commonHeaders.length === 0) {
		return "";
	}

	return `\nHeaders same for all probes:\n${commonHeaders.join("\n")}\n`;
}

// For a probe that repeats the body of an earlier printed probe: the number of that earlier probe.
export function findSameBodyProbes(results: any, probes?: number[]): Map<number, number> {
	const firstProbeByBody = new Map<string, number>();
	const sameBodyProbes = new Map<number, number>();

	results.forEach(({ result }: any, index: number) => {
		if (result.status !== "finished" || !result.rawBody || !isSelected(index, probes)) {
			return;
		}

		const firstProbe = firstProbeByBody.get(result.rawBody);

		if (firstProbe) {
			sameBodyProbes.set(index + 1, firstProbe);
		} else {
			firstProbeByBody.set(result.rawBody, index + 1);
		}
	});

	return sameBodyProbes;
}

export function formatHttpResult(
	result: any,
	level: "headers" | "full",
	commonHeaders: string[],
	sameBodyProbe?: number,
): string {
	// The HTTP version is only in the first line of the raw output.
	const statusLine = result.rawOutput.split("\n")[0];
	const headers = splitHeaders(result).filter((line) => !commonHeaders.includes(line));
	let text = formatHttpDetails(result);
	text += `${[statusLine, ...headers].join("\n")}\n`;

	if (commonHeaders.length > 0) {
		text += `Plus headers same for all probes (${commonHeaders.length}), listed at the top.\n`;
	}

	if (level === "headers") {
		return text;
	}

	if (sameBodyProbe) {
		text += `Body: same as probe ${sameBodyProbe}\n`;
	} else if (result.rawBody) {
		text += `\n${result.rawBody}\n`;
	}

	if (result.truncated) {
		text += "The response is truncated.\n";
	}

	return text;
}

function splitHeaders(result: any): string[] {
	return result.rawHeaders?.split("\n") ?? [];
}

// The raw output of HTTP has no timings and no TLS details.
export function formatHttpDetails(result: any): string {
	let text = "";

	if (result.resolvedAddress) {
		text += `Resolved IP: ${result.resolvedAddress}\n`;
	}

	if (result.timings) {
		const timings = ["total", "dns", "tcp", "tls", "firstByte", "download"]
			.map((name) => `${name} ${formatMs(result.timings[name])}`)
			.join(", ");
		text += `Timings: ${timings}\n`;
	}

	if (result.tls) {
		const { tls } = result;
		const valid = tls.authorized ? "valid" : `not valid (${tls.error})`;
		const subject = tls.subject.CN ?? tls.subject.alt;
		const issuer = [tls.issuer.O, tls.issuer.CN].filter(Boolean).join(" ");
		text += `TLS: ${tls.protocol}, ${tls.cipherName}, ${valid}\n`;
		text += `Certificate: ${subject}, issued by ${issuer}, ${tls.createdAt} to ${tls.expiresAt}\n`;
	}

	return text;
}
