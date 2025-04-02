/**
 * Globalping MCP Server Tools
 * 
 * This file serves as the main entry point for the Globalping MCP Server tools.
 * The implementation has been split into multiple files for better maintainability.
 * 
 * @see ./tools/handlers.js - Main request handler
 * @see ./tools/registration.js - Tool registration
 * @see ./tools/types.js - Type definitions
 * @see ./tools/utils.js - Utility functions
 * @see ./tools/optionHandlers.js - Handler functions for measurement options
 */

// Re-export the main functionality from the tools directory
export { registerGlobalpingTools, handleGlobalpingRequest } from './tools/index.js';
