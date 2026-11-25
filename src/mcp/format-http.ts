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

// For a probe that repeats the value of an earlier printed probe: the number of that earlier probe.
export function findSameProbes(
	results: any,
	probes: number[] | undefined,
	getValue: (result: any) => string | null,
): Map<number, number> {
	const firstProbeByValue = new Map<string, number>();
	const sameProbes = new Map<number, number>();

	results.forEach(({ result }: any, index: number) => {
		const value = getValue(result);

		if (result.status !== "finished" || !value || !isSelected(index, probes)) {
			return;
		}

		const firstProbe = firstProbeByValue.get(value);

		if (firstProbe) {
			sameProbes.set(index + 1, firstProbe);
		} else {
			firstProbeByValue.set(value, index + 1);
		}
	});

	return sameProbes;
}

export function formatHttpResult(
	result: any,
	level: "headers" | "full",
	commonHeaders: string[],
	sameTlsProbe?: number,
	sameBodyProbe?: number,
): string {
	// The HTTP version is only in the first line of the raw output.
	const statusLine = result.rawOutput.split("\n")[0];
	const statusName = result.statusCodeName ? ` ${result.statusCodeName}` : "";
	const headers = splitHeaders(result).filter((line) => !commonHeaders.includes(line));
	let text = formatHttpDetails(result, sameTlsProbe);
	text += `${[statusLine + statusName, ...headers].join("\n")}\n`;

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

export function formatHttpDetails(result: any, sameTlsProbe?: number): string {
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

	if (sameTlsProbe) {
		text += `TLS: same as probe ${sameTlsProbe}\n`;
	} else if (result.tls) {
		text += formatTls(result.tls);
	}

	return text;
}

function formatTls(tls: any): string {
	const valid = tls.authorized ? "valid" : `not valid (${tls.error})`;
	let text = `TLS: ${tls.protocol}, ${tls.cipherName}, ${valid}\nCertificate:\n`;

	for (const [label, value] of [
		["Subject", tls.subject.CN],
		["Alt names", tls.subject.alt],
		["Issuer", [tls.issuer.CN, tls.issuer.O, tls.issuer.C].filter(Boolean).join(", ")],
		["Dates", `${tls.createdAt} to ${tls.expiresAt}`],
		["Key", tls.keyBits && `${tls.keyType} ${tls.keyBits} bits`],
		["Serial number", tls.serialNumber],
		["SHA-256 fingerprint", tls.fingerprint256],
		["Public key", tls.publicKey],
	]) {
		if (value) {
			text += `- ${label}: ${value}\n`;
		}
	}

	return text;
}
