# Globalping MCP Server

This server implements the Model Context Protocol (MCP) for the [Globalping](https://www.globalping.io/) API, allowing AI assistants to perform global network measurements.

## Installation Instructions

### URL for MCP Clients
```
https://globalping-mcp-server.dmitriy-akulov.workers.dev/sse
```

### Claude Desktop
1. Go to Settings > Tools
2. Click "Add a Tool"
3. Select "MCP Server"
4. For Server URL enter: `https://globalping-mcp-server.dmitriy-akulov.workers.dev/sse`
5. (Optional) To use with a Globalping token, add an Environment Variable:
   - Name: `GLOBALPING_TOKEN`
   - Value: Your token from [dash.globalping.io](https://dash.globalping.io)

### Anthropic Assistants API
```json
{
  "tools": [
    {
      "mcp_server": {
        "url": "https://globalping-mcp-server.dmitriy-akulov.workers.dev/sse",
        "env": {
          "GLOBALPING_TOKEN": "your-globalping-token-here"
        }
      }
    }
  ]
}
```

### Command Line
```bash
npx mcp-remote https://globalping-mcp-server.dmitriy-akulov.workers.dev/sse
```

### MCP Inspector
```bash
npx @modelcontextprotocol/inspector
```
Then:
1. Set Transport Type to "SSE"
2. Enter URL: `https://globalping-mcp-server.dmitriy-akulov.workers.dev/sse`
3. (Optional) Add bearer token: Your Globalping token
4. Click "Connect"

## Available Tools
- ping - Network ping tests
- traceroute - Trace network routes
- dns - DNS resolution tests
- mtr - My Traceroute tests
- http - HTTP request measurements
- plus helper tools (locations, limits, getMeasurement)