/**
 * Tests for mcp/format.ts
 */
import { describe, expect, it } from "vitest";
import { formatMeasurement } from "../../../src/mcp/format";
import dns from "./fixtures/dns.json";
import dnsNxdomain from "./fixtures/dns-nxdomain.json";
import dnsTrace from "./fixtures/dns-trace.json";
import http from "./fixtures/http.json";
import httpIp from "./fixtures/http-ip.json";
import mtr from "./fixtures/mtr.json";
import ping from "./fixtures/ping.json";
import pingFailed from "./fixtures/ping-failed.json";
import traceroute from "./fixtures/traceroute.json";

// Print strings in snapshots as they are, without quotes and escapes.
expect.addSnapshotSerializer({
	test: (value) => typeof value === "string",
	serialize: (value) => value,
});

// The fixtures are real Globalping API responses for google.com.
describe("formatMeasurement", () => {
	it("should print ping with totals over all probes", () => {
		expect(formatMeasurement(ping)).toMatchInlineSnapshot(`
			Measurement ID: 2FL0lrUmQXiWPHMDY00321Wl5
			Type: ping
			Target: google.com
			Status: finished
			Created: 2026-11-18T15:27:47.227Z
			Updated: 2026-11-18T15:27:48.297Z
			Locations: [{"magic":"world"}]
			Limit: 2
			Probes: 2

			- Successful Probes: 2/2
			- Total Packets: 6
			- Received: 6
			- Dropped: 0
			- Average Loss: 0.00%
			- Min RTT: 3.20 ms
			- Avg RTT: 4.33 ms
			- Max RTT: 5.45 ms

			Probe 1: Falkenstein, DE, EU, Hetzner Online (AS24940)
			PING google.com (142.250.154.113) 56(84) bytes of data.
			64 bytes from google.com (142.250.154.113): icmp_seq=1 ttl=111 time=5.29 ms
			64 bytes from google.com (142.250.154.113): icmp_seq=2 ttl=111 time=5.14 ms
			64 bytes from google.com (142.250.154.113): icmp_seq=3 ttl=111 time=5.45 ms

			--- google.com ping statistics ---
			3 packets transmitted, 3 received, 0% packet loss, time 1002ms
			rtt min/avg/max/mdev = 5.142/5.294/5.450/0.125 ms

			Probe 2: Helsinki, FI, EU, Hetzner Online (AS24940)
			PING google.com (173.194.221.102) 56(84) bytes of data.
			64 bytes from google.com (173.194.221.102): icmp_seq=1 ttl=106 time=3.53 ms
			64 bytes from google.com (173.194.221.102): icmp_seq=2 ttl=106 time=3.39 ms
			64 bytes from google.com (173.194.221.102): icmp_seq=3 ttl=106 time=3.20 ms

			--- google.com ping statistics ---
			3 packets transmitted, 3 received, 0% packet loss, time 1002ms
			rtt min/avg/max/mdev = 3.199/3.375/3.534/0.137 ms
		`);
	});

	it("should print traceroute", () => {
		expect(formatMeasurement(traceroute)).toMatchInlineSnapshot(`
			Measurement ID: 2GaIM08nHIBGjG08y00321Wl5
			Type: traceroute
			Target: google.com
			Status: finished
			Created: 2026-11-18T15:27:47.399Z
			Updated: 2026-11-18T15:27:51.987Z
			Locations: [{"magic":"world"}]
			Limit: 2
			Probes: 2

			Probe 1: Helsinki, FI, EU, Hetzner Online (AS24940)
			traceroute to google.com (64.233.163.113), 20 hops max, 60 byte packets
			 1  _gateway (172.23.1.1)  0.030 ms  0.010 ms
			 2  ex9k1.dc5.hel1.hetzner.com (213.133.119.10)  0.376 ms  0.401 ms
			 3  core32.hel1.hetzner.com (213.133.126.32)  0.402 ms  0.393 ms
			 4  juniper4.dc1.hel1.hetzner.com (213.239.224.25)  0.534 ms  0.525 ms
			 5  google.com (64.233.163.113)  2.983 ms  3.137 ms

			Probe 2: Falkenstein, DE, EU, Hetzner Online (AS24940)
			traceroute to google.com (142.251.14.102), 20 hops max, 60 byte packets
			 1  _gateway (172.31.1.1)  4.829 ms  5.137 ms
			 2  33838.your-cloud.host (49.12.31.3)  2.470 ms  2.837 ms
			 3  * *
			 4  * *
			 5  core-spine-rdev1.cloud2.fsn1.hetzner.com (213.239.227.193)  3.246 ms  3.242 ms
			 6  core21.fsn1.hetzner.com (213.239.227.194)  3.472 ms  3.469 ms
			 7  core4.fra.hetzner.com (213.239.224.106)  8.174 ms  8.171 ms
			 8  72.14.218.94 (72.14.218.94)  8.238 ms  8.234 ms
			 9  * *
			10  216.239.56.24 (216.239.56.24)  8.707 ms  8.703 ms
			11  * *
			12  * *
			13  * *
			14  * *
			15  * *
			16  * *
			17  google.com (142.251.14.102)  5.415 ms  5.435 ms
		`);
	});

	it("should print mtr", () => {
		expect(formatMeasurement(mtr)).toMatchInlineSnapshot(`
			Measurement ID: 2IVwW2U5Q1aQTR0Pr00321Wl5
			Type: mtr
			Target: google.com
			Status: finished
			Created: 2026-11-18T15:27:47.542Z
			Updated: 2026-11-18T15:27:53.864Z
			Locations: [{"magic":"world"}]
			Limit: 2
			Probes: 2

			Probe 1: Falkenstein, DE, EU, Hetzner Online (AS24940)
			Host                                                                   Loss% Drop Rcv Avg  StDev  Javg
			 1. AS24940 _gateway (213.133.117.207)                                  0.0%    0   3 0.3    0.0   0.2
			 2. AS24940 core23.fsn1.hetzner.com (213.133.126.23)                    0.0%    0   3 2.8    3.4   3.9
			 3. AS24940 core5.fra.hetzner.com (213.239.224.78)                      0.0%    0   3 5.4    0.3   2.6
			 4. AS24940 213-239-239-118.clients.your-server.de (213.239.239.118)    0.0%    0   3 5.0    0.1   2.5
			 5. AS???   (waiting for reply)
			 6. AS15169 192.178.252.254 (192.178.252.254)                           0.0%    0   3 6.1    0.2   3.0
			 7. AS???   (waiting for reply)
			 8. AS???   (waiting for reply)
			 9. AS???   (waiting for reply)
			10. AS???   (waiting for reply)
			11. AS???   (waiting for reply)
			12. AS???   (waiting for reply)
			13. AS15169 google.com (142.250.154.101)                                0.0%    0   3 5.3    0.0   2.6

			Probe 2: Helsinki, FI, EU, Hetzner Online (AS24940)
			Host                                                                  Loss% Drop Rcv Avg  StDev  Javg
			1. AS???   _gateway (172.31.1.1)                                       0.0%    0   3 1.7    0.2   1.1
			2. AS24940 20992.your-cloud.host (65.108.115.149)                      0.0%    0   3 0.3    0.1   0.3
			3. AS???   (waiting for reply)
			4. AS???   (waiting for reply)
			5. AS24940 core-spine-rdev1.cloud1.hel1.hetzner.com (213.239.228.2)    0.0%    0   3 0.7    0.2   0.5
			6. AS24940 core32.hel1.hetzner.com (213.239.228.5)                     0.0%    0   3 0.5    0.1   0.3
			7. AS24940 juniper4.dc1.hel1.hetzner.com (213.239.224.25)              0.0%    0   3 0.7    0.1   0.3
			8. AS15169 142.251.195.234 (142.251.195.234)                           0.0%    0   3 1.9    1.3   1.8
			9. AS15169 google.com (64.233.161.139)                                 0.0%    0   3 3.3    0.1   1.6
		`);
	});

	it("should print dns", () => {
		expect(formatMeasurement(dns)).toMatchInlineSnapshot(`
			Measurement ID: 2FkC3ditnkURhoIKB00321Wl5
			Type: dns
			Target: google.com
			Status: finished
			Created: 2026-11-18T15:27:47.693Z
			Updated: 2026-11-18T15:27:48.049Z
			Locations: [{"magic":"world"}]
			Limit: 2
			Probes: 2

			Probe 1: Helsinki, FI, EU, Hetzner Online (AS24940)
			; <<>> DiG 9.16.50-Debian <<>> -t A google.com -p 53 -4 +timeout=5 +tries=2 +nofail +nocookie +nosplit +nsid
			;; global options: +cmd
			;; Got answer:
			;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 34316
			;; flags: qr rd ra; QUERY: 1, ANSWER: 6, AUTHORITY: 0, ADDITIONAL: 1

			;; OPT PSEUDOSECTION:
			; EDNS: version: 0, flags:; udp: 65494
			;; QUESTION SECTION:
			;google.com.			IN	A

			;; ANSWER SECTION:
			google.com.		225	IN	A	74.125.205.101
			google.com.		225	IN	A	74.125.205.139
			google.com.		225	IN	A	74.125.205.102
			google.com.		225	IN	A	74.125.205.138
			google.com.		225	IN	A	74.125.205.113
			google.com.		225	IN	A	74.125.205.100

			;; Query time: 0 msec
			;; SERVER: x.x.x.x#53(x.x.x.x)
			;; WHEN: Wed Nov 18 15:27:48 UTC 2026
			;; MSG SIZE  rcvd: 135

			Probe 2: Falkenstein, DE, EU, Hetzner Online (AS24940)
			; <<>> DiG 9.16.44-Debian <<>> -t A google.com -p 53 -4 +timeout=5 +tries=2 +nofail +nocookie +nosplit +nsid
			;; global options: +cmd
			;; Got answer:
			;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 26582
			;; flags: qr rd ra; QUERY: 1, ANSWER: 6, AUTHORITY: 0, ADDITIONAL: 1

			;; OPT PSEUDOSECTION:
			; EDNS: version: 0, flags:; udp: 65494
			;; QUESTION SECTION:
			;google.com.			IN	A

			;; ANSWER SECTION:
			google.com.		236	IN	A	142.251.127.113
			google.com.		236	IN	A	142.251.127.138
			google.com.		236	IN	A	142.251.127.101
			google.com.		236	IN	A	142.251.127.102
			google.com.		236	IN	A	142.251.127.139
			google.com.		236	IN	A	142.251.127.100

			;; Query time: 0 msec
			;; SERVER: x.x.x.x#53(x.x.x.x)
			;; WHEN: Wed Nov 18 15:27:47 UTC 2026
			;; MSG SIZE  rcvd: 135
		`);
	});

	it("should print http with resolved IP, timings and TLS", () => {
		expect(formatMeasurement(http)).toMatchInlineSnapshot(`
			Measurement ID: 2P4xQQKCD6c75fZM200321Wl5
			Type: http
			Target: google.com
			Status: finished
			Created: 2026-11-18T15:27:48.383Z
			Updated: 2026-11-18T15:27:48.676Z
			Locations: [{"magic":"world"}]
			Limit: 2
			Probes: 2

			Probe 1: Helsinki, FI, EU, Hetzner Online (AS24940)
			Resolved IP: 172.217.22.110
			Timings: total 208 ms, dns 51 ms, tcp 45 ms, tls 56 ms, firstByte 56 ms, download 0 ms
			TLS: TLSv1.3, TLS_AES_256_GCM_SHA384, valid
			Certificate: *.google.com, issued by Google Trust Services WE2, 2026-11-03T08:26:50.000Z to 2027-01-26T08:26:49.000Z
			HTTP/1.1 301
			Location: https://www.google.com/
			Content-Type: text/html; charset=UTF-8
			Content-Security-Policy-Report-Only: object-src 'none';base-uri 'self';script-src 'nonce-1sBldBVSbHwcKpQ78_a9Fw' 'strict-dynamic' 'report-sample' 'unsafe-eval' 'unsafe-inline' https: http:;report-uri https://csp.withgoogle.com/csp/gws/other-hp
			Date: Wed, 18 Nov 2026 15:27:48 GMT
			Expires: Fri, 18 Dec 2026 15:27:48 GMT
			Cache-Control: public, max-age=2592000
			Server: gws
			Content-Length: 220
			X-XSS-Protection: 0
			X-Frame-Options: SAMEORIGIN
			Alt-Svc: h3=":443"; ma=2592000,h3-29=":443"; ma=2592000
			Connection: close

			Probe 2: Falkenstein, DE, EU, Hetzner Online (AS24940)
			Resolved IP: 142.251.110.101
			Timings: total 63 ms, dns 2 ms, tcp 6 ms, tls 21 ms, firstByte 34 ms, download 0 ms
			TLS: TLSv1.3, TLS_AES_256_GCM_SHA384, valid
			Certificate: *.google.com, issued by Google Trust Services WE2, 2026-11-03T08:26:50.000Z to 2027-01-26T08:26:49.000Z
			HTTP/1.1 301
			Location: https://www.google.com/
			Content-Type: text/html; charset=UTF-8
			Content-Security-Policy-Report-Only: object-src 'none';base-uri 'self';script-src 'nonce-4qzX9y7LbdqRUfstppMOBQ' 'strict-dynamic' 'report-sample' 'unsafe-eval' 'unsafe-inline' https: http:;report-uri https://csp.withgoogle.com/csp/gws/other-hp
			Date: Wed, 18 Nov 2026 15:27:48 GMT
			Expires: Fri, 18 Dec 2026 15:27:48 GMT
			Cache-Control: public, max-age=2592000
			Server: gws
			Content-Length: 220
			X-XSS-Protection: 0
			X-Frame-Options: SAMEORIGIN
			Alt-Svc: h3=":443"; ma=2592000,h3-29=":443"; ma=2592000
			Connection: close
		`);
	});

	it("should print a certificate that is not valid and a timing that is missing", () => {
		expect(formatMeasurement(httpIp)).toMatchInlineSnapshot(`
			Measurement ID: 2SSPVk28xkwXHDUC300321Wlu
			Type: http
			Target: 1.1.1.1
			Status: finished
			Created: 2026-11-18T16:18:37.347Z
			Updated: 2026-11-18T16:18:37.401Z
			Locations: [{"magic":"world"}]
			Probes: 1

			Probe 1: Falkenstein, DE, EU, Hetzner Online (AS24940)
			Resolved IP: 1.1.1.1
			Timings: total 36 ms, dns N/A, tcp 7 ms, tls 12 ms, firstByte 17 ms, download 0 ms
			TLS: TLSv1.3, TLS_AES_256_GCM_SHA384, not valid (ERR_TLS_CERT_ALTNAME_INVALID)
			Certificate: cloudflare-dns.com, issued by SSL Corp SSL.com SSL Intermediate CA ECC R2, 2025-12-31T19:20:01.000Z to 2026-12-21T19:20:01.000Z
			HTTP/1.1 301
			Date: Wed, 18 Nov 2026 16:18:37 GMT
			Connection: close
			Location: https://one.one.one.one/
			Server: cloudflare
			CF-RAY: a5c84ac7a958dbe4-FRA
		`);
	});

	it("should say that the response body is truncated", () => {
		const truncated = {
			...http,
			probesCount: 1,
			results: [
				{ ...http.results[0], result: { ...http.results[0].result, truncated: true } },
			],
		};

		expect(formatMeasurement(truncated)).toMatchInlineSnapshot(`
			Measurement ID: 2P4xQQKCD6c75fZM200321Wl5
			Type: http
			Target: google.com
			Status: finished
			Created: 2026-11-18T15:27:48.383Z
			Updated: 2026-11-18T15:27:48.676Z
			Locations: [{"magic":"world"}]
			Limit: 2
			Probes: 1

			Probe 1: Helsinki, FI, EU, Hetzner Online (AS24940)
			Resolved IP: 172.217.22.110
			Timings: total 208 ms, dns 51 ms, tcp 45 ms, tls 56 ms, firstByte 56 ms, download 0 ms
			TLS: TLSv1.3, TLS_AES_256_GCM_SHA384, valid
			Certificate: *.google.com, issued by Google Trust Services WE2, 2026-11-03T08:26:50.000Z to 2027-01-26T08:26:49.000Z
			HTTP/1.1 301
			Location: https://www.google.com/
			Content-Type: text/html; charset=UTF-8
			Content-Security-Policy-Report-Only: object-src 'none';base-uri 'self';script-src 'nonce-1sBldBVSbHwcKpQ78_a9Fw' 'strict-dynamic' 'report-sample' 'unsafe-eval' 'unsafe-inline' https: http:;report-uri https://csp.withgoogle.com/csp/gws/other-hp
			Date: Wed, 18 Nov 2026 15:27:48 GMT
			Expires: Fri, 18 Dec 2026 15:27:48 GMT
			Cache-Control: public, max-age=2592000
			Server: gws
			Content-Length: 220
			X-XSS-Protection: 0
			X-Frame-Options: SAMEORIGIN
			Alt-Svc: h3=":443"; ma=2592000,h3-29=":443"; ma=2592000
			Connection: close
			The response body is truncated.
		`);
	});

	it("should print the status of probes that did not finish", () => {
		expect(formatMeasurement(pingFailed)).toMatchInlineSnapshot(`
			Measurement ID: 2Ip3lgjB734k2LqT200321Wl5
			Type: ping
			Target: nonexistent.google.com
			Status: finished
			Created: 2026-11-18T15:27:48.584Z
			Updated: 2026-11-18T15:27:48.667Z
			Locations: [{"magic":"world"}]
			Limit: 2
			Probes: 2

			- Successful Probes: 0/2
			- Total Packets: 0
			- Received: 0
			- Dropped: 0
			- Average Loss: 0.00%

			Probe 1: Helsinki, FI, EU, Hetzner Online (AS24940)
			Status: failed (target)
			queryA ENOTFOUND nonexistent.google.com

			Probe 2: Falkenstein, DE, EU, Hetzner Online (AS24940)
			Status: failed (target)
			queryA ENOTFOUND nonexistent.google.com
		`);
	});

	it("should handle a probe without raw output", () => {
		const offline = {
			...ping,
			probesCount: 1,
			results: [{ ...ping.results[0], result: { status: "offline" } }],
		};

		expect(formatMeasurement(offline)).toMatchInlineSnapshot(`
			Measurement ID: 2FL0lrUmQXiWPHMDY00321Wl5
			Type: ping
			Target: google.com
			Status: finished
			Created: 2026-11-18T15:27:47.227Z
			Updated: 2026-11-18T15:27:48.297Z
			Locations: [{"magic":"world"}]
			Limit: 2
			Probes: 1

			- Successful Probes: 0/1
			- Total Packets: 0
			- Received: 0
			- Dropped: 0
			- Average Loss: 0.00%

			Probe 1: Falkenstein, DE, EU, Hetzner Online (AS24940)
			Status: offline
		`);
	});

	describe("summary output", () => {
		it("should summarize ping", () => {
			expect(formatMeasurement(ping, "summary")).toMatchInlineSnapshot(`
				Measurement ID: 2FL0lrUmQXiWPHMDY00321Wl5
				Type: ping
				Target: google.com
				Status: finished
				Created: 2026-11-18T15:27:47.227Z
				Updated: 2026-11-18T15:27:48.297Z
				Locations: [{"magic":"world"}]
				Limit: 2
				Probes: 2

				- Successful Probes: 2/2
				- Total Packets: 6
				- Received: 6
				- Dropped: 0
				- Average Loss: 0.00%
				- Min RTT: 3.20 ms
				- Avg RTT: 4.33 ms
				- Max RTT: 5.45 ms

				1: Falkenstein, DE, EU, Hetzner Online (AS24940) | loss 0%, avg 5.294 ms
				2: Helsinki, FI, EU, Hetzner Online (AS24940) | loss 0%, avg 3.375 ms

				One line per probe. Use output "full" for the raw output of every probe.
			`);
		});

		it("should summarize traceroute", () => {
			expect(formatMeasurement(traceroute, "summary")).toMatchInlineSnapshot(`
				Measurement ID: 2GaIM08nHIBGjG08y00321Wl5
				Type: traceroute
				Target: google.com
				Status: finished
				Created: 2026-11-18T15:27:47.399Z
				Updated: 2026-11-18T15:27:51.987Z
				Locations: [{"magic":"world"}]
				Limit: 2
				Probes: 2

				1: Helsinki, FI, EU, Hetzner Online (AS24940) | 5 hops, rtt 2.983 ms
				2: Falkenstein, DE, EU, Hetzner Online (AS24940) | 17 hops, rtt 5.415 ms

				One line per probe. Use output "full" for the raw output of every probe.
			`);
		});

		it("should summarize mtr", () => {
			expect(formatMeasurement(mtr, "summary")).toMatchInlineSnapshot(`
				Measurement ID: 2IVwW2U5Q1aQTR0Pr00321Wl5
				Type: mtr
				Target: google.com
				Status: finished
				Created: 2026-11-18T15:27:47.542Z
				Updated: 2026-11-18T15:27:53.864Z
				Locations: [{"magic":"world"}]
				Limit: 2
				Probes: 2

				1: Falkenstein, DE, EU, Hetzner Online (AS24940) | 13 hops, loss 0%, avg 5.3 ms
				2: Helsinki, FI, EU, Hetzner Online (AS24940) | 9 hops, loss 0%, avg 3.3 ms

				One line per probe. Use output "full" for the raw output of every probe.
			`);
		});

		it("should summarize dns answers", () => {
			expect(formatMeasurement(dns, "summary")).toMatchInlineSnapshot(`
				Measurement ID: 2FkC3ditnkURhoIKB00321Wl5
				Type: dns
				Target: google.com
				Status: finished
				Created: 2026-11-18T15:27:47.693Z
				Updated: 2026-11-18T15:27:48.049Z
				Locations: [{"magic":"world"}]
				Limit: 2
				Probes: 2

				1: Helsinki, FI, EU, Hetzner Online (AS24940) | 74.125.205.101, 74.125.205.139, 74.125.205.102, 74.125.205.138, 74.125.205.113, 74.125.205.100, total 0 ms
				2: Falkenstein, DE, EU, Hetzner Online (AS24940) | 142.251.127.113, 142.251.127.138, 142.251.127.101, 142.251.127.102, 142.251.127.139, 142.251.127.100, total 0 ms

				One line per probe. Use output "full" for the raw output of every probe.
			`);
		});

		it("should summarize dns without answers by its status code name", () => {
			expect(formatMeasurement(dnsNxdomain, "summary")).toMatchInlineSnapshot(`
				Measurement ID: 2iz5JAV8tHTMdV2jT00321Wl5
				Type: dns
				Target: nonexistent.google.com
				Status: finished
				Created: 2026-11-18T15:27:48.164Z
				Updated: 2026-11-18T15:27:48.278Z
				Locations: [{"magic":"world"}]
				Limit: 2
				Probes: 2

				1: Falkenstein, DE, EU, Hetzner Online (AS24940) | NXDOMAIN, total 15 ms
				2: Helsinki, FI, EU, Hetzner Online (AS24940) | NXDOMAIN, total 32 ms

				One line per probe. Use output "full" for the raw output of every probe.
			`);
		});

		it("should summarize a dns trace by its last hop", () => {
			expect(formatMeasurement(dnsTrace, "summary")).toMatchInlineSnapshot(`
				Measurement ID: 2fIuRvqrxqKwKmGFM00321Wl5
				Type: dns
				Target: google.com
				Status: finished
				Created: 2026-11-18T15:27:47.951Z
				Updated: 2026-11-18T15:27:48.197Z
				Locations: [{"magic":"world"}]
				Limit: 2
				Options: {"trace":true}
				Probes: 2

				1: Helsinki, FI, EU, Hetzner Online (AS24940) | 64.233.164.138, 64.233.164.113, 64.233.164.139, 64.233.164.101, 64.233.164.102, 64.233.164.100, total 15 ms
				2: Falkenstein, DE, EU, Hetzner Online (AS24940) | 142.250.154.138, 142.250.154.139, 142.250.154.101, 142.250.154.102, 142.250.154.100, 142.250.154.113, total 26 ms

				One line per probe. Use output "full" for the raw output of every probe.
			`);
		});

		it("should summarize http", () => {
			expect(formatMeasurement(http, "summary")).toMatchInlineSnapshot(`
				Measurement ID: 2P4xQQKCD6c75fZM200321Wl5
				Type: http
				Target: google.com
				Status: finished
				Created: 2026-11-18T15:27:48.383Z
				Updated: 2026-11-18T15:27:48.676Z
				Locations: [{"magic":"world"}]
				Limit: 2
				Probes: 2

				1: Helsinki, FI, EU, Hetzner Online (AS24940) | 301 Moved Permanently, total 208 ms
				2: Falkenstein, DE, EU, Hetzner Online (AS24940) | 301 Moved Permanently, total 63 ms

				One line per probe. Use output "full" for the raw output of every probe.
			`);
		});

		it("should print the status and the reason of probes that did not finish", () => {
			expect(formatMeasurement(pingFailed, "summary")).toMatchInlineSnapshot(`
				Measurement ID: 2Ip3lgjB734k2LqT200321Wl5
				Type: ping
				Target: nonexistent.google.com
				Status: finished
				Created: 2026-11-18T15:27:48.584Z
				Updated: 2026-11-18T15:27:48.667Z
				Locations: [{"magic":"world"}]
				Limit: 2
				Probes: 2

				- Successful Probes: 0/2
				- Total Packets: 0
				- Received: 0
				- Dropped: 0
				- Average Loss: 0.00%

				1: Helsinki, FI, EU, Hetzner Online (AS24940) | failed (target): queryA ENOTFOUND nonexistent.google.com
				2: Falkenstein, DE, EU, Hetzner Online (AS24940) | failed (target): queryA ENOTFOUND nonexistent.google.com

				One line per probe. Use output "full" for the raw output of every probe.
			`);
		});

		it("should print the reason only when the raw output is one line", () => {
			const measurement = {
				...pingFailed,
				results: [
					{
						probe: pingFailed.results[0].probe,
						result: {
							status: "failed",
							failureSource: "target",
							rawOutput:
								"PING 8.8.8.9 (8.8.8.9) 56(84) bytes of data.\nno answer yet for icmp_seq=1\n\nThe measurement command timed out.",
						},
					},
					{
						probe: pingFailed.results[1].probe,
						result: {
							status: "failed",
							failureSource: "internal",
							rawOutput: "The measurement timed out.\n",
						},
					},
				],
			};

			expect(formatMeasurement(measurement, "summary")).toMatchInlineSnapshot(`
				Measurement ID: 2Ip3lgjB734k2LqT200321Wl5
				Type: ping
				Target: nonexistent.google.com
				Status: finished
				Created: 2026-11-18T15:27:48.584Z
				Updated: 2026-11-18T15:27:48.667Z
				Locations: [{"magic":"world"}]
				Limit: 2
				Probes: 2

				- Successful Probes: 0/2
				- Total Packets: 0
				- Received: 0
				- Dropped: 0
				- Average Loss: 0.00%

				1: Helsinki, FI, EU, Hetzner Online (AS24940) | failed (target)
				2: Falkenstein, DE, EU, Hetzner Online (AS24940) | failed (internal): The measurement timed out.

				One line per probe. Use output "full" for the raw output of every probe.
			`);
		});

		it("should print only the status of a probe that is still running", () => {
			const measurement = {
				...pingFailed,
				status: "in-progress",
				results: [
					{
						probe: pingFailed.results[0].probe,
						result: {
							status: "in-progress",
							rawOutput: "PING google.com (142.250.75.14) 56(84) bytes of data.\n",
						},
					},
					pingFailed.results[1],
				],
			};

			expect(formatMeasurement(measurement, "summary")).toMatchInlineSnapshot(`
				Measurement ID: 2Ip3lgjB734k2LqT200321Wl5
				Type: ping
				Target: nonexistent.google.com
				Status: in-progress
				Created: 2026-11-18T15:27:48.584Z
				Updated: 2026-11-18T15:27:48.667Z
				Locations: [{"magic":"world"}]
				Limit: 2
				Probes: 2

				- Successful Probes: 0/2
				- Total Packets: 0
				- Received: 0
				- Dropped: 0
				- Average Loss: 0.00%

				1: Helsinki, FI, EU, Hetzner Online (AS24940) | in-progress
				2: Falkenstein, DE, EU, Hetzner Online (AS24940) | failed (target): queryA ENOTFOUND nonexistent.google.com

				One line per probe. Use output "full" for the raw output of every probe.
			`);
		});

		it("should switch to summary by default when the full output is too long", () => {
			const long = {
				...traceroute,
				results: traceroute.results.map(({ probe, result }) => ({
					probe,
					result: { ...result, rawOutput: "x".repeat(15_000) },
				})),
			};

			expect(formatMeasurement(long, "full")).toHaveLength(30324);
			expect(formatMeasurement(long)).toMatchInlineSnapshot(`
				Measurement ID: 2GaIM08nHIBGjG08y00321Wl5
				Type: traceroute
				Target: google.com
				Status: finished
				Created: 2026-11-18T15:27:47.399Z
				Updated: 2026-11-18T15:27:51.987Z
				Locations: [{"magic":"world"}]
				Limit: 2
				Probes: 2

				1: Helsinki, FI, EU, Hetzner Online (AS24940) | 5 hops, rtt 2.983 ms
				2: Falkenstein, DE, EU, Hetzner Online (AS24940) | 17 hops, rtt 5.415 ms

				One line per probe. Use output "full" for the raw output of every probe.
			`);
		});
	});
});
