/**
 * Tests for mcp/format.ts
 */
import { describe, expect, it } from "vitest";
import { formatMeasurement } from "../../../src/mcp/format";
import dns from "./fixtures/dns.json";
import dnsCname from "./fixtures/dns-cname.json";
import dnsManyAnswers from "./fixtures/dns-many-answers.json";
import dnsNoAnswers from "./fixtures/dns-no-answers.json";
import dnsNxdomain from "./fixtures/dns-nxdomain.json";
import dnsTrace from "./fixtures/dns-trace.json";
import http from "./fixtures/http.json";
import httpFailed from "./fixtures/http-failed.json";
import httpGet from "./fixtures/http-get.json";
import httpIp from "./fixtures/http-ip.json";
import mtr from "./fixtures/mtr.json";
import mtrNoReplies from "./fixtures/mtr-no-replies.json";
import mtrNoReply from "./fixtures/mtr-no-reply.json";
import ping from "./fixtures/ping.json";
import pingFailed from "./fixtures/ping-failed.json";
import pingLost from "./fixtures/ping-lost.json";
import pingResolverFailed from "./fixtures/ping-resolver-failed.json";
import pingTcp from "./fixtures/ping-tcp.json";
import traceroute from "./fixtures/traceroute.json";
import tracerouteHopLimit from "./fixtures/traceroute-hop-limit.json";
import tracerouteNoReplies from "./fixtures/traceroute-no-replies.json";
import tracerouteNoReply from "./fixtures/traceroute-no-reply.json";
import tracerouteTwoAddresses from "./fixtures/traceroute-two-addresses.json";

// Print strings in snapshots as they are, without quotes and escapes.
expect.addSnapshotSerializer({
	test: (value) => typeof value === "string",
	serialize: (value) => value,
});

