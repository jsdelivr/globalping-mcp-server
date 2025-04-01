// src/server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Use console.error for logging
console.error("Initializing Globalping MCP Server...");

// Create the MCP Server instance
const server = new McpServer({
  name: "globalping-mcp-server",
  version: "0.1.0",
  capabilities: {
    tools: {},
  },
});

// Define a simple echo tool for initial testing
server.tool(
  "echo",
  "Replies with the message it received.",
  {
    message: z.string().describe("The message to echo back."),
  },
  async ({ message }) => {
    // Use console.error for logging within tools
    console.error(`Executing echo tool with message: "${message}"`);
    // Return the message in the expected MCP tool result format
    return {
      content: [
        {
          type: "text",
          text: `You sent: ${message}`,
        },
      ],
    };
  }
);

// Use console.error for logging
console.error("Echo tool registered.");

// --- Add Globalping tools below later ---


export { server }; // Export the server instance for use in index.ts
