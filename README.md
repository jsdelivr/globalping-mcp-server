# Globalping MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for the [Globalping API](https://globalping.io/), built on Cloudflare Workers.

This MCP server allows AI assistants like Claude and ChatGPT to run network measurements using Globalping's worldwide network of probes. The AI can perform ping, traceroute, DNS, MTR, and HTTP measurements from various locations around the globe.

## Features

- 🌐 Run network measurements from global locations
- 🔄 Compare performance between different targets
- 🔍 Analyze network paths and latency
- 📊 Generate detailed summaries of results
- 🔑 Support for both authenticated and unauthenticated access
- 🚀 Built on Cloudflare Workers for global low-latency access

## Supported Measurement Types

- **Ping**: Measure latency and packet loss
- **Traceroute**: Analyze network paths
- **DNS**: Query DNS records from different locations
- **MTR**: Combine ping and traceroute for detailed path analysis
- **HTTP**: Test website performance globally

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (Cloudflare Workers CLI)
- A Cloudflare account

### Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/globalping-mcp-server.git
   cd globalping-mcp-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Login to Cloudflare with Wrangler:
   ```bash
   npx wrangler login
   ```

4. Deploy to Cloudflare Workers:
   ```bash
   npx wrangler deploy
   ```

5. (Optional) Run the server locally for development:
   ```bash
   npx wrangler dev
   ```

## Usage

### For MCP Clients (AI Models)

Any MCP-compatible client can connect to this server and use the following tools:

- `ping`: Run a ping measurement
- `traceroute`: Run a traceroute measurement
- `dns`: Run a DNS measurement
- `mtr`: Run an MTR measurement
- `http`: Run an HTTP measurement
- `compareTargets`: Compare two targets using the same probes

### Example Tool Invocation

Here's an example of how an AI model would invoke the `ping` tool:

```json
{
  "target": "example.com",
  "locations": ["New York", "London", "Tokyo"],
  "limit": 3,
  "packets": 5
}
```

### Authentication

This MCP server provides a simple OAuth flow for authentication. The Globalping API is public and can be used without authentication, but if you have higher rate limits with a Globalping API token, you can provide it during the OAuth flow.

## Rate Limits

Globalping API has the following rate limits:

| Operation | Unauthenticated user | Authenticated user |
|---|---|---|
| Create a measurement | 250 tests/hour | 500 tests/hour* |

*Additional measurements may be created by spending credits.

## Development

### Project Structure

- `src/`: Source code
  - `index.ts`: Entry point
  - `globalping-agent.ts`: MCP Agent implementation
  - `api/`: API clients
  - `tools/`: MCP tool definitions
  - `types/`: TypeScript types

### Local Development

Run the server locally:

```bash
npm run dev
```

Build the project:

```bash
npm run build
```

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

## License

MIT

## Credits

- [Globalping](https://globalping.io/) - The public API for global network measurements
- [Model Context Protocol](https://modelcontextprotocol.io/) - The protocol for connecting AI models to external tools
- [Cloudflare Workers](https://workers.cloudflare.com/) - Serverless platform
