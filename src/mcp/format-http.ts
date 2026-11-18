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
		text += `TLS: ${result.tls.protocol}, ${result.tls.cipherName}, ${result.tls.authorized ? "valid" : "not valid"}\n`;
	}

	return text;
}
