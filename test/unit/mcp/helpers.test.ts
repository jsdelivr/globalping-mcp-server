/**
 * Tests for mcp/helpers.ts
 */
import { describe, it, expect } from "vitest";
import { calculateAverages, formatMeasurement, parseLocations } from "../../../src/mcp/helpers";
import dns from "./fixtures/dns.json";
import dnsNxdomain from "./fixtures/dns-nxdomain.json";
import dnsTrace from "./fixtures/dns-trace.json";
import http from "./fixtures/http.json";
import mtr from "./fixtures/mtr.json";
import ping from "./fixtures/ping.json";
import pingFailed from "./fixtures/ping-failed.json";
import traceroute from "./fixtures/traceroute.json";

// Print strings in snapshots as they are, without quotes and escapes.
expect.addSnapshotSerializer({
	test: (value) => typeof value === "string",
	serialize: (value) => value,
});

describe("parseLocations", () => {
	it("should return undefined for undefined input", () => {
		const result = parseLocations(undefined);
		expect(result).toBeUndefined();
	});

	it("should parse single string location", () => {
		const result = parseLocations("US");
		expect(result).toEqual([{ magic: "US" }]);
	});

	it("should parse array of locations", () => {
		const result = parseLocations(["US", "Europe", "Asia"]);
		expect(result).toEqual([{ magic: "US" }, { magic: "Europe" }, { magic: "Asia" }]);
	});

	it("should parse empty array", () => {
		const result = parseLocations([]);
		expect(result).toEqual([]);
	});

	it("should parse single item array", () => {
		const result = parseLocations(["London"]);
		expect(result).toEqual([{ magic: "London" }]);
	});

	it("should parse locations with special characters", () => {
		const result = parseLocations(["London+UK", "AS13335"]);
		expect(result).toEqual([{ magic: "London+UK" }, { magic: "AS13335" }]);
	});

	it("should parse measurement ID as location", () => {
		const result = parseLocations(["01HT4DGF5ZS7B2M93QP5ZTS3DN"]);
		expect(result).toEqual([{ magic: "01HT4DGF5ZS7B2M93QP5ZTS3DN" }]);
	});

	it("should handle empty string", () => {
		const result = parseLocations("");
		expect(result).toEqual(undefined);
	});
});

