// src/index.ts
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { server } from "./server.js"; // Import the configured server instance

/**
 * Main function to start the MCP server.
 * This function sets up the transport layer (stdio in this case)
 * and connects it to the MCP server instance, ensuring the process stays alive.
 */
async function main() {
  // Use console.error for logging to avoid interfering with stdout JSON-RPC
  console.error("Starting MCP server via stdio transport...");

  // Create the transport layer using Standard Input/Output
  const transport = new StdioServerTransport();

  // Create a promise that never resolves to keep the Node.js process alive
  const keepAlivePromise = new Promise<void>(() => {});

  let transportClosed = false; // Flag to prevent potential double exit calls

  // Setup listener for when the transport closes
  transport.onclose = () => {
    if (!transportClosed) {
        transportClosed = true;
        console.error("Stdio transport closed. Server shutting down."); // Log to stderr
        process.exit(0);
    }
  };

  // Setup listener for transport errors
  transport.onerror = (error: Error) => {
    if (!transportClosed) {
        transportClosed = true;
        console.error("Stdio transport error:", error); // Log error to stderr
        process.exit(1);
    }
  };

  try {
    // Connect the server logic to the transport layer.
    await server.connect(transport);
    // Use console.error for status logging
    console.error(
      "Globalping MCP Server is running and connected via stdio."
    );
    console.error("Ready to receive MCP requests.");

    // Keep the main function alive indefinitely
    await keepAlivePromise;

  } catch (error) {
     if (!transportClosed) {
         transportClosed = true;
         console.error("Failed to start or connect the MCP server:", error); // Log error to stderr
         process.exit(1);
     }
  }
}

// Execute the main function
main().catch((error) => {
  console.error("Unhandled error during server startup:", error); // Log error to stderr
  process.exit(1);
});
