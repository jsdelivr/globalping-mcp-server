# Globalping MCP Server

<p align="center">
  <img src="https://raw.githubusercontent.com/jsdelivr/globalping-media/refs/heads/master/logo/full_colored_dark.svg" alt="Globalping Logo" width="180"/>
</p>

<p align="center">
  <b>Enable AI models to interact with a global network measurement platform through natural language. Give network access to any LLM.</b>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@globalping/globalping-mcp">
    <img src="https://img.shields.io/npm/v/@globalping/globalping-mcp.svg" alt="npm version">
  </a>
  <a href="https://github.com/modelcontextprotocol/modelcontextprotocol">
    <img src="https://img.shields.io/badge/MCP-compatible-brightgreen.svg" alt="MCP Compatible">
  </a>
</p>

## What is Globalping?

[Globalping](https://globalping.io) is a free, public API that provides access to a globally distributed network of probes for monitoring, debugging, and benchmarking internet infrastructure. With Globalping, you can run network tests (ping, traceroute, DNS, MTR, HTTP) from thousands of locations worldwide.

## What is the Globalping MCP Server?

The Globalping MCP Server implements the [Model Context Protocol (MCP)](https://modelcontextprotocol.io), allowing AI models like OpenAI's GPT and Anthropic's Claude to interact with Globalping's network measurement capabilities through natural language.

### Key Features

- 🌐 **Global Network Access**: Run measurements from thousands of probes worldwide
- 🤖 **AI-Friendly Interface**: Any LLM will easily parse the data and run new measurements as needed
- 📊 **Comprehensive Measurements**: Support for ping, traceroute, DNS, MTR, and HTTP tests
- 🔍 **Smart Context Handling**: Allows for intelligent measurement type selection based on query context
- 🔄 **Comparative Analysis**: Allows to compare network performance between different targets
- 🔑 **Token Support**: Free to use without authentication. Use your own Globalping API token for higher rate limits

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- npm (included with Node.js) or [yarn](https://yarnpkg.com/)

### Global Installation (Recommended)

You can install the Globalping MCP Server globally to run it from anywhere:

```bash
# Using npm
npm install -g @globalping/globalping-mcp
```

After installation, you can start the server with:

```bash
globalping-mcp
```

### Using npx (No Installation)

You can run the server without installation using npx:

```bash
npx @globalping/globalping-mcp
```

### Windows-Specific Instructions

On Windows, ensure you have:

1. **Node.js and npm**: Download and install from [Node.js official website](https://nodejs.org/)
2. **PowerShell**: Use PowerShell instead of Command Prompt for better compatibility
3. **PATH Environment**: Ensure Node.js is added to your PATH (the installer typically handles this)

If you encounter permission issues when installing globally on Windows:

1. Run PowerShell as Administrator
2. Execute the installation command:
   ```powershell
   npm install -g @globalping/globalping-mcp
   ```

For environment variables on Windows:

1. Create a `.env` file in your project directory, or
2. Set system environment variables:
   ```powershell
   # Temporary (current session)
   $env:GLOBALPING_API_TOKEN = "your-token"
   $env:PORT = "3000"
   
   # Permanent (system-wide)
   [Environment]::SetEnvironmentVariable("GLOBALPING_API_TOKEN", "your-token", "User")
   [Environment]::SetEnvironmentVariable("PORT", "3000", "User")
   ```

### Verifying Installation

After installation, verify the server is working correctly:

```bash
# Start the server
globalping-mcp

# Or with npx
npx @globalping/globalping-mcp
```

You should see output indicating the server is running on the specified port (default: 3000).

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GLOBALPING_API_TOKEN` | Your Globalping API token | None (uses IP-based rate limits) |
| `PORT` | HTTP port for SSE transport | `3000` |
| `DEFAULT_PROBE_LIMIT` | Default number of probes to use | `3` |

You can create a `.env` file in the directory where you run the server, or set these environment variables through your system.

### Using with MCP Clients

The Globalping MCP Server can be configured in different MCP-compatible clients:

#### Claude Desktop App

Add to your Claude Desktop configuration file:

```json
{
  "mcpServers": {
    "globalping": {
      "command": "npx",
      "args": [
        "-y",
        "@globalping/globalping-mcp"
      ],
      "env": {
        "GLOBALPING_API_TOKEN": "your-token-from-dash.globalping.io"
      }
    }
  }
}
```

#### Continue Extension

Add to your Continue configuration:

```json
{
  "tools": {
    "globalping": {
      "command": "npx -y @globalping/globalping-mcp"
    }
  }
}
```

#### Custom HTTP/SSE Endpoint

When running as a standalone server, connect to:

```
http://localhost:3000/mcp
```

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

## Supported Measurement Types

The Globalping MCP Server supports all measurement types available in the Globalping API:

- **ping**: ICMP/TCP ping tests
- **traceroute**: Network route tracing
- **dns**: DNS resolution tests
- **mtr**: My Traceroute (combined ping and traceroute)
- **http**: HTTP/HTTPS requests

## Compatible MCP Clients

This MCP server is compatible with any client that supports the Model Context Protocol tools interface, including:

- [Claude Desktop App](https://claude.ai/download)
- [Continue](https://github.com/continuedev/continue)
- [Cursor](https://cursor.com)
- [Cline](https://github.com/cline/cline)
- [Microsoft Copilot Studio](https://learn.microsoft.com/en-us/microsoft-copilot-studio/agent-extend-action-mcp)
- [5ire](https://github.com/nanbingxyz/5ire)
- And [many more](https://modelcontextprotocol.io/clients)

## Rate Limits

Without authentication, the Globalping API allows:
- 250 measurements per hour
- 2 requests per second per measurement

With authentication (using your Globalping API token):
- 500 measurements per hour
- 2 requests per second per measurement
- [Host a probe](https://github.com/jsdelivr/globalping-probe) to passively generate free credits

Get your free API token at [dash.globalping.io](https://dash.globalping.io).


## Development

This repository uses GitHub Actions for continuous integration and deployment:

- **Build Verification**: Runs on every push and pull request to the main branch to verify the package can build successfully
- **Publish to npm**: Runs on tag creation (format: `v*.*.*`) to automatically:
  - Extract the version from the tag
  - Update the version in package.json
  - Build the package
  - Publish to npm registry
  - Create a GitHub release

To publish a new version:
1. Create and push a new tag with the version: `git tag v1.2.3 && git push origin v1.2.3`
2. The workflow will automatically update the package.json version to match the tag