describe("calculateAverages", () => {
	it("should calculate averages for successful ping results", () => {
		const results = [
			{
				result: {
					status: "finished",
					stats: {
						total: 3,
						rcv: 3,
						drop: 0,
						loss: 0,
						min: 10,
						avg: 15,
						max: 20,
					},
				},
			},
			{
				result: {
					status: "finished",
					stats: {
						total: 3,
						rcv: 2,
						drop: 1,
						loss: 33.33,
						min: 12,
						avg: 18,
						max: 24,
					},
				},
			},
		];

		const summary = calculateAverages(results);

		expect(summary.probeCount).toBe(2);
		expect(summary.successfulProbes).toBe(2);
		expect(summary.totalPackets).toBe(6);
		expect(summary.totalReceived).toBe(5);
		expect(summary.totalDropped).toBe(1);
		expect(summary.averageLoss).toBeCloseTo(16.67, 1);
		expect(summary.minRtt).toBe(10);
		expect(summary.maxRtt).toBe(24);
		expect(summary.avgRtt).toBeCloseTo(16.5, 1);
	});

	it("should handle empty results array", () => {
		const summary = calculateAverages([]);

		expect(summary.probeCount).toBe(0);
		expect(summary.successfulProbes).toBe(0);
		expect(summary.totalPackets).toBe(0);
		expect(summary.totalReceived).toBe(0);
		expect(summary.totalDropped).toBe(0);
		expect(summary.averageLoss).toBe(0);
		expect(summary.minRtt).toBeNull();
		expect(summary.maxRtt).toBeNull();
		expect(summary.avgRtt).toBeNull();
	});

	it("should filter out non-finished results", () => {
		const results = [
			{
				result: {
					status: "in-progress",
					stats: {
						total: 3,
						rcv: 3,
						drop: 0,
						loss: 0,
						min: 10,
						avg: 15,
						max: 20,
					},
				},
			},
			{
				result: {
					status: "finished",
					stats: {
						total: 3,
						rcv: 3,
						drop: 0,
						loss: 0,
						min: 10,
						avg: 15,
						max: 20,
					},
				},
			},
		];

		const summary = calculateAverages(results);

		expect(summary.probeCount).toBe(2);
		expect(summary.successfulProbes).toBe(1);
		expect(summary.totalPackets).toBe(3);
	});

	it("should filter out results without stats", () => {
		const results = [
			{
				result: {
					status: "finished",
				},
			},
			{
				result: {
					status: "finished",
					stats: {
						total: 3,
						rcv: 3,
						drop: 0,
						loss: 0,
						min: 10,
						avg: 15,
						max: 20,
					},
				},
			},
		];

		const summary = calculateAverages(results);

		expect(summary.probeCount).toBe(2);
		expect(summary.successfulProbes).toBe(1);
	});

	it("should handle null RTT values", () => {
		const results = [
			{
				result: {
					status: "finished",
					stats: {
						total: 3,
						rcv: 0,
						drop: 3,
						loss: 100,
						min: null,
						avg: null,
						max: null,
					},
				},
			},
		];

		const summary = calculateAverages(results);

		expect(summary.minRtt).toBeNull();
		expect(summary.maxRtt).toBeNull();
		expect(summary.avgRtt).toBeNull();
		expect(summary.averageLoss).toBe(100);
	});

	it("should calculate correct min RTT across multiple probes", () => {
		const results = [
			{
				result: {
					status: "finished",
					stats: {
						total: 3,
						rcv: 3,
						drop: 0,
						loss: 0,
						min: 25,
						avg: 30,
						max: 35,
					},
				},
			},
			{
				result: {
					status: "finished",
					stats: {
						total: 3,
						rcv: 3,
						drop: 0,
						loss: 0,
						min: 10,
						avg: 15,
						max: 20,
					},
				},
			},
		];

		const summary = calculateAverages(results);

		expect(summary.minRtt).toBe(10);
	});

	it("should calculate correct max RTT across multiple probes", () => {
		const results = [
			{
				result: {
					status: "finished",
					stats: {
						total: 3,
						rcv: 3,
						drop: 0,
						loss: 0,
						min: 10,
						avg: 15,
						max: 20,
					},
				},
			},
			{
				result: {
					status: "finished",
					stats: {
						total: 3,
						rcv: 3,
						drop: 0,
						loss: 0,
						min: 25,
						avg: 30,
						max: 50,
					},
				},
			},
		];

		const summary = calculateAverages(results);

		expect(summary.maxRtt).toBe(50);
	});

	it("should handle zero packets correctly", () => {
		const results = [
			{
				result: {
					status: "finished",
					stats: {
						total: 0,
						rcv: 0,
						drop: 0,
						loss: 0,
						min: null,
						avg: null,
						max: null,
					},
				},
			},
		];

		const summary = calculateAverages(results);

		expect(summary.averageLoss).toBe(0);
	});

	it("should calculate 100% packet loss correctly", () => {
		const results = [
			{
				result: {
					status: "finished",
					stats: {
						total: 10,
						rcv: 0,
						drop: 10,
						loss: 100,
						min: null,
						avg: null,
						max: null,
					},
				},
			},
		];

		const summary = calculateAverages(results);

		expect(summary.averageLoss).toBe(100);
	});
});