// The fixtures are real Globalping API responses.
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

			Ping Results:
			- Successful Probes: 2/2
			- Total Packets: 6
			- Received: 6
			- Dropped: 0
			- Average Loss: 0.00%
			- Min RTT: 3.20 ms
			- Avg RTT: 4.33 ms
			- Max RTT: 5.45 ms

			Probe 1: Falkenstein, DE, EU, Hetzner Online (AS24940), tags: datacenter-network, u-kneuper-it
			Resolved IP: 142.250.154.113
			Packets: 3 sent, 3 received, 0 lost (0%)
			RTT: min 5.142 ms, avg 5.294 ms, max 5.45 ms
			Replies: 5.29 ms ttl 111, 5.14 ms ttl 111, 5.45 ms ttl 111

			Probe 2: Helsinki, FI, EU, Hetzner Online (AS24940), tags: datacenter-network
			Resolved IP: 173.194.221.102
			Packets: 3 sent, 3 received, 0 lost (0%)
			RTT: min 3.199 ms, avg 3.375 ms, max 3.534 ms
			Replies: 3.53 ms ttl 106, 3.39 ms ttl 106, 3.2 ms ttl 106
		`);
	});

	it("should print replies of TCP ping without TTL", () => {
		expect(formatMeasurement(pingTcp)).toMatchInlineSnapshot(`
			Measurement ID: 2fN1hEqEMN07pafZC00321ZOy
			Type: ping
			Target: github.com
			Status: finished
			Created: 2026-11-25T16:48:51.525Z
			Updated: 2026-11-25T16:48:53.235Z
			Locations: [{"magic":"world"}]
			Limit: 30
			Options: {"protocol":"TCP","port":443}
			Probes: 1

			Ping Results:
			- Successful Probes: 1/1
			- Total Packets: 3
			- Received: 3
			- Dropped: 0
			- Average Loss: 0.00%
			- Min RTT: 23.18 ms
			- Avg RTT: 23.47 ms
			- Max RTT: 23.65 ms

			Probe 1: Helsinki, FI, EU, Hetzner Online (AS24940), tags: datacenter-network
			Resolved IP: 140.82.121.4
			Packets: 3 sent, 3 received, 0 lost (0%)
			RTT: min 23.18 ms, avg 23.47 ms, max 23.65 ms
			Replies: 23.2 ms, 23.6 ms, 23.6 ms
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

			Probe 1: Helsinki, FI, EU, Hetzner Online (AS24940), tags: datacenter-network, u-jimaek
			Resolved IP: 64.233.163.113
			Hop | Host | RTT ms
			1 | _gateway (172.23.1.1) | 0.03, 0.01
			2 | ex9k1.dc5.hel1.hetzner.com (213.133.119.10) | 0.376, 0.401
			3 | core32.hel1.hetzner.com (213.133.126.32) | 0.402, 0.393
			4 | juniper4.dc1.hel1.hetzner.com (213.239.224.25) | 0.534, 0.525
			5 | google.com (64.233.163.113) | 2.983, 3.137

			Probe 2: Falkenstein, DE, EU, Hetzner Online (AS24940), tags: datacenter-network
			Resolved IP: 142.251.14.102
			Hop | Host | RTT ms
			1 | _gateway (172.31.1.1) | 4.829, 5.137
			2 | 33838.your-cloud.host (49.12.31.3) | 2.47, 2.837
			3 | no reply
			4 | no reply
			5 | core-spine-rdev1.cloud2.fsn1.hetzner.com (213.239.227.193) | 3.246, 3.242
			6 | core21.fsn1.hetzner.com (213.239.227.194) | 3.472, 3.469
			7 | core4.fra.hetzner.com (213.239.224.106) | 8.174, 8.171
			8 | 72.14.218.94 | 8.238, 8.234
			9 | no reply
			10 | 216.239.56.24 | 8.707, 8.703
			11 | no reply
			12 | no reply
			13 | no reply
			14 | no reply
			15 | no reply
			16 | no reply
			17 | google.com (142.251.14.102) | 5.415, 5.435
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

			Probe 1: Falkenstein, DE, EU, Hetzner Online (AS24940), tags: datacenter-network, u-watn3y
			Resolved IP: 142.250.154.101
			Hop | ASN | Host | Loss % | Sent | Received | Dropped | Min ms | Avg ms | Max ms | StDev ms | Jitter min ms | Jitter avg ms | Jitter max ms | RTT ms
			1 | 24940 | _gateway (213.133.117.207) | 0 | 3 | 3 | 0 | 0.279 | 0.3 | 0.365 | 0 | 0 | 0.2 | 0.3 | 0.326, 0.365, 0.279
			2 | 24940 | core23.fsn1.hetzner.com (213.133.126.23) | 0 | 3 | 3 | 0 | 0.35 | 2.8 | 7.685 | 3.4 | 0.1 | 3.9 | 7.7 | 0.35, 0.494, 7.685
			3 | 24940 | core5.fra.hetzner.com (213.239.224.78) | 0 | 3 | 3 | 0 | 5.04 | 5.4 | 5.696 | 0.3 | 0.1 | 2.6 | 5 | 5.607, 5.696, 5.04
			4 | 24940 | 213-239-239-118.clients.your-server.de (213.239.239.118) | 0 | 3 | 3 | 0 | 4.98 | 5 | 5.097 | 0.1 | 0.1 | 2.5 | 5 | 4.998, 5.097, 4.98
			5 | no reply
			6 | 15169 | 192.178.252.254 | 0 | 3 | 3 | 0 | 5.824 | 6.1 | 6.373 | 0.2 | 0.1 | 3 | 5.8 | 6.224, 6.373, 5.824
			7 | no reply
			8 | no reply
			9 | no reply
			10 | no reply
			11 | no reply
			12 | no reply
			13 | 15169 | google.com (142.250.154.101) | 0 | 3 | 3 | 0 | 5.289 | 5.3 | 5.342 | 0 | 0 | 2.6 | 5.3 | 5.331, 5.342, 5.289

			Probe 2: Helsinki, FI, EU, Hetzner Online (AS24940), tags: datacenter-network
			Resolved IP: 64.233.161.139
			Hop | ASN | Host | Loss % | Sent | Received | Dropped | Min ms | Avg ms | Max ms | StDev ms | Jitter min ms | Jitter avg ms | Jitter max ms | RTT ms
			1 |  | _gateway (172.31.1.1) | 0 | 3 | 3 | 0 | 1.492 | 1.7 | 2.067 | 0.2 | 0.2 | 1.1 | 2.1 | 1.668, 1.492, 2.067
			2 | 24940 | 20992.your-cloud.host (65.108.115.149) | 0 | 3 | 3 | 0 | 0.162 | 0.3 | 0.51 | 0.1 | 0.2 | 0.3 | 0.3 | 0.51, 0.162, 0.247
			3 | no reply
			4 | no reply
			5 | 24940 | core-spine-rdev1.cloud1.hel1.hetzner.com (213.239.228.2) | 0 | 3 | 3 | 0 | 0.511 | 0.7 | 0.912 | 0.2 | 0.1 | 0.5 | 0.9 | 0.511, 0.621, 0.912
			6 | 24940 | core32.hel1.hetzner.com (213.239.228.5) | 0 | 3 | 3 | 0 | 0.386 | 0.5 | 0.656 | 0.1 | 0.1 | 0.3 | 0.4 | 0.656, 0.509, 0.386
			7 | 24940 | juniper4.dc1.hel1.hetzner.com (213.239.224.25) | 0 | 3 | 3 | 0 | 0.521 | 0.7 | 0.84 | 0.1 | 0.1 | 0.3 | 0.5 | 0.84, 0.78, 0.521
			8 | 15169 | 142.251.195.234 | 0 | 3 | 3 | 0 | 0.98 | 1.9 | 3.651 | 1.3 | 1 | 1.8 | 2.6 | 3.651, 1.016, 0.98
			9 | 15169 | google.com (64.233.161.139) | 0 | 3 | 3 | 0 | 3.131 | 3.3 | 3.464 | 0.1 | 0.1 | 1.6 | 3.1 | 3.464, 3.322, 3.131
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

			Probe 1: Helsinki, FI, EU, Hetzner Online (AS24940), tags: datacenter-network
			Response code: NOERROR (0)
			Resolver: private, total 0 ms
			Answers: 6
			google.com. 225 IN A 74.125.205.101
			google.com. 225 IN A 74.125.205.139
			google.com. 225 IN A 74.125.205.102
			google.com. 225 IN A 74.125.205.138
			google.com. 225 IN A 74.125.205.113
			google.com. 225 IN A 74.125.205.100

			Probe 2: Falkenstein, DE, EU, Hetzner Online (AS24940), tags: datacenter-network
			Response code: NOERROR (0)
			Resolver: private, total 0 ms
			Answers: 6
			google.com. 236 IN A 142.251.127.113
			google.com. 236 IN A 142.251.127.138
			google.com. 236 IN A 142.251.127.101
			google.com. 236 IN A 142.251.127.102
			google.com. 236 IN A 142.251.127.139
			google.com. 236 IN A 142.251.127.100
		`);
	});

	it("should print dns without answers", () => {
		expect(formatMeasurement(dnsNxdomain)).toMatchInlineSnapshot(`
			Measurement ID: 2iz5JAV8tHTMdV2jT00321Wl5
			Type: dns
			Target: nonexistent.google.com
			Status: finished
			Created: 2026-11-18T15:27:48.164Z
			Updated: 2026-11-18T15:27:48.278Z
			Locations: [{"magic":"world"}]
			Limit: 2
			Probes: 2

			Probe 1: Falkenstein, DE, EU, Hetzner Online (AS24940), tags: datacenter-network
			Response code: NXDOMAIN (3)
			Resolver: 185.12.64.2, total 15 ms
			Answers: 0

			Probe 2: Helsinki, FI, EU, Hetzner Online (AS24940), tags: datacenter-network
			Response code: NXDOMAIN (3)
			Resolver: private, total 32 ms
			Answers: 0
		`);
	});

	it("should print every hop of a dns trace", () => {
		expect(formatMeasurement(dnsTrace)).toMatchInlineSnapshot(`
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

			Probe 1: Helsinki, FI, EU, Hetzner Online (AS24940), tags: datacenter-network
			Hop 1
			Resolver: 127.0.0.53, total 3 ms
			Answers: 13
			. 68726 IN NS b.root-servers.net.
			. 68726 IN NS c.root-servers.net.
			. 68726 IN NS d.root-servers.net.
			. 68726 IN NS e.root-servers.net.
			. 68726 IN NS f.root-servers.net.
			. 68726 IN NS g.root-servers.net.
			. 68726 IN NS h.root-servers.net.
			. 68726 IN NS i.root-servers.net.
			. 68726 IN NS j.root-servers.net.
			. 68726 IN NS k.root-servers.net.
			. 68726 IN NS l.root-servers.net.
			. 68726 IN NS m.root-servers.net.
			. 68726 IN NS a.root-servers.net.
			Hop 2
			Resolver: j.root-servers.net, total 0 ms
			Answers: 15
			com. 172800 IN NS a.gtld-servers.net.
			com. 172800 IN NS b.gtld-servers.net.
			com. 172800 IN NS c.gtld-servers.net.
			com. 172800 IN NS d.gtld-servers.net.
			com. 172800 IN NS e.gtld-servers.net.
			com. 172800 IN NS f.gtld-servers.net.
			com. 172800 IN NS g.gtld-servers.net.
			com. 172800 IN NS h.gtld-servers.net.
			com. 172800 IN NS i.gtld-servers.net.
			com. 172800 IN NS j.gtld-servers.net.
			com. 172800 IN NS k.gtld-servers.net.
			com. 172800 IN NS l.gtld-servers.net.
			com. 172800 IN NS m.gtld-servers.net.
			com. 86400 IN DS 19718 13 2 8ACBB0CD28F41250A80A491389424D341522D946B0DA0C0291F2D3D771D7805A
			com. 86400 IN RRSIG DS 8 1 86400 20261201050000 20261118040000 8763 . GycTMMQZpKNBq967IWI9eSQ29075PY4L3od+Ruimd4Dd0Vt/o+i4DrLGUuxNwqJCaeP/Gc6j6K9JBAukXaCFJo4T9gFKMubI9g+3YHmi1PTvojyN2O0PpU1jKZ3yOytq7luiN2Az/UdGn4Fp/c90eCzRFpRz8rXHvxn19o1D4MmxdbMepaw/u0hgEbRECFr3dhM+yP86iVHdLTTi2soWP9kVqhtpR95Cys8XN8hQa1b/ZtL50oLBRkZvIF/OkZnuNmMHxm+M6u8saUdgDI7tcuE09VK0DqKrnPw240g1uk1WkAk4SPTYWR9LbfuK1sSP6piKWpURr9yDJuEYxlt3fg==
			Hop 3
			Resolver: g.gtld-servers.net, total 31 ms
			Answers: 8
			google.com. 172800 IN NS ns2.google.com.
			google.com. 172800 IN NS ns1.google.com.
			google.com. 172800 IN NS ns3.google.com.
			google.com. 172800 IN NS ns4.google.com.
			CK0POJMG874LJREF7EFN8430QVIT8BSM.com. 900 IN NSEC3 1 1 0 - CK0Q35HRS4H76G6CHNB9414CJN6S5UPL NS SOA RRSIG DNSKEY NSEC3PARAM
			CK0POJMG874LJREF7EFN8430QVIT8BSM.com. 900 IN RRSIG NSEC3 13 2 900 20261122020710 20261115005710 65344 com. P0u6dMaghMaDzuRB1IyD9U6LJxgDgPhoJDbyNPwE7FtbHW+ReihU+1OPkJwrG1ADEm3YTd9KkkMG7C8iPSF7RA==
			S84BOR4DK28HNHPLC218O483VOOOD5D8.com. 900 IN NSEC3 1 1 0 - S84BR9CIB2A20L3ETR1M2415ENPP99L8 NS DS RRSIG
			S84BOR4DK28HNHPLC218O483VOOOD5D8.com. 900 IN RRSIG NSEC3 13 2 900 20261123012729 20261116001729 65344 com. /GT9xODVda4m2OvmVohenizu50qNqBvXejAW0b2w+DRfxrc8gVodFlvLWobvji2fvBofm5xGq4jbcs70TMAuCg==
			Hop 4
			Resolver: ns2.google.com, total 15 ms
			Answers: 6
			google.com. 300 IN A 64.233.164.138
			google.com. 300 IN A 64.233.164.113
			google.com. 300 IN A 64.233.164.139
			google.com. 300 IN A 64.233.164.101
			google.com. 300 IN A 64.233.164.102
			google.com. 300 IN A 64.233.164.100

			Probe 2: Falkenstein, DE, EU, Hetzner Online (AS24940), tags: datacenter-network, u-suleymn20, u-suleymn20:sndu-falkenstein
			Hop 1
			Resolver: 127.0.0.53, total 1 ms
			Answers: 14
			. 83649 IN NS m.root-servers.net.
			. 83649 IN NS j.root-servers.net.
			. 83649 IN NS b.root-servers.net.
			. 83649 IN NS d.root-servers.net.
			. 83649 IN NS f.root-servers.net.
			. 83649 IN NS h.root-servers.net.
			. 83649 IN NS c.root-servers.net.
			. 83649 IN NS l.root-servers.net.
			. 83649 IN NS k.root-servers.net.
			. 83649 IN NS e.root-servers.net.
			. 83649 IN NS g.root-servers.net.
			. 83649 IN NS i.root-servers.net.
			. 83649 IN NS a.root-servers.net.
			. 83649 IN RRSIG NS 8 0 518400 20261201050000 20261118040000 8763 . rAKB1aLi/F3mIR4mGkfyY+lUX98i/AgGhS3vi0cMOhYseWAHW1zb9iH2FqEuaZso86eBqXNp+zDiVfgW5KfsVCL3D+fui10G7ReGqo1fH7KTao4tmZQXqYLW6sd7q1A+g4lkOAFnAig7CJSAPgDe5nOe22izE6VBHZiHMPetBctTvtafphZXcCq2AgRW2p898jRyyAwQ8MuMjU0VPvXhVAycVoVn7xgc9oezInNDS/2jjUHLqObMv/5rfTafnRlQX9MWd3W1rJoOCHXfnnF6xmmqbtIP4DWeEmjqVPBPtGPFuLv5hBgOhZWnmI2lW+N3deT8ECFnq7Sg7u+4dxSk/A==
			Hop 2
			Resolver: b.root-servers.net, total 12 ms
			Answers: 15
			com. 172800 IN NS a.gtld-servers.net.
			com. 172800 IN NS b.gtld-servers.net.
			com. 172800 IN NS c.gtld-servers.net.
			com. 172800 IN NS d.gtld-servers.net.
			com. 172800 IN NS e.gtld-servers.net.
			com. 172800 IN NS f.gtld-servers.net.
			com. 172800 IN NS g.gtld-servers.net.
			com. 172800 IN NS h.gtld-servers.net.
			com. 172800 IN NS i.gtld-servers.net.
			com. 172800 IN NS j.gtld-servers.net.
			com. 172800 IN NS k.gtld-servers.net.
			com. 172800 IN NS l.gtld-servers.net.
			com. 172800 IN NS m.gtld-servers.net.
			com. 86400 IN DS 19718 13 2 8ACBB0CD28F41250A80A491389424D341522D946B0DA0C0291F2D3D771D7805A
			com. 86400 IN RRSIG DS 8 1 86400 20261201050000 20261118040000 8763 . GycTMMQZpKNBq967IWI9eSQ29075PY4L3od+Ruimd4Dd0Vt/o+i4DrLGUuxNwqJCaeP/Gc6j6K9JBAukXaCFJo4T9gFKMubI9g+3YHmi1PTvojyN2O0PpU1jKZ3yOytq7luiN2Az/UdGn4Fp/c90eCzRFpRz8rXHvxn19o1D4MmxdbMepaw/u0hgEbRECFr3dhM+yP86iVHdLTTi2soWP9kVqhtpR95Cys8XN8hQa1b/ZtL50oLBRkZvIF/OkZnuNmMHxm+M6u8saUdgDI7tcuE09VK0DqKrnPw240g1uk1WkAk4SPTYWR9LbfuK1sSP6piKWpURr9yDJuEYxlt3fg==
			Hop 3
			Resolver: e.gtld-servers.net, total 32 ms
			Answers: 8
			google.com. 172800 IN NS ns2.google.com.
			google.com. 172800 IN NS ns1.google.com.
			google.com. 172800 IN NS ns3.google.com.
			google.com. 172800 IN NS ns4.google.com.
			CK0POJMG874LJREF7EFN8430QVIT8BSM.com. 900 IN NSEC3 1 1 0 - CK0Q35HRS4H76G6CHNB9414CJN6S5UPL NS SOA RRSIG DNSKEY NSEC3PARAM
			CK0POJMG874LJREF7EFN8430QVIT8BSM.com. 900 IN RRSIG NSEC3 13 2 900 20261122020710 20261115005710 65344 com. P0u6dMaghMaDzuRB1IyD9U6LJxgDgPhoJDbyNPwE7FtbHW+ReihU+1OPkJwrG1ADEm3YTd9KkkMG7C8iPSF7RA==
			S84BOR4DK28HNHPLC218O483VOOOD5D8.com. 900 IN NSEC3 1 1 0 - S84BR9CIB2A20L3ETR1M2415ENPP99L8 NS DS RRSIG
			S84BOR4DK28HNHPLC218O483VOOOD5D8.com. 900 IN RRSIG NSEC3 13 2 900 20261123012729 20261116001729 65344 com. /GT9xODVda4m2OvmVohenizu50qNqBvXejAW0b2w+DRfxrc8gVodFlvLWobvji2fvBofm5xGq4jbcs70TMAuCg==
			Hop 4
			Resolver: ns2.google.com, total 26 ms
			Answers: 6
			google.com. 300 IN A 142.250.154.138
			google.com. 300 IN A 142.250.154.139
			google.com. 300 IN A 142.250.154.101
			google.com. 300 IN A 142.250.154.102
			google.com. 300 IN A 142.250.154.100
			google.com. 300 IN A 142.250.154.113
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

			Headers same for all probes:
			Location: https://www.google.com/
			Content-Type: text/html; charset=UTF-8
			Date: Wed, 18 Nov 2026 15:27:48 GMT
			Expires: Fri, 18 Dec 2026 15:27:48 GMT
			Cache-Control: public, max-age=2592000
			Server: gws
			Content-Length: 220
			X-XSS-Protection: 0
			X-Frame-Options: SAMEORIGIN
			Alt-Svc: h3=":443"; ma=2592000,h3-29=":443"; ma=2592000
			Connection: close

			Probe 1: Helsinki, FI, EU, Hetzner Online (AS24940), tags: datacenter-network, u-V8AA
			Resolved IP: 172.217.22.110
			Timings: total 208 ms, dns 51 ms, tcp 45 ms, tls 56 ms, firstByte 56 ms, download 0 ms
			TLS: TLSv1.3, TLS_AES_256_GCM_SHA384, valid
			Certificate:
			- Subject: *.google.com
			- Alt names: DNS:*.google.com, DNS:*.admin.google.com, DNS:*.appengine.google.com, DNS:*.bdn.dev, DNS:*.origin-test.bdn.dev, DNS:*.cloud.google.com, DNS:*.crowdsource.google.com, DNS:*.datacompute.google.com, DNS:*.google.ca, DNS:*.google.cl, DNS:*.google.co.in, DNS:*.google.co.jp, DNS:*.google.co.uk, DNS:*.google.com.ar, DNS:*.google.com.au, DNS:*.google.com.br, DNS:*.google.com.co, DNS:*.google.com.mx, DNS:*.google.com.tr, DNS:*.google.com.vn, DNS:*.google.de, DNS:*.google.es, DNS:*.google.fr, DNS:*.google.hu, DNS:*.google.it, DNS:*.google.nl, DNS:*.google.pl, DNS:*.google.pt, DNS:*.gemini.cloud.google.com, DNS:*.gstatic.com, DNS:*.metric.gstatic.com, DNS:*.gvt1.com, DNS:*.gcpcdn.gvt1.com, DNS:*.gvt2.com, DNS:*.gcp.gvt2.com, DNS:*.url.google.com, DNS:*.youtube-nocookie.com, DNS:*.ytimg.com, DNS:ai.android, DNS:android.com, DNS:*.android.com, DNS:*.flash.android.com, DNS:g.co, DNS:*.g.co, DNS:goo.gl, DNS:www.goo.gl, DNS:google-analytics.com, DNS:*.google-analytics.com, DNS:google.com, DNS:googlecommerce.com, DNS:*.googlecommerce.com, DNS:urchin.com, DNS:*.urchin.com, DNS:youtu.be, DNS:youtube.com, DNS:*.youtube.com, DNS:music.youtube.com, DNS:*.music.youtube.com, DNS:youtubeeducation.com, DNS:*.youtubeeducation.com, DNS:youtubekids.com, DNS:*.youtubekids.com, DNS:yt.be, DNS:*.yt.be, DNS:android.clients.google.com, DNS:*.aistudio.google.com
			- Issuer: WE2, Google Trust Services, US
			- Dates: 2026-11-03T08:26:50.000Z to 2027-01-26T08:26:49.000Z
			- Key: EC 256 bits
			- Serial number: 53:10:12:51:08:7F:FC:43:09:F2:7D:0B:33:C2:02:AA
			- SHA-256 fingerprint: 2B:1E:9F:EC:6E:AD:F7:A8:70:AF:64:3F:92:4F:BB:95:2F:8C:C6:75:A9:3F:33:92:6C:5E:9B:39:2E:C5:74:F2
			- Public key: 04:DB:2E:F7:8B:FC:68:DF:C0:B5:BB:CB:0A:ED:95:BE:C7:07:FA:4B:9B:68:14:C9:88:B2:95:05:57:85:12:C3:DF:EF:97:EF:86:18:53:C2:00:71:AE:76:A2:F1:DE:79:95:22:36:A2:A0:12:BB:6A:8F:99:C3:29:BB:BE:01:51:61
			HTTP/1.1 301 Moved Permanently
			Content-Security-Policy-Report-Only: object-src 'none';base-uri 'self';script-src 'nonce-1sBldBVSbHwcKpQ78_a9Fw' 'strict-dynamic' 'report-sample' 'unsafe-eval' 'unsafe-inline' https: http:;report-uri https://csp.withgoogle.com/csp/gws/other-hp
			Plus headers same for all probes (11), listed at the top.

			Probe 2: Falkenstein, DE, EU, Hetzner Online (AS24940), tags: datacenter-network
			Resolved IP: 142.251.110.101
			Timings: total 63 ms, dns 2 ms, tcp 6 ms, tls 21 ms, firstByte 34 ms, download 0 ms
			TLS: same as probe 1
			HTTP/1.1 301 Moved Permanently
			Content-Security-Policy-Report-Only: object-src 'none';base-uri 'self';script-src 'nonce-4qzX9y7LbdqRUfstppMOBQ' 'strict-dynamic' 'report-sample' 'unsafe-eval' 'unsafe-inline' https: http:;report-uri https://csp.withgoogle.com/csp/gws/other-hp
			Plus headers same for all probes (11), listed at the top.
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

			Probe 1: Falkenstein, DE, EU, Hetzner Online (AS24940), tags: datacenter-network
			Resolved IP: 1.1.1.1
			Timings: total 36 ms, dns N/A, tcp 7 ms, tls 12 ms, firstByte 17 ms, download 0 ms
			TLS: TLSv1.3, TLS_AES_256_GCM_SHA384, not valid (ERR_TLS_CERT_ALTNAME_INVALID)
			Certificate:
			- Subject: cloudflare-dns.com
			- Alt names: DNS:cloudflare-dns.com, DNS:*.cloudflare-dns.com, IP Address:1.0.0.1, IP Address:1.1.1.1, IP Address:162.159.36.1, IP Address:162.159.46.1, IP Address:2606:4700:4700:0:0:0:0:1001, IP Address:2606:4700:4700:0:0:0:0:1111, IP Address:2606:4700:4700:0:0:0:0:64, IP Address:2606:4700:4700:0:0:0:0:6400, DNS:one.one.one.one
			- Issuer: SSL.com SSL Intermediate CA ECC R2, SSL Corp, US
			- Dates: 2025-12-31T19:20:01.000Z to 2026-12-21T19:20:01.000Z
			- Key: EC 256 bits
			- Serial number: 4E:D0:33:04:C4:6B:87:A8:C2:EB:55:69:DB:9E:BA:0C
			- SHA-256 fingerprint: E3:B0:28:26:78:9D:65:3D:22:4D:3E:DA:CB:E4:E8:77:CB:72:86:FC:4C:92:26:72:F6:22:67:41:CA:57:AD:65
			- Public key: 04:63:83:50:25:12:EA:72:78:19:EB:32:47:AF:C1:05:52:9C:2A:2B:60:8A:84:4E:75:6D:81:48:47:C1:C7:BE:CF:85:79:6C:12:29:5B:50:B3:CC:EC:50:A1:94:9E:DC:44:08:07:0C:80:1A:93:D3:BD:78:11:7B:B6:A3:C8:EA:AC
			HTTP/1.1 301 Moved Permanently
			Date: Wed, 18 Nov 2026 16:18:37 GMT
			Connection: close
			Location: https://one.one.one.one/
			Server: cloudflare
			CF-RAY: a5c84ac7a958dbe4-FRA
		`);
	});

	it("should print http without the body by default", () => {
		expect(formatMeasurement(httpGet)).toMatchInlineSnapshot(`
			Measurement ID: 2WkcEkbEvXsFfNaww00321X49
			Type: http
			Target: google.com
			Status: finished
			Created: 2026-11-19T11:09:57.547Z
			Updated: 2026-11-19T11:09:57.726Z
			Locations: [{"magic":"world"}]
			Limit: 2
			Options: {"request":{"method":"GET"}}
			Probes: 2

			Headers same for all probes:
			Location: https://www.google.com/
			Content-Type: text/html; charset=UTF-8
			Date: Thu, 19 Nov 2026 11:09:57 GMT
			Expires: Sat, 19 Dec 2026 11:09:57 GMT
			Cache-Control: public, max-age=2592000
			Server: gws
			Content-Length: 220
			X-XSS-Protection: 0
			X-Frame-Options: SAMEORIGIN
			Alt-Svc: h3=":443"; ma=2592000,h3-29=":443"; ma=2592000
			Connection: close

			Probe 1: Falkenstein, DE, EU, Hetzner Online (AS24940), tags: datacenter-network
			Resolved IP: 142.251.127.101
			Timings: total 156 ms, dns 1 ms, tcp 7 ms, tls 22 ms, firstByte 126 ms, download 0 ms
			TLS: TLSv1.3, TLS_AES_256_GCM_SHA384, valid
			Certificate:
			- Subject: *.google.com
			- Alt names: DNS:*.google.com, DNS:*.admin.google.com, DNS:*.appengine.google.com, DNS:*.bdn.dev, DNS:*.origin-test.bdn.dev, DNS:*.cloud.google.com, DNS:*.crowdsource.google.com, DNS:*.datacompute.google.com, DNS:*.google.ca, DNS:*.google.cl, DNS:*.google.co.in, DNS:*.google.co.jp, DNS:*.google.co.uk, DNS:*.google.com.ar, DNS:*.google.com.au, DNS:*.google.com.br, DNS:*.google.com.co, DNS:*.google.com.mx, DNS:*.google.com.tr, DNS:*.google.com.vn, DNS:*.google.de, DNS:*.google.es, DNS:*.google.fr, DNS:*.google.hu, DNS:*.google.it, DNS:*.google.nl, DNS:*.google.pl, DNS:*.google.pt, DNS:*.gemini.cloud.google.com, DNS:*.gstatic.com, DNS:*.metric.gstatic.com, DNS:*.gvt1.com, DNS:*.gcpcdn.gvt1.com, DNS:*.gvt2.com, DNS:*.gcp.gvt2.com, DNS:*.url.google.com, DNS:*.youtube-nocookie.com, DNS:*.ytimg.com, DNS:ai.android, DNS:android.com, DNS:*.android.com, DNS:*.flash.android.com, DNS:g.co, DNS:*.g.co, DNS:goo.gl, DNS:www.goo.gl, DNS:google-analytics.com, DNS:*.google-analytics.com, DNS:google.com, DNS:googlecommerce.com, DNS:*.googlecommerce.com, DNS:urchin.com, DNS:*.urchin.com, DNS:youtu.be, DNS:youtube.com, DNS:*.youtube.com, DNS:music.youtube.com, DNS:*.music.youtube.com, DNS:youtubeeducation.com, DNS:*.youtubeeducation.com, DNS:youtubekids.com, DNS:*.youtubekids.com, DNS:yt.be, DNS:*.yt.be, DNS:android.clients.google.com, DNS:*.aistudio.google.com
			- Issuer: WE2, Google Trust Services, US
			- Dates: 2026-11-03T08:26:50.000Z to 2027-01-26T08:26:49.000Z
			- Key: EC 256 bits
			- Serial number: 53:10:12:51:08:7F:FC:43:09:F2:7D:0B:33:C2:02:AA
			- SHA-256 fingerprint: 2B:1E:9F:EC:6E:AD:F7:A8:70:AF:64:3F:92:4F:BB:95:2F:8C:C6:75:A9:3F:33:92:6C:5E:9B:39:2E:C5:74:F2
			- Public key: 04:DB:2E:F7:8B:FC:68:DF:C0:B5:BB:CB:0A:ED:95:BE:C7:07:FA:4B:9B:68:14:C9:88:B2:95:05:57:85:12:C3:DF:EF:97:EF:86:18:53:C2:00:71:AE:76:A2:F1:DE:79:95:22:36:A2:A0:12:BB:6A:8F:99:C3:29:BB:BE:01:51:61
			HTTP/1.1 301 Moved Permanently
			Content-Security-Policy-Report-Only: object-src 'none';base-uri 'self';script-src 'nonce-lc09yjC1OTBN8btuKydg3w' 'strict-dynamic' 'report-sample' 'unsafe-eval' 'unsafe-inline' https: http:;report-uri https://csp.withgoogle.com/csp/gws/other-hp
			Plus headers same for all probes (11), listed at the top.

			Probe 2: Helsinki, FI, EU, Hetzner Online (AS24940), tags: datacenter-network
			Resolved IP: 173.194.73.113
			Timings: total 26 ms, dns 1 ms, tcp 8 ms, tls 9 ms, firstByte 8 ms, download 0 ms
			TLS: same as probe 1
			HTTP/1.1 301 Moved Permanently
			Content-Security-Policy-Report-Only: object-src 'none';base-uri 'self';script-src 'nonce-HWDRRrLPkLKxjGY1zyMXLQ' 'strict-dynamic' 'report-sample' 'unsafe-eval' 'unsafe-inline' https: http:;report-uri https://csp.withgoogle.com/csp/gws/other-hp
			Plus headers same for all probes (11), listed at the top.
		`);
	});

	it("should print http with the body when output is full", () => {
		expect(formatMeasurement(httpGet, "full")).toMatchInlineSnapshot(`
			Measurement ID: 2WkcEkbEvXsFfNaww00321X49
			Type: http
			Target: google.com
			Status: finished
			Created: 2026-11-19T11:09:57.547Z
			Updated: 2026-11-19T11:09:57.726Z
			Locations: [{"magic":"world"}]
			Limit: 2
			Options: {"request":{"method":"GET"}}
			Probes: 2

			Headers same for all probes:
			Location: https://www.google.com/
			Content-Type: text/html; charset=UTF-8
			Date: Thu, 19 Nov 2026 11:09:57 GMT
			Expires: Sat, 19 Dec 2026 11:09:57 GMT
			Cache-Control: public, max-age=2592000
			Server: gws
			Content-Length: 220
			X-XSS-Protection: 0
			X-Frame-Options: SAMEORIGIN
			Alt-Svc: h3=":443"; ma=2592000,h3-29=":443"; ma=2592000
			Connection: close

			Probe 1: Falkenstein, DE, EU, Hetzner Online (AS24940), tags: datacenter-network
			Resolved IP: 142.251.127.101
			Timings: total 156 ms, dns 1 ms, tcp 7 ms, tls 22 ms, firstByte 126 ms, download 0 ms
			TLS: TLSv1.3, TLS_AES_256_GCM_SHA384, valid
			Certificate:
			- Subject: *.google.com
			- Alt names: DNS:*.google.com, DNS:*.admin.google.com, DNS:*.appengine.google.com, DNS:*.bdn.dev, DNS:*.origin-test.bdn.dev, DNS:*.cloud.google.com, DNS:*.crowdsource.google.com, DNS:*.datacompute.google.com, DNS:*.google.ca, DNS:*.google.cl, DNS:*.google.co.in, DNS:*.google.co.jp, DNS:*.google.co.uk, DNS:*.google.com.ar, DNS:*.google.com.au, DNS:*.google.com.br, DNS:*.google.com.co, DNS:*.google.com.mx, DNS:*.google.com.tr, DNS:*.google.com.vn, DNS:*.google.de, DNS:*.google.es, DNS:*.google.fr, DNS:*.google.hu, DNS:*.google.it, DNS:*.google.nl, DNS:*.google.pl, DNS:*.google.pt, DNS:*.gemini.cloud.google.com, DNS:*.gstatic.com, DNS:*.metric.gstatic.com, DNS:*.gvt1.com, DNS:*.gcpcdn.gvt1.com, DNS:*.gvt2.com, DNS:*.gcp.gvt2.com, DNS:*.url.google.com, DNS:*.youtube-nocookie.com, DNS:*.ytimg.com, DNS:ai.android, DNS:android.com, DNS:*.android.com, DNS:*.flash.android.com, DNS:g.co, DNS:*.g.co, DNS:goo.gl, DNS:www.goo.gl, DNS:google-analytics.com, DNS:*.google-analytics.com, DNS:google.com, DNS:googlecommerce.com, DNS:*.googlecommerce.com, DNS:urchin.com, DNS:*.urchin.com, DNS:youtu.be, DNS:youtube.com, DNS:*.youtube.com, DNS:music.youtube.com, DNS:*.music.youtube.com, DNS:youtubeeducation.com, DNS:*.youtubeeducation.com, DNS:youtubekids.com, DNS:*.youtubekids.com, DNS:yt.be, DNS:*.yt.be, DNS:android.clients.google.com, DNS:*.aistudio.google.com
			- Issuer: WE2, Google Trust Services, US
			- Dates: 2026-11-03T08:26:50.000Z to 2027-01-26T08:26:49.000Z
			- Key: EC 256 bits
			- Serial number: 53:10:12:51:08:7F:FC:43:09:F2:7D:0B:33:C2:02:AA
			- SHA-256 fingerprint: 2B:1E:9F:EC:6E:AD:F7:A8:70:AF:64:3F:92:4F:BB:95:2F:8C:C6:75:A9:3F:33:92:6C:5E:9B:39:2E:C5:74:F2
			- Public key: 04:DB:2E:F7:8B:FC:68:DF:C0:B5:BB:CB:0A:ED:95:BE:C7:07:FA:4B:9B:68:14:C9:88:B2:95:05:57:85:12:C3:DF:EF:97:EF:86:18:53:C2:00:71:AE:76:A2:F1:DE:79:95:22:36:A2:A0:12:BB:6A:8F:99:C3:29:BB:BE:01:51:61
			HTTP/1.1 301 Moved Permanently
			Content-Security-Policy-Report-Only: object-src 'none';base-uri 'self';script-src 'nonce-lc09yjC1OTBN8btuKydg3w' 'strict-dynamic' 'report-sample' 'unsafe-eval' 'unsafe-inline' https: http:;report-uri https://csp.withgoogle.com/csp/gws/other-hp
			Plus headers same for all probes (11), listed at the top.

			<HTML><HEAD><meta http-equiv="content-type" content="text/html;charset=utf-8">
			<TITLE>301 Moved</TITLE></HEAD><BODY>
			<H1>301 Moved</H1>
			The document has moved
			<A HREF="https://www.google.com/">here</A>.
			</BODY></HTML>


			Probe 2: Helsinki, FI, EU, Hetzner Online (AS24940), tags: datacenter-network
			Resolved IP: 173.194.73.113
			Timings: total 26 ms, dns 1 ms, tcp 8 ms, tls 9 ms, firstByte 8 ms, download 0 ms
			TLS: same as probe 1
			HTTP/1.1 301 Moved Permanently
			Content-Security-Policy-Report-Only: object-src 'none';base-uri 'self';script-src 'nonce-HWDRRrLPkLKxjGY1zyMXLQ' 'strict-dynamic' 'report-sample' 'unsafe-eval' 'unsafe-inline' https: http:;report-uri https://csp.withgoogle.com/csp/gws/other-hp
			Plus headers same for all probes (11), listed at the top.
			Body: same as probe 1
		`);
	});

	it("should print the headers of one finished probe under the probe", () => {
		const oneFinished = {
			...httpGet,
			results: [
				httpGet.results[0],
				{
					probe: httpGet.results[1].probe,
					result: {
						status: "failed",
						failureSource: "target",
						rawOutput: "Request timed out while establishing the TCP connection.",
					},
				},
			],
		};

		expect(formatMeasurement(oneFinished)).toMatchInlineSnapshot(`
			Measurement ID: 2WkcEkbEvXsFfNaww00321X49
			Type: http
			Target: google.com
			Status: finished
			Created: 2026-11-19T11:09:57.547Z
			Updated: 2026-11-19T11:09:57.726Z
			Locations: [{"magic":"world"}]
			Limit: 2
			Options: {"request":{"method":"GET"}}
			Probes: 2

			Probe 1: Falkenstein, DE, EU, Hetzner Online (AS24940), tags: datacenter-network
			Resolved IP: 142.251.127.101
			Timings: total 156 ms, dns 1 ms, tcp 7 ms, tls 22 ms, firstByte 126 ms, download 0 ms
			TLS: TLSv1.3, TLS_AES_256_GCM_SHA384, valid
			Certificate:
			- Subject: *.google.com
			- Alt names: DNS:*.google.com, DNS:*.admin.google.com, DNS:*.appengine.google.com, DNS:*.bdn.dev, DNS:*.origin-test.bdn.dev, DNS:*.cloud.google.com, DNS:*.crowdsource.google.com, DNS:*.datacompute.google.com, DNS:*.google.ca, DNS:*.google.cl, DNS:*.google.co.in, DNS:*.google.co.jp, DNS:*.google.co.uk, DNS:*.google.com.ar, DNS:*.google.com.au, DNS:*.google.com.br, DNS:*.google.com.co, DNS:*.google.com.mx, DNS:*.google.com.tr, DNS:*.google.com.vn, DNS:*.google.de, DNS:*.google.es, DNS:*.google.fr, DNS:*.google.hu, DNS:*.google.it, DNS:*.google.nl, DNS:*.google.pl, DNS:*.google.pt, DNS:*.gemini.cloud.google.com, DNS:*.gstatic.com, DNS:*.metric.gstatic.com, DNS:*.gvt1.com, DNS:*.gcpcdn.gvt1.com, DNS:*.gvt2.com, DNS:*.gcp.gvt2.com, DNS:*.url.google.com, DNS:*.youtube-nocookie.com, DNS:*.ytimg.com, DNS:ai.android, DNS:android.com, DNS:*.android.com, DNS:*.flash.android.com, DNS:g.co, DNS:*.g.co, DNS:goo.gl, DNS:www.goo.gl, DNS:google-analytics.com, DNS:*.google-analytics.com, DNS:google.com, DNS:googlecommerce.com, DNS:*.googlecommerce.com, DNS:urchin.com, DNS:*.urchin.com, DNS:youtu.be, DNS:youtube.com, DNS:*.youtube.com, DNS:music.youtube.com, DNS:*.music.youtube.com, DNS:youtubeeducation.com, DNS:*.youtubeeducation.com, DNS:youtubekids.com, DNS:*.youtubekids.com, DNS:yt.be, DNS:*.yt.be, DNS:android.clients.google.com, DNS:*.aistudio.google.com
			- Issuer: WE2, Google Trust Services, US
			- Dates: 2026-11-03T08:26:50.000Z to 2027-01-26T08:26:49.000Z
			- Key: EC 256 bits
			- Serial number: 53:10:12:51:08:7F:FC:43:09:F2:7D:0B:33:C2:02:AA
			- SHA-256 fingerprint: 2B:1E:9F:EC:6E:AD:F7:A8:70:AF:64:3F:92:4F:BB:95:2F:8C:C6:75:A9:3F:33:92:6C:5E:9B:39:2E:C5:74:F2
			- Public key: 04:DB:2E:F7:8B:FC:68:DF:C0:B5:BB:CB:0A:ED:95:BE:C7:07:FA:4B:9B:68:14:C9:88:B2:95:05:57:85:12:C3:DF:EF:97:EF:86:18:53:C2:00:71:AE:76:A2:F1:DE:79:95:22:36:A2:A0:12:BB:6A:8F:99:C3:29:BB:BE:01:51:61
			HTTP/1.1 301 Moved Permanently
			Location: https://www.google.com/
			Content-Type: text/html; charset=UTF-8
			Content-Security-Policy-Report-Only: object-src 'none';base-uri 'self';script-src 'nonce-lc09yjC1OTBN8btuKydg3w' 'strict-dynamic' 'report-sample' 'unsafe-eval' 'unsafe-inline' https: http:;report-uri https://csp.withgoogle.com/csp/gws/other-hp
			Date: Thu, 19 Nov 2026 11:09:57 GMT
			Expires: Sat, 19 Dec 2026 11:09:57 GMT
			Cache-Control: public, max-age=2592000
			Server: gws
			Content-Length: 220
			X-XSS-Protection: 0
			X-Frame-Options: SAMEORIGIN
			Alt-Svc: h3=":443"; ma=2592000,h3-29=":443"; ma=2592000
			Connection: close

			Probe 2: Helsinki, FI, EU, Hetzner Online (AS24940), tags: datacenter-network
			Status: failed (target)
			Request timed out while establishing the TCP connection.
		`);
	});

	it("should print every body that is different", () => {
		const differentBodies = {
			...httpGet,
			results: [
				httpGet.results[0],
				{
					probe: httpGet.results[1].probe,
					result: { ...httpGet.results[1].result, rawBody: "Another body" },
				},
			],
		};

		expect(formatMeasurement(differentBodies, "full")).toMatchInlineSnapshot(`
			Measurement ID: 2WkcEkbEvXsFfNaww00321X49
			Type: http
			Target: google.com
			Status: finished
			Created: 2026-11-19T11:09:57.547Z
			Updated: 2026-11-19T11:09:57.726Z
			Locations: [{"magic":"world"}]
			Limit: 2
			Options: {"request":{"method":"GET"}}
			Probes: 2

			Headers same for all probes:
			Location: https://www.google.com/
			Content-Type: text/html; charset=UTF-8
			Date: Thu, 19 Nov 2026 11:09:57 GMT
			Expires: Sat, 19 Dec 2026 11:09:57 GMT
			Cache-Control: public, max-age=2592000
			Server: gws
			Content-Length: 220
			X-XSS-Protection: 0
			X-Frame-Options: SAMEORIGIN
			Alt-Svc: h3=":443"; ma=2592000,h3-29=":443"; ma=2592000
			Connection: close

			Probe 1: Falkenstein, DE, EU, Hetzner Online (AS24940), tags: datacenter-network
			Resolved IP: 142.251.127.101
			Timings: total 156 ms, dns 1 ms, tcp 7 ms, tls 22 ms, firstByte 126 ms, download 0 ms
			TLS: TLSv1.3, TLS_AES_256_GCM_SHA384, valid
			Certificate:
			- Subject: *.google.com
			- Alt names: DNS:*.google.com, DNS:*.admin.google.com, DNS:*.appengine.google.com, DNS:*.bdn.dev, DNS:*.origin-test.bdn.dev, DNS:*.cloud.google.com, DNS:*.crowdsource.google.com, DNS:*.datacompute.google.com, DNS:*.google.ca, DNS:*.google.cl, DNS:*.google.co.in, DNS:*.google.co.jp, DNS:*.google.co.uk, DNS:*.google.com.ar, DNS:*.google.com.au, DNS:*.google.com.br, DNS:*.google.com.co, DNS:*.google.com.mx, DNS:*.google.com.tr, DNS:*.google.com.vn, DNS:*.google.de, DNS:*.google.es, DNS:*.google.fr, DNS:*.google.hu, DNS:*.google.it, DNS:*.google.nl, DNS:*.google.pl, DNS:*.google.pt, DNS:*.gemini.cloud.google.com, DNS:*.gstatic.com, DNS:*.metric.gstatic.com, DNS:*.gvt1.com, DNS:*.gcpcdn.gvt1.com, DNS:*.gvt2.com, DNS:*.gcp.gvt2.com, DNS:*.url.google.com, DNS:*.youtube-nocookie.com, DNS:*.ytimg.com, DNS:ai.android, DNS:android.com, DNS:*.android.com, DNS:*.flash.android.com, DNS:g.co, DNS:*.g.co, DNS:goo.gl, DNS:www.goo.gl, DNS:google-analytics.com, DNS:*.google-analytics.com, DNS:google.com, DNS:googlecommerce.com, DNS:*.googlecommerce.com, DNS:urchin.com, DNS:*.urchin.com, DNS:youtu.be, DNS:youtube.com, DNS:*.youtube.com, DNS:music.youtube.com, DNS:*.music.youtube.com, DNS:youtubeeducation.com, DNS:*.youtubeeducation.com, DNS:youtubekids.com, DNS:*.youtubekids.com, DNS:yt.be, DNS:*.yt.be, DNS:android.clients.google.com, DNS:*.aistudio.google.com
			- Issuer: WE2, Google Trust Services, US
			- Dates: 2026-11-03T08:26:50.000Z to 2027-01-26T08:26:49.000Z
			- Key: EC 256 bits
			- Serial number: 53:10:12:51:08:7F:FC:43:09:F2:7D:0B:33:C2:02:AA
			- SHA-256 fingerprint: 2B:1E:9F:EC:6E:AD:F7:A8:70:AF:64:3F:92:4F:BB:95:2F:8C:C6:75:A9:3F:33:92:6C:5E:9B:39:2E:C5:74:F2
			- Public key: 04:DB:2E:F7:8B:FC:68:DF:C0:B5:BB:CB:0A:ED:95:BE:C7:07:FA:4B:9B:68:14:C9:88:B2:95:05:57:85:12:C3:DF:EF:97:EF:86:18:53:C2:00:71:AE:76:A2:F1:DE:79:95:22:36:A2:A0:12:BB:6A:8F:99:C3:29:BB:BE:01:51:61
			HTTP/1.1 301 Moved Permanently
			Content-Security-Policy-Report-Only: object-src 'none';base-uri 'self';script-src 'nonce-lc09yjC1OTBN8btuKydg3w' 'strict-dynamic' 'report-sample' 'unsafe-eval' 'unsafe-inline' https: http:;report-uri https://csp.withgoogle.com/csp/gws/other-hp
			Plus headers same for all probes (11), listed at the top.

			<HTML><HEAD><meta http-equiv="content-type" content="text/html;charset=utf-8">
			<TITLE>301 Moved</TITLE></HEAD><BODY>
			<H1>301 Moved</H1>
			The document has moved
			<A HREF="https://www.google.com/">here</A>.
			</BODY></HTML>


			Probe 2: Helsinki, FI, EU, Hetzner Online (AS24940), tags: datacenter-network
			Resolved IP: 173.194.73.113
			Timings: total 26 ms, dns 1 ms, tcp 8 ms, tls 9 ms, firstByte 8 ms, download 0 ms
			TLS: same as probe 1
			HTTP/1.1 301 Moved Permanently
			Content-Security-Policy-Report-Only: object-src 'none';base-uri 'self';script-src 'nonce-HWDRRrLPkLKxjGY1zyMXLQ' 'strict-dynamic' 'report-sample' 'unsafe-eval' 'unsafe-inline' https: http:;report-uri https://csp.withgoogle.com/csp/gws/other-hp
			Plus headers same for all probes (11), listed at the top.

			Another body
		`);
	});

	it("should print other types in full when output is headers", () => {
		expect(formatMeasurement(ping, "headers")).toBe(formatMeasurement(ping, "full"));
	});

	it("should say that the response is truncated", () => {
		const truncated = {
			...http,
			probesCount: 1,
			results: [
				{ ...http.results[0], result: { ...http.results[0].result, truncated: true } },
			],
		};

		expect(formatMeasurement(truncated, "full")).toMatchInlineSnapshot(`
			Measurement ID: 2P4xQQKCD6c75fZM200321Wl5
			Type: http
			Target: google.com
			Status: finished
			Created: 2026-11-18T15:27:48.383Z
			Updated: 2026-11-18T15:27:48.676Z
			Locations: [{"magic":"world"}]
			Limit: 2
			Probes: 1

			Probe 1: Helsinki, FI, EU, Hetzner Online (AS24940), tags: datacenter-network, u-V8AA
			Resolved IP: 172.217.22.110
			Timings: total 208 ms, dns 51 ms, tcp 45 ms, tls 56 ms, firstByte 56 ms, download 0 ms
			TLS: TLSv1.3, TLS_AES_256_GCM_SHA384, valid
			Certificate:
			- Subject: *.google.com
			- Alt names: DNS:*.google.com, DNS:*.admin.google.com, DNS:*.appengine.google.com, DNS:*.bdn.dev, DNS:*.origin-test.bdn.dev, DNS:*.cloud.google.com, DNS:*.crowdsource.google.com, DNS:*.datacompute.google.com, DNS:*.google.ca, DNS:*.google.cl, DNS:*.google.co.in, DNS:*.google.co.jp, DNS:*.google.co.uk, DNS:*.google.com.ar, DNS:*.google.com.au, DNS:*.google.com.br, DNS:*.google.com.co, DNS:*.google.com.mx, DNS:*.google.com.tr, DNS:*.google.com.vn, DNS:*.google.de, DNS:*.google.es, DNS:*.google.fr, DNS:*.google.hu, DNS:*.google.it, DNS:*.google.nl, DNS:*.google.pl, DNS:*.google.pt, DNS:*.gemini.cloud.google.com, DNS:*.gstatic.com, DNS:*.metric.gstatic.com, DNS:*.gvt1.com, DNS:*.gcpcdn.gvt1.com, DNS:*.gvt2.com, DNS:*.gcp.gvt2.com, DNS:*.url.google.com, DNS:*.youtube-nocookie.com, DNS:*.ytimg.com, DNS:ai.android, DNS:android.com, DNS:*.android.com, DNS:*.flash.android.com, DNS:g.co, DNS:*.g.co, DNS:goo.gl, DNS:www.goo.gl, DNS:google-analytics.com, DNS:*.google-analytics.com, DNS:google.com, DNS:googlecommerce.com, DNS:*.googlecommerce.com, DNS:urchin.com, DNS:*.urchin.com, DNS:youtu.be, DNS:youtube.com, DNS:*.youtube.com, DNS:music.youtube.com, DNS:*.music.youtube.com, DNS:youtubeeducation.com, DNS:*.youtubeeducation.com, DNS:youtubekids.com, DNS:*.youtubekids.com, DNS:yt.be, DNS:*.yt.be, DNS:android.clients.google.com, DNS:*.aistudio.google.com
			- Issuer: WE2, Google Trust Services, US
			- Dates: 2026-11-03T08:26:50.000Z to 2027-01-26T08:26:49.000Z
			- Key: EC 256 bits
			- Serial number: 53:10:12:51:08:7F:FC:43:09:F2:7D:0B:33:C2:02:AA
			- SHA-256 fingerprint: 2B:1E:9F:EC:6E:AD:F7:A8:70:AF:64:3F:92:4F:BB:95:2F:8C:C6:75:A9:3F:33:92:6C:5E:9B:39:2E:C5:74:F2
			- Public key: 04:DB:2E:F7:8B:FC:68:DF:C0:B5:BB:CB:0A:ED:95:BE:C7:07:FA:4B:9B:68:14:C9:88:B2:95:05:57:85:12:C3:DF:EF:97:EF:86:18:53:C2:00:71:AE:76:A2:F1:DE:79:95:22:36:A2:A0:12:BB:6A:8F:99:C3:29:BB:BE:01:51:61
			HTTP/1.1 301 Moved Permanently
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
			The response is truncated.
		`);
	});

	it("should say that the response is truncated for a probe with the same body", () => {
		const truncated = {
			...httpGet,
			results: httpGet.results.map(({ probe, result }) => ({
				probe,
				result: { ...result, rawBody: httpGet.results[0].result.rawBody, truncated: true },
			})),
		};

		expect(formatMeasurement(truncated, "full")).toMatchInlineSnapshot(`
			Measurement ID: 2WkcEkbEvXsFfNaww00321X49
			Type: http
			Target: google.com
			Status: finished
			Created: 2026-11-19T11:09:57.547Z
			Updated: 2026-11-19T11:09:57.726Z
			Locations: [{"magic":"world"}]
			Limit: 2
			Options: {"request":{"method":"GET"}}
			Probes: 2

			Headers same for all probes:
			Location: https://www.google.com/
			Content-Type: text/html; charset=UTF-8
			Date: Thu, 19 Nov 2026 11:09:57 GMT
			Expires: Sat, 19 Dec 2026 11:09:57 GMT
			Cache-Control: public, max-age=2592000
			Server: gws
			Content-Length: 220
			X-XSS-Protection: 0
			X-Frame-Options: SAMEORIGIN
			Alt-Svc: h3=":443"; ma=2592000,h3-29=":443"; ma=2592000
			Connection: close

			Probe 1: Falkenstein, DE, EU, Hetzner Online (AS24940), tags: datacenter-network
			Resolved IP: 142.251.127.101
			Timings: total 156 ms, dns 1 ms, tcp 7 ms, tls 22 ms, firstByte 126 ms, download 0 ms
			TLS: TLSv1.3, TLS_AES_256_GCM_SHA384, valid
			Certificate:
			- Subject: *.google.com
			- Alt names: DNS:*.google.com, DNS:*.admin.google.com, DNS:*.appengine.google.com, DNS:*.bdn.dev, DNS:*.origin-test.bdn.dev, DNS:*.cloud.google.com, DNS:*.crowdsource.google.com, DNS:*.datacompute.google.com, DNS:*.google.ca, DNS:*.google.cl, DNS:*.google.co.in, DNS:*.google.co.jp, DNS:*.google.co.uk, DNS:*.google.com.ar, DNS:*.google.com.au, DNS:*.google.com.br, DNS:*.google.com.co, DNS:*.google.com.mx, DNS:*.google.com.tr, DNS:*.google.com.vn, DNS:*.google.de, DNS:*.google.es, DNS:*.google.fr, DNS:*.google.hu, DNS:*.google.it, DNS:*.google.nl, DNS:*.google.pl, DNS:*.google.pt, DNS:*.gemini.cloud.google.com, DNS:*.gstatic.com, DNS:*.metric.gstatic.com, DNS:*.gvt1.com, DNS:*.gcpcdn.gvt1.com, DNS:*.gvt2.com, DNS:*.gcp.gvt2.com, DNS:*.url.google.com, DNS:*.youtube-nocookie.com, DNS:*.ytimg.com, DNS:ai.android, DNS:android.com, DNS:*.android.com, DNS:*.flash.android.com, DNS:g.co, DNS:*.g.co, DNS:goo.gl, DNS:www.goo.gl, DNS:google-analytics.com, DNS:*.google-analytics.com, DNS:google.com, DNS:googlecommerce.com, DNS:*.googlecommerce.com, DNS:urchin.com, DNS:*.urchin.com, DNS:youtu.be, DNS:youtube.com, DNS:*.youtube.com, DNS:music.youtube.com, DNS:*.music.youtube.com, DNS:youtubeeducation.com, DNS:*.youtubeeducation.com, DNS:youtubekids.com, DNS:*.youtubekids.com, DNS:yt.be, DNS:*.yt.be, DNS:android.clients.google.com, DNS:*.aistudio.google.com
			- Issuer: WE2, Google Trust Services, US
			- Dates: 2026-11-03T08:26:50.000Z to 2027-01-26T08:26:49.000Z
			- Key: EC 256 bits
			- Serial number: 53:10:12:51:08:7F:FC:43:09:F2:7D:0B:33:C2:02:AA
			- SHA-256 fingerprint: 2B:1E:9F:EC:6E:AD:F7:A8:70:AF:64:3F:92:4F:BB:95:2F:8C:C6:75:A9:3F:33:92:6C:5E:9B:39:2E:C5:74:F2
			- Public key: 04:DB:2E:F7:8B:FC:68:DF:C0:B5:BB:CB:0A:ED:95:BE:C7:07:FA:4B:9B:68:14:C9:88:B2:95:05:57:85:12:C3:DF:EF:97:EF:86:18:53:C2:00:71:AE:76:A2:F1:DE:79:95:22:36:A2:A0:12:BB:6A:8F:99:C3:29:BB:BE:01:51:61
			HTTP/1.1 301 Moved Permanently
			Content-Security-Policy-Report-Only: object-src 'none';base-uri 'self';script-src 'nonce-lc09yjC1OTBN8btuKydg3w' 'strict-dynamic' 'report-sample' 'unsafe-eval' 'unsafe-inline' https: http:;report-uri https://csp.withgoogle.com/csp/gws/other-hp
			Plus headers same for all probes (11), listed at the top.

			<HTML><HEAD><meta http-equiv="content-type" content="text/html;charset=utf-8">
			<TITLE>301 Moved</TITLE></HEAD><BODY>
			<H1>301 Moved</H1>
			The document has moved
			<A HREF="https://www.google.com/">here</A>.
			</BODY></HTML>

			The response is truncated.

			Probe 2: Helsinki, FI, EU, Hetzner Online (AS24940), tags: datacenter-network
			Resolved IP: 173.194.73.113
			Timings: total 26 ms, dns 1 ms, tcp 8 ms, tls 9 ms, firstByte 8 ms, download 0 ms
			TLS: same as probe 1
			HTTP/1.1 301 Moved Permanently
			Content-Security-Policy-Report-Only: object-src 'none';base-uri 'self';script-src 'nonce-HWDRRrLPkLKxjGY1zyMXLQ' 'strict-dynamic' 'report-sample' 'unsafe-eval' 'unsafe-inline' https: http:;report-uri https://csp.withgoogle.com/csp/gws/other-hp
			Plus headers same for all probes (11), listed at the top.
			Body: same as probe 1
			The response is truncated.
		`);
	});

	it("should print the resolved IP and timings of an http probe that failed", () => {
		expect(formatMeasurement(httpFailed)).toMatchInlineSnapshot(`
			Measurement ID: 24zraPDxnRUybW5of00321XX5
			Type: http
			Target: example.com
			Status: finished
			Created: 2026-11-20T17:03:34.093Z
			Updated: 2026-11-20T17:03:49.138Z
			Locations: [{"magic":"Europe"}]
			Options: {"port":81,"request":{"method":"GET"}}
			Probes: 1

			Probe 1: Helsinki, FI, EU, Hetzner Online (AS24940), tags: datacenter-network
			Status: failed (target)
			Resolved IP: 104.20.23.154
			Timings: total 15001 ms, dns 1 ms, tcp N/A, tls N/A, firstByte N/A, download N/A
			Request timed out while establishing the TCP connection.
		`);
	});

	it("should print the same TLS of http probes that failed only once", () => {
		const failed = {
			...http,
			results: http.results.map(({ probe, result }) => ({
				probe,
				result: {
					...result,
					status: "failed",
					failureSource: "target",
					rawBody: null,
					rawOutput: "Request timed out while downloading the response.",
				},
			})),
		};

		expect(formatMeasurement(failed)).toMatchInlineSnapshot(`
			Measurement ID: 2P4xQQKCD6c75fZM200321Wl5
			Type: http
			Target: google.com
			Status: finished
			Created: 2026-11-18T15:27:48.383Z
			Updated: 2026-11-18T15:27:48.676Z
			Locations: [{"magic":"world"}]
			Limit: 2
			Probes: 2

			Probe 1: Helsinki, FI, EU, Hetzner Online (AS24940), tags: datacenter-network, u-V8AA
			Status: failed (target)
			Resolved IP: 172.217.22.110
			Timings: total 208 ms, dns 51 ms, tcp 45 ms, tls 56 ms, firstByte 56 ms, download 0 ms
			TLS: TLSv1.3, TLS_AES_256_GCM_SHA384, valid
			Certificate:
			- Subject: *.google.com
			- Alt names: DNS:*.google.com, DNS:*.admin.google.com, DNS:*.appengine.google.com, DNS:*.bdn.dev, DNS:*.origin-test.bdn.dev, DNS:*.cloud.google.com, DNS:*.crowdsource.google.com, DNS:*.datacompute.google.com, DNS:*.google.ca, DNS:*.google.cl, DNS:*.google.co.in, DNS:*.google.co.jp, DNS:*.google.co.uk, DNS:*.google.com.ar, DNS:*.google.com.au, DNS:*.google.com.br, DNS:*.google.com.co, DNS:*.google.com.mx, DNS:*.google.com.tr, DNS:*.google.com.vn, DNS:*.google.de, DNS:*.google.es, DNS:*.google.fr, DNS:*.google.hu, DNS:*.google.it, DNS:*.google.nl, DNS:*.google.pl, DNS:*.google.pt, DNS:*.gemini.cloud.google.com, DNS:*.gstatic.com, DNS:*.metric.gstatic.com, DNS:*.gvt1.com, DNS:*.gcpcdn.gvt1.com, DNS:*.gvt2.com, DNS:*.gcp.gvt2.com, DNS:*.url.google.com, DNS:*.youtube-nocookie.com, DNS:*.ytimg.com, DNS:ai.android, DNS:android.com, DNS:*.android.com, DNS:*.flash.android.com, DNS:g.co, DNS:*.g.co, DNS:goo.gl, DNS:www.goo.gl, DNS:google-analytics.com, DNS:*.google-analytics.com, DNS:google.com, DNS:googlecommerce.com, DNS:*.googlecommerce.com, DNS:urchin.com, DNS:*.urchin.com, DNS:youtu.be, DNS:youtube.com, DNS:*.youtube.com, DNS:music.youtube.com, DNS:*.music.youtube.com, DNS:youtubeeducation.com, DNS:*.youtubeeducation.com, DNS:youtubekids.com, DNS:*.youtubekids.com, DNS:yt.be, DNS:*.yt.be, DNS:android.clients.google.com, DNS:*.aistudio.google.com
			- Issuer: WE2, Google Trust Services, US
			- Dates: 2026-11-03T08:26:50.000Z to 2027-01-26T08:26:49.000Z
			- Key: EC 256 bits
			- Serial number: 53:10:12:51:08:7F:FC:43:09:F2:7D:0B:33:C2:02:AA
			- SHA-256 fingerprint: 2B:1E:9F:EC:6E:AD:F7:A8:70:AF:64:3F:92:4F:BB:95:2F:8C:C6:75:A9:3F:33:92:6C:5E:9B:39:2E:C5:74:F2
			- Public key: 04:DB:2E:F7:8B:FC:68:DF:C0:B5:BB:CB:0A:ED:95:BE:C7:07:FA:4B:9B:68:14:C9:88:B2:95:05:57:85:12:C3:DF:EF:97:EF:86:18:53:C2:00:71:AE:76:A2:F1:DE:79:95:22:36:A2:A0:12:BB:6A:8F:99:C3:29:BB:BE:01:51:61
			Request timed out while downloading the response.

			Probe 2: Falkenstein, DE, EU, Hetzner Online (AS24940), tags: datacenter-network
			Status: failed (target)
			Resolved IP: 142.251.110.101
			Timings: total 63 ms, dns 2 ms, tcp 6 ms, tls 21 ms, firstByte 34 ms, download 0 ms
			TLS: same as probe 1
			Request timed out while downloading the response.
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

			Ping Results:
			- Successful Probes: 0/2

			Probe 1: Helsinki, FI, EU, Hetzner Online (AS24940), tags: datacenter-network, u-Lusitaniae
			Status: failed (target)
			queryA ENOTFOUND nonexistent.google.com

			Probe 2: Falkenstein, DE, EU, Hetzner Online (AS24940), tags: datacenter-network, u-dominhhieu1405
			Status: failed (target)
			queryA ENOTFOUND nonexistent.google.com
		`);
	});

	it("should not count probes that failed for a reason other than the target", () => {
		expect(formatMeasurement(pingResolverFailed)).toMatchInlineSnapshot(`
			Measurement ID: 2CbzBns1VzVs8U55q00321ZNs
			Type: ping
			Target: dnssec-failed.org
			Status: finished
			Created: 2026-11-25T15:40:50.559Z
			Updated: 2026-11-25T15:40:56.794Z
			Locations: [{"magic":"world"}]
			Limit: 20
			Probes: 3

			Ping Results:
			- Successful Probes: 1/1
			- Excluded Probes: 2 (resolver error: 2)
			- Total Packets: 3
			- Received: 0
			- Dropped: 3
			- Average Loss: 100.00%

			Probe 1: Falkenstein, DE, EU, Hetzner Online (AS24940), tags: datacenter-network
			Status: failed (resolver)
			queryA ESERVFAIL dnssec-failed.org

			Probe 2: Helsinki, FI, EU, Hetzner Online (AS24940), tags: datacenter-network, u-alfredjophy
			Status: failed (resolver)
			queryA ESERVFAIL dnssec-failed.org

			Probe 3: Lauterbourg, FR, EU, Contabo (AS51167), tags: datacenter-network, u-herr-nandez
			Resolved IP: 96.99.227.255
			Packets: 3 sent, 0 received, 3 lost (100%)
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

		expect(formatMeasurement(measurement)).toMatchInlineSnapshot(`
			Measurement ID: 2Ip3lgjB734k2LqT200321Wl5
			Type: ping
			Target: nonexistent.google.com
			Status: in-progress
			Created: 2026-11-18T15:27:48.584Z
			Updated: 2026-11-18T15:27:48.667Z
			Locations: [{"magic":"world"}]
			Limit: 2
			Probes: 2

			Ping Results:
			- Successful Probes: 0/2

			Probe 1: Helsinki, FI, EU, Hetzner Online (AS24940), tags: datacenter-network, u-Lusitaniae
			Status: in-progress

			Probe 2: Falkenstein, DE, EU, Hetzner Online (AS24940), tags: datacenter-network, u-dominhhieu1405
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

			Ping Results:
			- Successful Probes: 0/0
			- Excluded Probes: 1 (offline: 1)

			Probe 1: Falkenstein, DE, EU, Hetzner Online (AS24940), tags: datacenter-network, u-kneuper-it
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

				Ping Results:
				- Successful Probes: 2/2
				- Total Packets: 6
				- Received: 6
				- Dropped: 0
				- Average Loss: 0.00%
				- Min RTT: 3.20 ms
				- Avg RTT: 4.33 ms
				- Max RTT: 5.45 ms

				Results, one line per probe:
				1: Falkenstein, DE, EU, Hetzner Online (AS24940) | IP 142.250.154.113, 0/3 lost (0%), rtt min/avg/max 5.142/5.294/5.45 ms
				2: Helsinki, FI, EU, Hetzner Online (AS24940) | IP 173.194.221.102, 0/3 lost (0%), rtt min/avg/max 3.199/3.375/3.534 ms

				For details call getMeasurement with "probes" and output "full".
			`);
		});

		it("should summarize ping that lost all packets", () => {
			expect(formatMeasurement(pingLost, "summary")).toMatchInlineSnapshot(`
				Measurement ID: 2455mfQeJyZvnKyNt00321XS7
				Type: ping
				Target: amazon.com
				Status: finished
				Created: 2026-11-20T11:55:32.610Z
				Updated: 2026-11-20T11:55:41.248Z
				Locations: [{"magic":"Hetzner"}]
				Limit: 3
				Options: {"packets":8}
				Probes: 1

				Ping Results:
				- Successful Probes: 1/1
				- Total Packets: 8
				- Received: 0
				- Dropped: 8
				- Average Loss: 100.00%

				Results, one line per probe:
				1: Falkenstein, DE, EU, Hetzner Online (AS24940) | IP 98.82.161.185, 8/8 lost (100%)

				For details call getMeasurement with "probes" and output "full".
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

				Results, one line per probe:
				1: Helsinki, FI, EU, Hetzner Online (AS24940) | 5 hops, target 64.233.163.113 reached, rtt 2.983 ms
				2: Falkenstein, DE, EU, Hetzner Online (AS24940) | 17 hops, target 142.251.14.102 reached, rtt 5.415 ms

				For details call getMeasurement with "probes" and output "full".
			`);
		});

		it("should summarize traceroute without a reply from the target", () => {
			expect(formatMeasurement(tracerouteNoReply, "summary")).toMatchInlineSnapshot(`
				Measurement ID: 2Y2qmgd1qDGtRGxJM00321X5p
				Type: traceroute
				Target: 8.8.8.9
				Status: finished
				Created: 2026-11-19T12:53:56.258Z
				Updated: 2026-11-19T12:54:05.488Z
				Locations: [{"magic":"world"}]
				Limit: 2
				Probes: 2

				Results, one line per probe:
				1: Falkenstein, DE, EU, Hetzner Online (AS24940) | 20 hops, no reply from target, last reply from 213.239.224.78 on hop 8, rtt 6.932 ms
				2: Helsinki, FI, EU, Hetzner Online (AS24940) | 20 hops, no reply from target, last reply from 213.239.224.25 on hop 7, rtt 1.431 ms

				For details call getMeasurement with "probes" and output "full".
			`);
		});

		it("should summarize traceroute that ends at a router, not at the target", () => {
			expect(formatMeasurement(tracerouteHopLimit, "summary")).toMatchInlineSnapshot(`
				Measurement ID: 2PIzPEd20eFYYef7e00321XXB
				Type: traceroute
				Target: www.usp.br
				Status: finished
				Created: 2026-11-20T17:09:55.610Z
				Updated: 2026-11-20T17:10:10.817Z
				Locations: [{"magic":"world"}]
				Limit: 25
				Probes: 2

				Results, one line per probe:
				1: Los Angeles (CA), US, NA, HostPapa (AS36352) | 20 hops, no reply from target, last reply from 143.107.151.62 on hop 20, rtt 180.984 ms
				2: Tokyo, JP, AS, xTom (AS3258) | 20 hops, no reply from target, last reply from 199.100.13.162 on hop 20, rtt 279.995 ms

				For details call getMeasurement with "probes" and output "full".
			`);
		});

		it("should summarize traceroute with two addresses on the last hop that replied", () => {
			expect(formatMeasurement(tracerouteTwoAddresses, "summary")).toMatchInlineSnapshot(`
				Measurement ID: 2XZNMQDZ5yrN4jhBX00321ZOF
				Type: traceroute
				Target: amazon.com
				Status: finished
				Created: 2026-11-25T16:03:01.435Z
				Updated: 2026-11-25T16:03:12.209Z
				Locations: [{"magic":"world"}]
				Limit: 50
				Probes: 1

				Results, one line per probe:
				1: Tokyo, JP, AS, Amazon.com (AS16509) | 20 hops, no reply from target, last reply from 242.7.160.141 on hop 7, rtt 151.922 ms

				For details call getMeasurement with "probes" and output "full".
			`);
		});

		it("should summarize traceroute without a reply from any hop", () => {
			expect(formatMeasurement(tracerouteNoReplies, "summary")).toMatchInlineSnapshot(`
				Measurement ID: 21pG9dmGygyGfggcP00321XRz
				Type: traceroute
				Target: fastly.com
				Status: finished
				Created: 2026-11-20T11:47:17.425Z
				Updated: 2026-11-20T11:47:27.068Z
				Locations: [{"magic":"Tokyo"}]
				Limit: 50
				Options: {"protocol":"UDP","port":443}
				Probes: 1

				Results, one line per probe:
				1: Tokyo, JP, AS, ZOUTER (AS205548) | 20 hops, no replies

				For details call getMeasurement with "probes" and output "full".
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

				Results, one line per probe:
				1: Falkenstein, DE, EU, Hetzner Online (AS24940) | 13 hops, target 142.250.154.101 reached, loss 0%, rtt 5.3 ms
				2: Helsinki, FI, EU, Hetzner Online (AS24940) | 9 hops, target 64.233.161.139 reached, loss 0%, rtt 3.3 ms

				For details call getMeasurement with "probes" and output "full".
			`);
		});

		it("should summarize mtr without a reply from the target", () => {
			expect(formatMeasurement(mtrNoReply, "summary")).toMatchInlineSnapshot(`
				Measurement ID: 2mlumuc7i3j4ZmbHH00321X5p
				Type: mtr
				Target: 8.8.8.9
				Status: finished
				Created: 2026-11-19T12:53:56.797Z
				Updated: 2026-11-19T12:54:03.577Z
				Locations: [{"magic":"world"}]
				Limit: 2
				Probes: 2

				Results, one line per probe:
				1: Helsinki, FI, EU, Hetzner Online (AS24940) | 9 hops, no reply from target, last reply from 142.250.225.39 on hop 8, loss 0%, rtt 2 ms
				2: Falkenstein, DE, EU, Hetzner Online (AS24940) | 9 hops, no reply from target, last reply from 213.239.224.10 on hop 8, loss 0%, rtt 5.4 ms

				For details call getMeasurement with "probes" and output "full".
			`);
		});

		it("should summarize mtr without a reply from any hop", () => {
			expect(formatMeasurement(mtrNoReplies, "summary")).toMatchInlineSnapshot(`
				Measurement ID: 27i0HTDRJKYV9ZSMe00321XRv
				Type: mtr
				Target: www.jsdelivr.com
				Status: finished
				Created: 2026-11-20T11:43:54.271Z
				Updated: 2026-11-20T11:44:00.438Z
				Locations: [{"magic":"London"}]
				Limit: 50
				Options: {"protocol":"UDP","packets":1}
				Probes: 1

				Results, one line per probe:
				1: London, GB, EU, FIBRENEST (AS204731) | 1 hops, no replies

				For details call getMeasurement with "probes" and output "full".
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

				Results, one line per probe:
				1: Helsinki, FI, EU, Hetzner Online (AS24940) | NOERROR, A 74.125.205.101, 74.125.205.139, 74.125.205.102, 74.125.205.138, 74.125.205.113, 74.125.205.100, total 0 ms
				2: Falkenstein, DE, EU, Hetzner Online (AS24940) | NOERROR, A 142.251.127.113, 142.251.127.138, 142.251.127.101, 142.251.127.102, 142.251.127.139, 142.251.127.100, total 0 ms

				For details call getMeasurement with "probes" and output "full".
			`);
		});

		it("should cut a long list of dns answers", () => {
			expect(formatMeasurement(dnsManyAnswers, "summary")).toMatchInlineSnapshot(`
				Measurement ID: 2m9RfyRtEcneswZfF00321XS7
				Type: dns
				Target: registry.npmjs.org
				Status: finished
				Created: 2026-11-20T11:55:17.460Z
				Updated: 2026-11-20T11:55:17.715Z
				Locations: [{"magic":"eyeball"}]
				Probes: 1

				Results, one line per probe:
				1: Kuala Lumpur, MY, AS, TM TECHNOLOGY SERVICES (AS4788) | NOERROR, A 104.16.1.34, 104.16.11.34, 104.16.10.34, 104.16.2.34, 104.16.6.34, 104.16.5.34, 104.16.8.34, 104.16.7.34, 104.16.0.34, 104.16.9.34 and 2 more, total 20 ms

				For details call getMeasurement with "probes" and output "full".
			`);
		});

		it("should group dns answers by record type", () => {
			expect(formatMeasurement(dnsCname, "summary")).toMatchInlineSnapshot(`
				Measurement ID: 2TuJNBCVrRqTuMaFc00321X5p
				Type: dns
				Target: www.github.com
				Status: finished
				Created: 2026-11-19T12:53:53.346Z
				Updated: 2026-11-19T12:53:53.447Z
				Locations: [{"magic":"world"}]
				Limit: 2
				Probes: 2

				Results, one line per probe:
				1: Falkenstein, DE, EU, Hetzner Online (AS24940) | NOERROR, CNAME github.com.; A 4.163.8.144, total 8 ms
				2: Helsinki, FI, EU, Hetzner Online (AS24940) | NOERROR, CNAME github.com.; A 140.82.121.4, total 0 ms

				For details call getMeasurement with "probes" and output "full".
			`);
		});

		it("should summarize dns with the NXDOMAIN status", () => {
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

				Results, one line per probe:
				1: Falkenstein, DE, EU, Hetzner Online (AS24940) | NXDOMAIN, no answers, resolver 185.12.64.2, total 15 ms
				2: Helsinki, FI, EU, Hetzner Online (AS24940) | NXDOMAIN, no answers, total 32 ms

				For details call getMeasurement with "probes" and output "full".
			`);
		});

		it("should summarize dns with the NOERROR status and no answers", () => {
			expect(formatMeasurement(dnsNoAnswers, "summary")).toMatchInlineSnapshot(`
				Measurement ID: 2FJuxZLmgw8WnEneE00321XX6
				Type: dns
				Target: github.com
				Status: finished
				Created: 2026-11-20T17:04:09.220Z
				Updated: 2026-11-20T17:04:09.300Z
				Locations: [{"magic":"world"}]
				Limit: 2
				Options: {"query":{"type":"AAAA"}}
				Probes: 2

				Results, one line per probe:
				1: Falkenstein, DE, EU, Hetzner Online (AS24940) | NOERROR, no answers, total 0 ms
				2: Helsinki, FI, EU, Hetzner Online (AS24940) | NOERROR, no answers, total 0 ms

				For details call getMeasurement with "probes" and output "full".
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

				Results, one line per probe:
				1: Helsinki, FI, EU, Hetzner Online (AS24940) | A 64.233.164.138, 64.233.164.113, 64.233.164.139, 64.233.164.101, 64.233.164.102, 64.233.164.100, resolver ns2.google.com, total 15 ms
				2: Falkenstein, DE, EU, Hetzner Online (AS24940) | A 142.250.154.138, 142.250.154.139, 142.250.154.101, 142.250.154.102, 142.250.154.100, 142.250.154.113, resolver ns2.google.com, total 26 ms

				For details call getMeasurement with "probes" and output "full".
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

				Results, one line per probe:
				1: Helsinki, FI, EU, Hetzner Online (AS24940) | 301 Moved Permanently, IP 172.217.22.110, total 208 ms, first byte 56 ms
				2: Falkenstein, DE, EU, Hetzner Online (AS24940) | 301 Moved Permanently, IP 142.251.110.101, total 63 ms, first byte 34 ms

				For details call getMeasurement with "probes" and output "headers" or "full".
			`);
		});

		it("should summarize http with a certificate that is not valid", () => {
			expect(formatMeasurement(httpIp, "summary")).toMatchInlineSnapshot(`
				Measurement ID: 2SSPVk28xkwXHDUC300321Wlu
				Type: http
				Target: 1.1.1.1
				Status: finished
				Created: 2026-11-18T16:18:37.347Z
				Updated: 2026-11-18T16:18:37.401Z
				Locations: [{"magic":"world"}]
				Probes: 1

				Results, one line per probe:
				1: Falkenstein, DE, EU, Hetzner Online (AS24940) | 301 Moved Permanently, IP 1.1.1.1, total 36 ms, first byte 17 ms, certificate not valid (ERR_TLS_CERT_ALTNAME_INVALID)

				For details call getMeasurement with "probes" and output "headers" or "full".
			`);
		});

		it("should summarize http without a status name (HTTP2)", () => {
			const http2 = {
				...http,
				probesCount: 1,
				results: [
					{
						...http.results[0],
						result: { ...http.results[0].result, statusCodeName: "" },
					},
				],
			};

			expect(formatMeasurement(http2, "summary")).toMatchInlineSnapshot(`
				Measurement ID: 2P4xQQKCD6c75fZM200321Wl5
				Type: http
				Target: google.com
				Status: finished
				Created: 2026-11-18T15:27:48.383Z
				Updated: 2026-11-18T15:27:48.676Z
				Locations: [{"magic":"world"}]
				Limit: 2
				Probes: 1

				Results, one line per probe:
				1: Helsinki, FI, EU, Hetzner Online (AS24940) | 301, IP 172.217.22.110, total 208 ms, first byte 56 ms

				For details call getMeasurement with "probes" and output "headers" or "full".
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

				Ping Results:
				- Successful Probes: 0/2

				Results, one line per probe:
				1: Helsinki, FI, EU, Hetzner Online (AS24940) | failed (target): queryA ENOTFOUND nonexistent.google.com
				2: Falkenstein, DE, EU, Hetzner Online (AS24940) | failed (target): queryA ENOTFOUND nonexistent.google.com

				For details call getMeasurement with "probes" and output "full".
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

				Ping Results:
				- Successful Probes: 0/1
				- Excluded Probes: 1 (internal error: 1)

				Results, one line per probe:
				1: Helsinki, FI, EU, Hetzner Online (AS24940) | failed (target)
				2: Falkenstein, DE, EU, Hetzner Online (AS24940) | failed (internal): The measurement timed out.

				For details call getMeasurement with "probes" and output "full".
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

				Ping Results:
				- Successful Probes: 0/2

				Results, one line per probe:
				1: Helsinki, FI, EU, Hetzner Online (AS24940) | in-progress
				2: Falkenstein, DE, EU, Hetzner Online (AS24940) | failed (target): queryA ENOTFOUND nonexistent.google.com

				For details call getMeasurement with "probes" and output "full".
			`);
		});

		it("should switch to summary by default when the full output is too long", () => {
			const long = {
				...traceroute,
				results: traceroute.results.map(({ probe, result }) => ({
					probe,
					result: {
						...result,
						hops: [
							{ ...result.hops[0], resolvedHostname: "x".repeat(15_000) },
							...result.hops.slice(1),
						],
					},
				})),
			};

			expect(formatMeasurement(long, "full")).toHaveLength(31268);
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

				Results, one line per probe:
				1: Helsinki, FI, EU, Hetzner Online (AS24940) | 5 hops, target 64.233.163.113 reached, rtt 2.983 ms
				2: Falkenstein, DE, EU, Hetzner Online (AS24940) | 17 hops, target 142.251.14.102 reached, rtt 5.415 ms

				For details call getMeasurement with "probes" and output "full".
			`);
		});
	});

	describe("probes", () => {
		it("should print only the chosen probes with their numbers", () => {
			expect(formatMeasurement(ping, undefined, [2])).toMatchInlineSnapshot(`
				Measurement ID: 2FL0lrUmQXiWPHMDY00321Wl5
				Type: ping
				Target: google.com
				Status: finished
				Created: 2026-11-18T15:27:47.227Z
				Updated: 2026-11-18T15:27:48.297Z
				Locations: [{"magic":"world"}]
				Limit: 2
				Probes: 2

				Ping Results:
				- Successful Probes: 2/2
				- Total Packets: 6
				- Received: 6
				- Dropped: 0
				- Average Loss: 0.00%
				- Min RTT: 3.20 ms
				- Avg RTT: 4.33 ms
				- Max RTT: 5.45 ms

				Probe 2: Helsinki, FI, EU, Hetzner Online (AS24940), tags: datacenter-network
				Resolved IP: 173.194.221.102
				Packets: 3 sent, 3 received, 0 lost (0%)
				RTT: min 3.199 ms, avg 3.375 ms, max 3.534 ms
				Replies: 3.53 ms ttl 106, 3.39 ms ttl 106, 3.2 ms ttl 106
			`);
		});

		it("should look for the same headers only in the chosen probes", () => {
			expect(formatMeasurement(httpGet, undefined, [2])).toMatchInlineSnapshot(`
				Measurement ID: 2WkcEkbEvXsFfNaww00321X49
				Type: http
				Target: google.com
				Status: finished
				Created: 2026-11-19T11:09:57.547Z
				Updated: 2026-11-19T11:09:57.726Z
				Locations: [{"magic":"world"}]
				Limit: 2
				Options: {"request":{"method":"GET"}}
				Probes: 2

				Probe 2: Helsinki, FI, EU, Hetzner Online (AS24940), tags: datacenter-network
				Resolved IP: 173.194.73.113
				Timings: total 26 ms, dns 1 ms, tcp 8 ms, tls 9 ms, firstByte 8 ms, download 0 ms
				TLS: TLSv1.3, TLS_AES_256_GCM_SHA384, valid
				Certificate:
				- Subject: *.google.com
				- Alt names: DNS:*.google.com, DNS:*.admin.google.com, DNS:*.appengine.google.com, DNS:*.bdn.dev, DNS:*.origin-test.bdn.dev, DNS:*.cloud.google.com, DNS:*.crowdsource.google.com, DNS:*.datacompute.google.com, DNS:*.google.ca, DNS:*.google.cl, DNS:*.google.co.in, DNS:*.google.co.jp, DNS:*.google.co.uk, DNS:*.google.com.ar, DNS:*.google.com.au, DNS:*.google.com.br, DNS:*.google.com.co, DNS:*.google.com.mx, DNS:*.google.com.tr, DNS:*.google.com.vn, DNS:*.google.de, DNS:*.google.es, DNS:*.google.fr, DNS:*.google.hu, DNS:*.google.it, DNS:*.google.nl, DNS:*.google.pl, DNS:*.google.pt, DNS:*.gemini.cloud.google.com, DNS:*.gstatic.com, DNS:*.metric.gstatic.com, DNS:*.gvt1.com, DNS:*.gcpcdn.gvt1.com, DNS:*.gvt2.com, DNS:*.gcp.gvt2.com, DNS:*.url.google.com, DNS:*.youtube-nocookie.com, DNS:*.ytimg.com, DNS:ai.android, DNS:android.com, DNS:*.android.com, DNS:*.flash.android.com, DNS:g.co, DNS:*.g.co, DNS:goo.gl, DNS:www.goo.gl, DNS:google-analytics.com, DNS:*.google-analytics.com, DNS:google.com, DNS:googlecommerce.com, DNS:*.googlecommerce.com, DNS:urchin.com, DNS:*.urchin.com, DNS:youtu.be, DNS:youtube.com, DNS:*.youtube.com, DNS:music.youtube.com, DNS:*.music.youtube.com, DNS:youtubeeducation.com, DNS:*.youtubeeducation.com, DNS:youtubekids.com, DNS:*.youtubekids.com, DNS:yt.be, DNS:*.yt.be, DNS:android.clients.google.com, DNS:*.aistudio.google.com
				- Issuer: WE2, Google Trust Services, US
				- Dates: 2026-11-03T08:26:50.000Z to 2027-01-26T08:26:49.000Z
				- Key: EC 256 bits
				- Serial number: 53:10:12:51:08:7F:FC:43:09:F2:7D:0B:33:C2:02:AA
				- SHA-256 fingerprint: 2B:1E:9F:EC:6E:AD:F7:A8:70:AF:64:3F:92:4F:BB:95:2F:8C:C6:75:A9:3F:33:92:6C:5E:9B:39:2E:C5:74:F2
				- Public key: 04:DB:2E:F7:8B:FC:68:DF:C0:B5:BB:CB:0A:ED:95:BE:C7:07:FA:4B:9B:68:14:C9:88:B2:95:05:57:85:12:C3:DF:EF:97:EF:86:18:53:C2:00:71:AE:76:A2:F1:DE:79:95:22:36:A2:A0:12:BB:6A:8F:99:C3:29:BB:BE:01:51:61
				HTTP/1.1 301 Moved Permanently
				Location: https://www.google.com/
				Content-Type: text/html; charset=UTF-8
				Content-Security-Policy-Report-Only: object-src 'none';base-uri 'self';script-src 'nonce-HWDRRrLPkLKxjGY1zyMXLQ' 'strict-dynamic' 'report-sample' 'unsafe-eval' 'unsafe-inline' https: http:;report-uri https://csp.withgoogle.com/csp/gws/other-hp
				Date: Thu, 19 Nov 2026 11:09:57 GMT
				Expires: Sat, 19 Dec 2026 11:09:57 GMT
				Cache-Control: public, max-age=2592000
				Server: gws
				Content-Length: 220
				X-XSS-Protection: 0
				X-Frame-Options: SAMEORIGIN
				Alt-Svc: h3=":443"; ma=2592000,h3-29=":443"; ma=2592000
				Connection: close
			`);
		});

		it("should print the body of a chosen probe when the probe with the same body is not chosen", () => {
			expect(formatMeasurement(httpGet, "full", [2])).toMatchInlineSnapshot(`
				Measurement ID: 2WkcEkbEvXsFfNaww00321X49
				Type: http
				Target: google.com
				Status: finished
				Created: 2026-11-19T11:09:57.547Z
				Updated: 2026-11-19T11:09:57.726Z
				Locations: [{"magic":"world"}]
				Limit: 2
				Options: {"request":{"method":"GET"}}
				Probes: 2

				Probe 2: Helsinki, FI, EU, Hetzner Online (AS24940), tags: datacenter-network
				Resolved IP: 173.194.73.113
				Timings: total 26 ms, dns 1 ms, tcp 8 ms, tls 9 ms, firstByte 8 ms, download 0 ms
				TLS: TLSv1.3, TLS_AES_256_GCM_SHA384, valid
				Certificate:
				- Subject: *.google.com
				- Alt names: DNS:*.google.com, DNS:*.admin.google.com, DNS:*.appengine.google.com, DNS:*.bdn.dev, DNS:*.origin-test.bdn.dev, DNS:*.cloud.google.com, DNS:*.crowdsource.google.com, DNS:*.datacompute.google.com, DNS:*.google.ca, DNS:*.google.cl, DNS:*.google.co.in, DNS:*.google.co.jp, DNS:*.google.co.uk, DNS:*.google.com.ar, DNS:*.google.com.au, DNS:*.google.com.br, DNS:*.google.com.co, DNS:*.google.com.mx, DNS:*.google.com.tr, DNS:*.google.com.vn, DNS:*.google.de, DNS:*.google.es, DNS:*.google.fr, DNS:*.google.hu, DNS:*.google.it, DNS:*.google.nl, DNS:*.google.pl, DNS:*.google.pt, DNS:*.gemini.cloud.google.com, DNS:*.gstatic.com, DNS:*.metric.gstatic.com, DNS:*.gvt1.com, DNS:*.gcpcdn.gvt1.com, DNS:*.gvt2.com, DNS:*.gcp.gvt2.com, DNS:*.url.google.com, DNS:*.youtube-nocookie.com, DNS:*.ytimg.com, DNS:ai.android, DNS:android.com, DNS:*.android.com, DNS:*.flash.android.com, DNS:g.co, DNS:*.g.co, DNS:goo.gl, DNS:www.goo.gl, DNS:google-analytics.com, DNS:*.google-analytics.com, DNS:google.com, DNS:googlecommerce.com, DNS:*.googlecommerce.com, DNS:urchin.com, DNS:*.urchin.com, DNS:youtu.be, DNS:youtube.com, DNS:*.youtube.com, DNS:music.youtube.com, DNS:*.music.youtube.com, DNS:youtubeeducation.com, DNS:*.youtubeeducation.com, DNS:youtubekids.com, DNS:*.youtubekids.com, DNS:yt.be, DNS:*.yt.be, DNS:android.clients.google.com, DNS:*.aistudio.google.com
				- Issuer: WE2, Google Trust Services, US
				- Dates: 2026-11-03T08:26:50.000Z to 2027-01-26T08:26:49.000Z
				- Key: EC 256 bits
				- Serial number: 53:10:12:51:08:7F:FC:43:09:F2:7D:0B:33:C2:02:AA
				- SHA-256 fingerprint: 2B:1E:9F:EC:6E:AD:F7:A8:70:AF:64:3F:92:4F:BB:95:2F:8C:C6:75:A9:3F:33:92:6C:5E:9B:39:2E:C5:74:F2
				- Public key: 04:DB:2E:F7:8B:FC:68:DF:C0:B5:BB:CB:0A:ED:95:BE:C7:07:FA:4B:9B:68:14:C9:88:B2:95:05:57:85:12:C3:DF:EF:97:EF:86:18:53:C2:00:71:AE:76:A2:F1:DE:79:95:22:36:A2:A0:12:BB:6A:8F:99:C3:29:BB:BE:01:51:61
				HTTP/1.1 301 Moved Permanently
				Location: https://www.google.com/
				Content-Type: text/html; charset=UTF-8
				Content-Security-Policy-Report-Only: object-src 'none';base-uri 'self';script-src 'nonce-HWDRRrLPkLKxjGY1zyMXLQ' 'strict-dynamic' 'report-sample' 'unsafe-eval' 'unsafe-inline' https: http:;report-uri https://csp.withgoogle.com/csp/gws/other-hp
				Date: Thu, 19 Nov 2026 11:09:57 GMT
				Expires: Sat, 19 Dec 2026 11:09:57 GMT
				Cache-Control: public, max-age=2592000
				Server: gws
				Content-Length: 220
				X-XSS-Protection: 0
				X-Frame-Options: SAMEORIGIN
				Alt-Svc: h3=":443"; ma=2592000,h3-29=":443"; ma=2592000
				Connection: close

				<HTML><HEAD><meta http-equiv="content-type" content="text/html;charset=utf-8">
				<TITLE>301 Moved</TITLE></HEAD><BODY>
				<H1>301 Moved</H1>
				The document has moved
				<A HREF="https://www.google.com/">here</A>.
				</BODY></HTML>
			`);
		});

		it("should summarize only the chosen probes", () => {
			expect(formatMeasurement(ping, "summary", [2])).toMatchInlineSnapshot(`
				Measurement ID: 2FL0lrUmQXiWPHMDY00321Wl5
				Type: ping
				Target: google.com
				Status: finished
				Created: 2026-11-18T15:27:47.227Z
				Updated: 2026-11-18T15:27:48.297Z
				Locations: [{"magic":"world"}]
				Limit: 2
				Probes: 2

				Ping Results:
				- Successful Probes: 2/2
				- Total Packets: 6
				- Received: 6
				- Dropped: 0
				- Average Loss: 0.00%
				- Min RTT: 3.20 ms
				- Avg RTT: 4.33 ms
				- Max RTT: 5.45 ms

				Results, one line per probe:
				2: Helsinki, FI, EU, Hetzner Online (AS24940) | IP 173.194.221.102, 0/3 lost (0%), rtt min/avg/max 3.199/3.375/3.534 ms

				For details call getMeasurement with "probes" and output "full".
			`);
		});

		it("should switch to summary by default when the output of the chosen probes is too long", () => {
			const long = {
				...traceroute,
				results: traceroute.results.map(({ probe, result }) => ({
					probe,
					result: {
						...result,
						hops: [
							{ ...result.hops[0], resolvedHostname: "x".repeat(31_000) },
							...result.hops.slice(1),
						],
					},
				})),
			};

			expect(formatMeasurement(long, undefined, [2])).toMatchInlineSnapshot(`
				Measurement ID: 2GaIM08nHIBGjG08y00321Wl5
				Type: traceroute
				Target: google.com
				Status: finished
				Created: 2026-11-18T15:27:47.399Z
				Updated: 2026-11-18T15:27:51.987Z
				Locations: [{"magic":"world"}]
				Limit: 2
				Probes: 2

				Results, one line per probe:
				2: Falkenstein, DE, EU, Hetzner Online (AS24940) | 17 hops, target 142.251.14.102 reached, rtt 5.415 ms

				For details call getMeasurement with "probes" and output "full".
			`);
		});

		it("should throw for a probe number that does not exist", () => {
			expect(() => formatMeasurement(ping, undefined, [1, 3])).toThrow(
				new Error(
					"Probe 3 does not exist. This measurement has probe numbers from 1 to 2.",
				),
			);
		});

		it("should name the measurement when the results cannot be formatted", () => {
			expect(() =>
				formatMeasurement(
					{ ...mtr, results: [{ ...mtr.results[0], result: { status: "finished" } }] },
					"summary",
				),
			).toThrow(
				new Error(
					`The results of measurement ${mtr.id} could not be formatted: Cannot read properties of undefined (reading 'findLastIndex'). You can read the measurement by URL: https://api.globalping.io/v1/measurements/${mtr.id}`,
				),
			);
		});
	});
});
