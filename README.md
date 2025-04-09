# Globalping MCP Server

A Cloudflare Worker that implements the Model Context Protocol (MCP) server for interacting with the [Globalping](https://www.globalping.io/) API. This allows AI assistants to perform global network measurements from a distributed network of probes.

## Features

- Exposes Globalping API functionality through MCP tools
- Supports all Globalping measurement types: ping, traceroute, DNS, MTR, and HTTP
- Uses the "magic" field for location specification
- Provides smart tool selection through the `globalping` tool
- Handles probe selection and result formatting
- Supports authentication via bearer tokens
- Caches measurement results in the agent's state
- Provides a help tool for documentation

## Available Tools

- `ping` - Perform a ping test to a target
- `traceroute` - Perform a traceroute test to a target
- `dns` - Perform a DNS lookup for a domain
- `mtr` - Perform an MTR (My Traceroute) test to a target
- `http` - Perform an HTTP request to a URL
- `locations` - List all available Globalping probe locations
- `limits` - Show your current rate limits for the Globalping API
- `globalping` - Smart tool that automatically selects the appropriate measurement type
- `getMeasurement` - Retrieve a previously run measurement by ID
- `help` - Show a help message with documentation on available tools

## Running locally

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

## Testing with the MCP Inspector

The MCP Inspector is a visual tool for testing MCP servers:

```bash
npx @modelcontextprotocol/inspector
```

Then, in your browser:
1. Navigate to http://localhost:5173
2. Set the Transport Type to "SSE"
3. Enter http://localhost:8787/sse as the URL
4. Enter a bearer token (optional, for using a Globalping API token)
5. Click "Connect"
6. Use "List Tools" to see the available tools
7. Test the tools through the inspector interface

## Deployment

```bash
# Deploy to Cloudflare Workers
npm run deploy
```

## Authentication

This MCP server supports both authenticated and unauthenticated access to the Globalping API:

1. **No Authentication**: The MCP server works without any authentication, using the Globalping API's default IP-based rate limits.

2. **Client Token**: You can provide a Globalping API token in your MCP client configuration:

```json
{
    "mcpServers": {
        "globalping": {
            "command": "npx",
            "args": [
                "mcp-remote",
                "https://globalping-mcp-server.dmitriy-akulov.workers.dev/sse"
            ],
            "env": {
                "GLOBALPING_TOKEN": "your-token-from-dash.globalping.io"
            }
        }
    }
}
```

The MCP server will use this token when making requests to the Globalping API, allowing you to benefit from higher rate limits associated with your account.

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

## Connecting AI Assistants

This MCP server can be used with any MCP-compatible AI assistant, including:

- Claude Desktop
- Anthropic Assistants
- Cursor
- Windsurf
- Any custom implementation of the MCP protocol

See the MCP documentation for details on connecting clients to this server.