# Globalping MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for the [Globalping API](https://globalping.io/), built on Cloudflare Workers. This server allows AI models like Claude and ChatGPT to run network measurements using Globalping's worldwide network of probes.

## Features

- 🌎 **Global Network Measurements**: Run tests from global locations to monitor and debug your internet infrastructure
- 🧠 **AI-Friendly Interface**: Well-structured MCP tools that AI models can easily understand and use
- 📊 **Rich Result Formatting**: Measurement results formatted as clear, readable markdown
- 🔄 **Comparison Tools**: Compare performance between different targets using the same probes
- 🔑 **Flexible Authentication**: Use with or without a Globalping API token
- ☁️ **Serverless Deployment**: Easy deployment to Cloudflare Workers with global availability

## Supported Measurement Types

All Globalping measurement types are supported:

- **ping**: Test connectivity and measure latency to a target
- **traceroute**: Analyze network paths to a target
- **dns**: Perform DNS lookups from different global locations
- **mtr**: Combine ping and traceroute for detailed path analysis
- **http**: Test website performance globally

## Quick Start

### Deployment

You can deploy this MCP server to your Cloudflare account in just a few steps:

1. Clone this repository:

```bash
git clone https://github.com/yourusername/globalping-mcp-server.git
cd globalping-mcp-server
```

2. Install dependencies:

```bash
npm install
```

3. Deploy to Cloudflare Workers:

```bash
npm run deploy
```

This will deploy the MCP server to your Cloudflare account. The deployment URL will be displayed in the output.

### Using with AI Models

The server is ready to be used with any MCP-compatible AI model or client. For example, to use it with Claude:

1. Start a conversation with Claude
2. Ask it to connect to your MCP server: "Please connect to my Globalping MCP server at https://your-worker-url.workers.dev/sse"
3. Claude will prompt you to authenticate (just click through the authentication flow - no real authentication is required unless you want to provide your own Globalping API token)
4. Once connected, Claude can use all the Globalping tools

Example prompts for Claude:

- "Can you ping google.com from 3 locations in Europe and tell me the results?"
- "Run a comparison between cloudflare.com and akamai.com using HTTP measurements from Tokyo, London, and New York"
- "Perform a DNS lookup for github.com from different ISPs and check if there are any differences"

## MCP Tools Reference

### ping

Run a ping measurement from multiple global locations.

**Parameters**:
- `target` (string, required): The target hostname or IP address to ping
- `locations` (array of strings, optional): Array of locations to run the measurement from
- `limit` (number, optional): The number of probes to use (default: 3)
- `packets` (number, optional): The number of packets to send (default: 3)
- `ipVersion` (enum: '4' or '6', optional): The IP version to use
- `token` (string, optional): Optional Globalping API token

### traceroute

Run a traceroute measurement from multiple global locations.

**Parameters**:
- `target` (string, required): The target hostname or IP address to traceroute
- `locations` (array of strings, optional): Array of locations to run the measurement from
- `limit` (number, optional): The number of probes to use (default: 3)
- `port` (number, optional): The destination port for the data packets (default: 80)
- `protocol` (enum: 'ICMP', 'TCP', 'UDP', optional): The transport protocol to use (default: ICMP)
- `ipVersion` (enum: '4' or '6', optional): The IP version to use
- `token` (string, optional): Optional Globalping API token

### dns

Run a DNS measurement from multiple global locations.

**Parameters**:
- `target` (string, required): The domain name to query
- `locations` (array of strings, optional): Array of locations to run the measurement from
- `limit` (number, optional): The number of probes to use (default: 3)
- `queryType` (enum, optional): The type of DNS query (default: A)
- `resolver` (string, optional): A DNS resolver to use for the query
- `port` (number, optional): The port number to send the query to (default: 53)
- `protocol` (enum: 'TCP', 'UDP', optional): The protocol to use for the DNS query (default: UDP)
- `trace` (boolean, optional): Trace delegation path from root servers (default: false)
- `ipVersion` (enum: '4' or '6', optional): The IP version to use
- `token` (string, optional): Optional Globalping API token

### mtr

Run an MTR measurement from multiple global locations.

**Parameters**:
- `target` (string, required): The target hostname or IP address for MTR
- `locations` (array of strings, optional): Array of locations to run the measurement from
- `limit` (number, optional): The number of probes to use (default: 3)
- `port` (number, optional): The port number to use (default: 80)
- `protocol` (enum: 'ICMP', 'TCP', 'UDP', optional): The transport protocol to use (default: ICMP)
- `packets` (number, optional): The number of packets to send to each hop (default: 3)
- `ipVersion` (enum: '4' or '6', optional): The IP version to use
- `token` (string, optional): Optional Globalping API token

