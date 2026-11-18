/**
 * HTTP parts of the measurement text
 */
import { formatMs } from "./helpers";

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
		const issuer = [tls.issuer.O, tls.issuer.CN].filter(Boolean).join(" ");
		text += `TLS: ${tls.protocol}, ${tls.cipherName}, ${valid}\n`;
		text += `Certificate: ${tls.subject.CN}, issued by ${issuer}, ${tls.createdAt} to ${tls.expiresAt}\n`;
	}

	return text;
}
