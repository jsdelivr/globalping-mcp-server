/**
 * Globalping MCP Server
 * 
 * This is the main entry point for the Globalping MCP Server.
 * It initializes the MCP server, connects via stdio transport,
 * and registers tools for interacting with the Globalping API.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from 'dotenv';
import { registerGlobalpingTools } from './tools.js';

/**
 * --- Role of this MCP Server ---
 * This server provides tools to execute specific Globalping measurements (ping, traceroute, dns, mtr, http).
 * It fetches and returns the raw or processed data from the Globalping network.
 * 
 * It does NOT perform comparisons (e.g., "is site A faster than site B?") or complex analysis
 * (e.g., "summarize the DNS resolution path").
 * 
 * Such comparative or analytical tasks are the responsibility of the AI client connecting to this server.
 * The client should make one or more calls to the tools provided here, receive the results,
 * and then perform the comparison or analysis based on the returned data.
 * 
 * For example:
 * - For "Is google.com faster than bing.com?", the AI client would call the globalping-http tool twice 
 *   (once for each site) and then compare the timing results itself.
 * - For "How does example.com resolve in Europe?", the AI client would call globalping-dns with 
 *   appropriate target and location, then interpret the returned DNS records.
 * 
 * The tool descriptions are designed to help the AI client choose the right tools for gathering
 * the specific data needed to answer the user's question.
 * --- End Role Explanation ---
 */

// Load environment variables from .env file
dotenv.config();

// Flag to track if we've already connected to prevent reconnection loops
let isConnected = false;

// Create the MCP Server instance
const server = new McpServer({
    name: "globalping-mcp-server",
    version: process.env.npm_package_version || "0.0.1",
    capabilities: {
        tools: {}, // Indicate tool support
        resources: {},
        prompts: {},
    },
});

console.error("Globalping MCP Server starting...");

// --- Register Tools ---
registerGlobalpingTools(server); // Register all Globalping tools
// --- End Tool Registration ---

// --- Server Connection ---
/**
 * Starts the MCP server and connects it via stdio transport
 */
async function startServer() {
    // Prevent multiple connection attempts
    if (isConnected) {
        console.error("Server already connected, ignoring redundant connection attempt");
        return;
    }
    
    try {
        isConnected = true; // Set before connecting to prevent race conditions
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("Globalping MCP Server connected via stdio and ready.");
        
        // Handle process signals to ensure clean shutdown
        process.once('SIGINT', () => {
            console.error("Received SIGINT, shutting down...");
            process.exit(0);
        });
        
        process.once('SIGTERM', () => {
            console.error("Received SIGTERM, shutting down...");
            process.exit(0);
        });
    } catch (error) {
        console.error("Failed to start Globalping MCP Server:", error);
        // Reset the connected flag so we can try again if needed
        isConnected = false;
        process.exit(1);
    }
}
// --- End Server Connection ---

// Start the server only once
startServer();
