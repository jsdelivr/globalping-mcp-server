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

The Globalping MCP Server implements the [Model Context Protocol (MCP)](https://modelcontextprotocol.io), allowing AI models like OpenAI's GPT and Anthropic's Claude to interact with Globalping's network measurement capabilities through natural language.

It also supports oAuth authentication, which offers a secure way to interact with our API and benefits from higher rate limits associated with your account.

### Key Features

- 🌐 **Global Network Access**: Run measurements from thousands of probes worldwide
- 🤖 **AI-Friendly Interface**: Any LLM will easily parse the data and run new measurements as needed
- 📊 **Comprehensive Measurements**: Support for ping, traceroute, DNS, MTR, and HTTP tests
- 🔍 **Smart Context Handling**: Provides detailed parameter descriptions for AI clients to intelligently select measurement types and options
- 🔄 **Comparative Analysis**: Allows to compare network performance between different targets
- 🔑 **oAuth Support**: Use your own Globalping account for higher rate limits


## Installation

The remote MCP server is available under these endpoints:
- Streamable HTTP transport: `https://mcp.globalping.dev/mcp`
- SSE transport: `https://mcp.globalping.dev/sse`

You can integrate our Globalping MCP server with various AI tools that support the Model Context Protocol. 

Here are instructions for the top 3 most popular tools:

#### Claude Desktop App

Add to your Claude Desktop configuration file (located at `%APPDATA%\Claude\config.json` on Windows or `~/Library/Application Support/Claude/config.json` on macOS):

Streamable HTTP transport:
```json
{
    "mcpServers": {
        "globalping": {
            "command": "npx",
            "args": [
                "mcp-remote",
                "https://mcp.globalping.dev/mcp"
            ]
        }
    }
}
```
Legacy SSE transport:
```json
{
    "mcpServers": {
        "globalping": {
            "command": "npx",
            "args": [
                "mcp-remote",
                "https://mcp.globalping.dev/sse"
            ]
        }
    }
}
```
#### Anthropic Claude API (via Console)

When creating a Claude Assistant in the Anthropic Console:

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Navigate to the Assistants section
3. Create a new Assistant or edit an existing one
4. In the Tools section, select "Add custom tool"
5. Enter the following details:
   - Tool Name: `Globalping`
   - Description: `Run network tests from locations worldwide`
   - Tool URL: `https://mcp.globalping.dev/mcp`(Streamable HTTP transport) or `https://mcp.globalping.dev/sse`(SSE transport)

#### Cursor

To add the Globalping MCP server to Cursor:

1. Open Cursor settings
2. Navigate to the MCP tab
3. Click on "+ Add new global MCP server"
4. This opens the `mcp.json` config file, where you will need to add:

Streamable HTTP transport:
```json
{
    "mcpServers": {
        "globalping": {
            "command": "npx",
            "args": [
                "mcp-remote",
                "https://mcp.globalping.dev/mcp"
            ]
        }
    }
}
```
Legacy SSE transport:
```json
{
    "mcpServers": {
        "globalping": {
            "command": "npx",
            "args": [
                "mcp-remote",
                "https://mcp.globalping.dev/sse"
            ]
        }
    }
}
```
5. Click "Save" and restart Cursor

## Connecting AI Assistants

This MCP server can be used with any MCP-compatible AI assistant, including:

- Claude Desktop
- Anthropic Assistants
- Cursor
- Windsurf
- Any custom implementation of the MCP protocol

See the MCP documentation for details on connecting clients to this server.


## Available Tools

- `ping` - Perform a ping test to a target
- `traceroute` - Perform a traceroute test to a target
- `dns` - Perform a DNS lookup for a domain
- `mtr` - Perform an MTR (My Traceroute) test to a target
- `http` - Perform an HTTP request to a URL
- `locations` - List all available Globalping probe locations
- `limits` - Show your current rate limits for the Globalping API
- `getMeasurement` - Retrieve a previously run measurement by ID
- `compareLocations` - Guide on how to run comparison measurements
- `help` - Show a help message with documentation on available tools

## Usage Examples

Once connected to an AI model through a compatible MCP client, you can interact with Globalping using natural language:

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


## Location Specification

Locations can be specified using the "magic" field, which supports various formats:

- Continent codes: "EU", "NA", "AS", etc.
- Country codes: "US", "DE", "JP", etc.
- City names: "London", "Tokyo", "New York", etc.
- Network names: "Cloudflare", "Google", etc.
- ASN numbers: "AS13335", "AS15169", etc.
- Cloud provider regions: "aws-us-east-1", "gcp-us-central1", etc.

You can also combine these with a plus sign for more specific targeting: "London+UK", "Cloudflare+US", etc.


## Development

The codebase is organized into modules:

- `src/index.ts` - Main entry point and MCP agent definition
- `src/globalping/types.ts` - TypeScript interfaces for the Globalping API
- `src/globalping/api.ts` - API wrapper functions for Globalping
- `src/globalping/tools.ts` - MCP tool implementations
- `src/utils.ts` - Helper utilities for rendering the web UI


### Add Globalping credentials

Add Globalping OAuth credentials:

- `npx wrangler secret put GLOBALPING_CLIENT_ID`

### KV storage
Used for `OAuthProvider` docs https://github.com/cloudflare/workers-oauth-provider
- create a KV namespace and copy ID
- binding for it must be `OAUTH_KV`
- configure `kv_namespaces` in the `wrangler.jsonc` file
