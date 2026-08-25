# Globalping MCP Server

<p align="center">
  <img src="https://raw.githubusercontent.com/jsdelivr/globalping-media/refs/heads/master/logo/full_colored_dark.svg" alt="Globalping Logo" width="180"/>
</p>

<p align="center">
  <b>Enable AI models to interact with a global network measurement platform through natural language. Give network access to any LLM.</b>
</p>

<p align="center">
  <a href="https://github.com/modelcontextprotocol/modelcontextprotocol">
    <img src="https://img.shields.io/badge/MCP-compatible-brightgreen.svg" alt="MCP Compatible">
  </a>
</p>

## What is Globalping?

[Globalping](https://globalping.io) is a free, public API that provides access to a globally distributed network of probes for monitoring, debugging, and benchmarking internet infrastructure. With Globalping, you can run network tests (ping, traceroute, DNS, MTR, HTTP) from thousands of locations worldwide.

## What is the Globalping MCP Server?

The Globalping MCP Server implements the [Model Context Protocol (MCP)](https://modelcontextprotocol.io), allowing AI models and IDE assistants to interact with Globalping's network measurement capabilities through natural language.

The server supports standard **OAuth 2.0 authentication** as well as **API token authentication** for automated workflows.
### Key Features

* 🌐 **Global Network Access**: Run measurements from thousands of probes worldwide
* 🤖 **AI-Friendly Interface**: Any LLM will easily parse the data and run new measurements as needed
* 📊 **Comprehensive Measurements**: Support for ping, traceroute, DNS, MTR, and HTTP tests
* 🔍 **Smart Context Handling**: Detailed parameter descriptions and semantic tool annotations for intelligent agent routing
* 🔄 **Comparative Analysis**: Compare network latency and routing between different targets and geographic locations
* 🔑 **Authentication Support**: Use OAuth or an API token with your Globalping account for higher rate limits

---

## Installation

The primary endpoint for all modern MCP integrations is:

`https://mcp.globalping.dev/mcp` Streamable HTTP

### ChatGPT & Codex

Connect Globalping as a remote MCP server in ChatGPT and Codex:

#### ChatGPT (Web & Desktop)

1. In ChatGPT, go to **Settings** → **Security and login** and enable **Developer mode** (or **Settings** → **Features** → **MCP Servers** in ChatGPT Desktop).
2. Add a new custom connector / MCP server with the endpoint:
```text
https://mcp.globalping.dev/mcp
```


3. Authenticate via OAuth when prompted.

#### OpenAI Codex

Add the remote server using the Codex CLI:

```bash
codex mcp add globalping --url https://mcp.globalping.dev/mcp
```

*Or add to `~/.codex/config.toml` directly:*

```toml
[mcp_servers.globalping]
url = "https://mcp.globalping.dev/mcp"
```

### Claude (Web, Desktop)

Claude supports remote Streamable HTTP MCP connectors natively without requiring local `mcp-remote` bridges:

1. In Claude, navigate to **Settings** → **Connectors** (or **Organization settings** → **Connectors** for Team/Enterprise accounts).
2. Click **+ Add custom connector**.
3. Fill in the connector details:
* **Name**: `Globalping`
* **URL**: `https://mcp.globalping.dev/mcp`

#### Claude Code

Run the following command in your terminal:

```bash
claude mcp add --transport http globalping https://mcp.globalping.dev/mcp
```

To make Globalping available across all projects on your machine (global user scope) instead of just the current project directory:

```bash
claude mcp add -s user --transport http globalping https://mcp.globalping.dev/mcp
```

*Run `claude mcp login globalping --no-browser` if working over SSH or in a headless terminal to complete the authorization URL exchange manually.*


### Cursor

Add Globalping to Cursor in one click:

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=Globalping&config=eyJ1cmwiOiJodHRwczovL21jcC5nbG9iYWxwaW5nLmRldi9tY3AifQ%3D%3D)

*Or configure manually in **Settings** → **Features** → **MCP Servers** → **Add New MCP Server**:*

* **Type**: `SSE / HTTP`
* **Name**: `globalping`
* **URL**: `https://mcp.globalping.dev/mcp`

### Gemini CLI

Globalping is indexed in the official **[Gemini CLI Extensions Gallery](https://geminicli.com/extensions/?name=jsdelivrglobalping-mcp-server)**.

Install via the Gemini extension manager:

```bash
gemini extensions install https://github.com/jsdelivr/globalping-mcp-server
```

*(Add `--auto-update` to keep the extension automatically updated).*

### VS Code & GitHub Copilot

* **Command Palette**: Run `MCP: Add Server` and enter `https://mcp.globalping.dev/mcp`.

### Generic MCP Clients

For any client supporting the standard Streamable HTTP MCP transport, add:

```json
{
  "mcpServers": {
    "globalping": {
      "url": "https://mcp.globalping.dev/mcp"
    }
  }
}
```

> **Legacy Clients (SSE / stdio fallback):** If your client strictly requires SSE over a local process bridge, configure `npx mcp-remote https://mcp.globalping.dev/sse`.

---

## Authentication

Globalping MCP supports two authentication modes:

* **OAuth 2.0**: Handled automatically in interactive clients during connection.
* **API Token**: Useful for headless scripts, CI/CD pipelines, or programmatic API clients.

### Using a Globalping API Token

1. Go to [dash.globalping.io](https://dash.globalping.io) and generate an API token under **Tokens**.
2. Pass the token via standard HTTP headers:

```json
{
  "mcpServers": {
    "globalping": {
      "url": "https://mcp.globalping.dev/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_GLOBALPING_API_TOKEN"
      }
    }
  }
}
```

---

## Programmatic Integration (Anthropic Messages API)

To use Globalping directly with Anthropic's Messages API (MCP Connector), pass the remote server definition in your request payload:

```json
{
  "model": "claude-3-7-sonnet-latest",
  "max_tokens": 1024,
  "mcp_servers": [
    {
      "type": "url",
      "name": "globalping",
      "url": "https://mcp.globalping.dev/mcp"
    }
  ],
  "tools": [
    {
      "type": "mcp_toolset",
      "mcp_server_name": "globalping"
    }
  ],
  "messages": [
    {
      "role": "user",
      "content": "Run a traceroute to 1.1.1.1 from Frankfurt and Tokyo."
    }
  ]
}
```

---

## Available Tools

| Tool | Description |
| --- | --- |
| `ping` | Perform ICMP/packet ping tests to a destination |
| `traceroute` | Trace network routing hops to a target |
| `dns` | Resolve DNS queries using specific resolvers and record types |
| `mtr` | Run combined ping and traceroute tests (My Traceroute) |
| `http` | Execute HTTP/HTTPS requests from probes worldwide |
| `locations` | List available Globalping probe regions and filters |
| `limits` | Display current API quota and usage limits |
| `getMeasurement` | Retrieve results of a historical measurement by ID |
| `compareLocations` | Helper guide to compare multi-region performance metrics |
| `help` | Tool reference and syntax documentation |

---

## Usage Examples

Once connected, run network diagnostics using natural language:

```
Ping google.com from 3 locations in Europe
```

```
Run a traceroute to github.com from Japan and compare with traceroute from the US
```

```
Check the DNS resolution of example.com using Google DNS (8.8.8.8)
```

```
Is jsdelivr.com reachable from China? Test with both ping and HTTP
```

```
What's the average response time for cloudflare.com across different continents?
```

---

## Location Specification

Locations can be specified using the location's `magic` parameter:

* **Continents**: `EU`, `NA`, `AS`, `AF`, `OC`, `SA`
* **Country codes**: `US`, `DE`, `JP`, `PL`, `BR`
* **Cities**: `London`, `Tokyo`, `New York`, `Warsaw`
* **Networks & ASNs**: `Cloudflare`, `Google`, `AS13335`, `AS15169`
* **Cloud regions**: `aws-us-east-1`, `gcp-us-central1`
* **Combinations**: `London+UK`, `Cloudflare+US`, `AWS+Frankfurt`

---

## Development

```
src/
├── index.ts        # Main entry point & MCP agent definition
├── app.ts          # OAuth web routes
├── api/            # Globalping API client
├── auth/           # Authentication helpers
├── config/         # Configuration & constants
├── lib/            # Utilities
├── mcp/            # MCP tool definitions & handlers
├── types/          # TypeScript interfaces
└── ui/             # OAuth HTML templates
```

### Credentials & Secrets

Store OAuth credentials:

```bash
npx wrangler secret put GLOBALPING_CLIENT_ID
```

### KV Storage Setup

For Cloudflare Workers OAuth state management:

1. Create a KV namespace: `npx wrangler kv:namespace create OAUTH_KV`
2. Configure `OAUTH_KV` inside `wrangler.jsonc`.