// The fixtures are real Globalping API responses for google.com.
describe("formatMeasurement", () => {
	it("should print ping with totals over all probes", () => {
		expect(formatMeasurement(ping)).toMatchInlineSnapshot(`
			Measurement ID: 2FL0lrUmQXiWPHMDY00321Wl5
			Type: ping
			Target: google.com
			Status: finished
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
			Probes: 2

			Probe 1: Helsinki, FI, EU, Hetzner Online (AS24940)
			Resolved IP: 172.217.22.110
			Timings: total 208 ms, dns 51 ms, tcp 45 ms, tls 56 ms, firstByte 56 ms, download 0 ms
			TLS: TLSv1.3, TLS_AES_256_GCM_SHA384, valid
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

	it("should print the status of probes that did not finish", () => {
		expect(formatMeasurement(pingFailed)).toMatchInlineSnapshot(`
			Measurement ID: 2Ip3lgjB734k2LqT200321Wl5
			Type: ping
			Target: nonexistent.google.com
			Status: finished
			Probes: 2

			- Successful Probes: 0/2
			- Total Packets: 0
			- Received: 0
			- Dropped: 0
			- Average Loss: 0.00%

			Probe 1: Helsinki, FI, EU, Hetzner Online (AS24940)
			Status: failed
			queryA ENOTFOUND nonexistent.google.com

			Probe 2: Falkenstein, DE, EU, Hetzner Online (AS24940)
			Status: failed
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
				Probes: 2

				1: Helsinki, FI, EU, Hetzner Online (AS24940) | 5 hops, 2.983 ms
				2: Falkenstein, DE, EU, Hetzner Online (AS24940) | 17 hops, 5.415 ms

				One line per probe. Use output "full" for the raw output of every probe.
			`);
		});

		it("should summarize mtr", () => {
			expect(formatMeasurement(mtr, "summary")).toMatchInlineSnapshot(`
				Measurement ID: 2IVwW2U5Q1aQTR0Pr00321Wl5
				Type: mtr
				Target: google.com
				Status: finished
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
				Probes: 2

				1: Helsinki, FI, EU, Hetzner Online (AS24940) | 74.125.205.101, 74.125.205.139, 74.125.205.102, 74.125.205.138, 74.125.205.113, 74.125.205.100, 0 ms
				2: Falkenstein, DE, EU, Hetzner Online (AS24940) | 142.251.127.113, 142.251.127.138, 142.251.127.101, 142.251.127.102, 142.251.127.139, 142.251.127.100, 0 ms

				One line per probe. Use output "full" for the raw output of every probe.
			`);
		});

		it("should summarize dns without answers by its status code name", () => {
			expect(formatMeasurement(dnsNxdomain, "summary")).toMatchInlineSnapshot(`
				Measurement ID: 2iz5JAV8tHTMdV2jT00321Wl5
				Type: dns
				Target: nonexistent.google.com
				Status: finished
				Probes: 2

				1: Falkenstein, DE, EU, Hetzner Online (AS24940) | NXDOMAIN, 15 ms
				2: Helsinki, FI, EU, Hetzner Online (AS24940) | NXDOMAIN, 32 ms

				One line per probe. Use output "full" for the raw output of every probe.
			`);
		});

		it("should summarize a dns trace by its last hop", () => {
			expect(formatMeasurement(dnsTrace, "summary")).toMatchInlineSnapshot(`
				Measurement ID: 2fIuRvqrxqKwKmGFM00321Wl5
				Type: dns
				Target: google.com
				Status: finished
				Probes: 2

				1: Helsinki, FI, EU, Hetzner Online (AS24940) | 64.233.164.138, 64.233.164.113, 64.233.164.139, 64.233.164.101, 64.233.164.102, 64.233.164.100, 15 ms
				2: Falkenstein, DE, EU, Hetzner Online (AS24940) | 142.250.154.138, 142.250.154.139, 142.250.154.101, 142.250.154.102, 142.250.154.100, 142.250.154.113, 26 ms

				One line per probe. Use output "full" for the raw output of every probe.
			`);
		});

		it("should summarize http", () => {
			expect(formatMeasurement(http, "summary")).toMatchInlineSnapshot(`
				Measurement ID: 2P4xQQKCD6c75fZM200321Wl5
				Type: http
				Target: google.com
				Status: finished
				Probes: 2

				1: Helsinki, FI, EU, Hetzner Online (AS24940) | 301 Moved Permanently, 208 ms
				2: Falkenstein, DE, EU, Hetzner Online (AS24940) | 301 Moved Permanently, 63 ms

				One line per probe. Use output "full" for the raw output of every probe.
			`);
		});

		it("should print the status and the reason of probes that did not finish", () => {
			expect(formatMeasurement(pingFailed, "summary")).toMatchInlineSnapshot(`
				Measurement ID: 2Ip3lgjB734k2LqT200321Wl5
				Type: ping
				Target: nonexistent.google.com
				Status: finished
				Probes: 2

				- Successful Probes: 0/2
				- Total Packets: 0
				- Received: 0
				- Dropped: 0
				- Average Loss: 0.00%

				1: Helsinki, FI, EU, Hetzner Online (AS24940) | failed: queryA ENOTFOUND nonexistent.google.com
				2: Falkenstein, DE, EU, Hetzner Online (AS24940) | failed: queryA ENOTFOUND nonexistent.google.com

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

			expect(formatMeasurement(long, "full")).toHaveLength(30216);
			expect(formatMeasurement(long)).toMatchInlineSnapshot(`
				Measurement ID: 2GaIM08nHIBGjG08y00321Wl5
				Type: traceroute
				Target: google.com
				Status: finished
				Probes: 2

				1: Helsinki, FI, EU, Hetzner Online (AS24940) | 5 hops, 2.983 ms
				2: Falkenstein, DE, EU, Hetzner Online (AS24940) | 17 hops, 5.415 ms

				The full output has 30216 characters, so this is one line per probe. Use output "full" to get it anyway.
			`);
		});
	});
});