### http

Run an HTTP measurement from multiple global locations.

**Parameters**:
- `target` (string, required): The target URL or hostname for HTTP measurement
- `locations` (array of strings, optional): Array of locations to run the measurement from
- `limit` (number, optional): The number of probes to use (default: 3)
- `host` (string, optional): An optional override for the Host header
- `path` (string, optional): The path portion of the URL
- `query` (string, optional): The query string portion of the URL
- `method` (enum: 'HEAD', 'GET', 'OPTIONS', optional): The HTTP method to use (default: HEAD)
- `headers` (object, optional): Additional request headers
- `resolver` (string, optional): A DNS resolver to use
- `port` (number, optional): The port number to use
- `protocol` (enum: 'HTTP', 'HTTPS', 'HTTP2', optional): The protocol to use (default: HTTPS)
- `ipVersion` (enum: '4' or '6', optional): The IP version to use
- `token` (string, optional): Optional Globalping API token

### compareTargets

Compare two targets using the same probes.

**Parameters**:
- `measurementType` (enum: 'ping', 'traceroute', 'dns', 'mtr', 'http', required): The type of measurement to perform
- `target1` (string, required): The first target hostname, IP address, or URL
- `target2` (string, required): The second target hostname, IP address, or URL to compare with
- `locations` (array of strings, optional): Array of locations to run the measurement from
- `limit` (number, optional): The number of probes to use (default: 3)
- `options` (object, optional): Measurement-specific options
- `token` (string, optional): Optional Globalping API token

## Location Specification

When specifying locations, you can use various formats:

- City names: "New York", "London", "Tokyo"
- Country names or codes: "Germany", "US", "JP"
- Regions: "Europe", "North America", "Asia"
- Networks: "Comcast", "Deutsche Telekom"
- ASNs: "AS13335" (Cloudflare), "AS15169" (Google)
- Cloud regions: "aws-us-east-1", "gcp-europe-west1"
- Tags: "datacenter-network", "eyeball-network"

You can also combine multiple criteria using the "+" character:
- "Germany+Deutsche Telekom"
- "US+Comcast"

## Advanced Usage

### Providing Your Own Globalping API Token

If you have a Globalping API token (get one at [dash.globalping.io/tokens](https://dash.globalping.io/tokens)), you can provide it to increase your rate limits.

When the AI model attempts to connect to your MCP server, you'll be prompted with a login screen where you can enter your token. The token will then be passed to the Globalping API for all measurements.

### Using with Claude or Other AI Models

Most modern AI models like Claude and ChatGPT can interoperate with MCP servers directly, or through proxies:

1. **Using with Claude Desktop App**
   
   Add the following to your Claude configuration:
   
   ```json
   {
     "mcpServers": {
       "globalping": {
         "command": "npx",
         "args": ["mcp-remote", "https://your-worker-url.workers.dev/sse"]
       }
     }
   }
   ```

2. **Using with Claude Web or ChatGPT**
   
   Simply ask the AI to connect to your MCP server:
   
   "Please connect to my Globalping MCP server at https://your-worker-url.workers.dev/sse"

## Development

### Project Structure

```
globalping-mcp/
├── src/
│   ├── index.ts                      # Entry point
│   ├── globalping-agent.ts           # MCP Agent implementation
│   ├── api/
│   │   └── globalping-client.ts      # Globalping API client
│   ├── tools/
│   │   ├── measurement.ts            # Core measurement functionality
│   │   └── tool-definitions.ts       # MCP tool definitions
│   ├── utils/
│   │   ├── response-formatter.ts     # Response formatting utilities
│   │   └── error-handler.ts          # Error handling utilities
│   └── types/
│       └── globalping.ts             # TypeScript types for Globalping API
├── test/
│   └── globalping-client.test.ts     # Tests for the API client
├── wrangler.jsonc                    # Wrangler configuration
├── package.json                      # Dependencies
└── README.md                         # Documentation
```

### Local Development

Run the server locally:

```bash
npm run dev
```

This starts a local development server using Wrangler, allowing you to test the MCP server locally.

### Testing

Run tests:

```bash
npm test
```

This will run the test suite using Vitest.

## Rate Limits

Globalping API has the following rate limits:

| Operation | Unauthenticated user | Authenticated user |
|---|---|---|
| Create a measurement | 250 tests/hour | 500 tests/hour* |

*Additional measurements may be created by spending credits.

## License

MIT

## Credits

- [Globalping](https://globalping.io/) - The public API for global network measurements
- [Model Context Protocol](https://modelcontextprotocol.io/) - The protocol for connecting AI models to external tools
- [Cloudflare Workers](https://workers.cloudflare.com/) - Serverless platform
