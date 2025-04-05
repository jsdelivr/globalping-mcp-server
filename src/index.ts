#!/usr/bin/env node
/**
 * Globalping MCP Server - Main Entry Point
 * 
 * This is the primary entry point for the Globalping MCP functionality
 * when used with the MCP inspector. This file acts as the central point
 * to initialize the Globalping MCP server.
 * 
 * This file is specifically required by the MCP Inspector, which looks
 * for a build/index.js file by default.
 */

// Re-export the main server functionality
export * from './server.js';

// For direct execution, initialize the server
import './server.js';
