/**
 * GlobalpingAgent class - MCP Agent for Globalping API
 * 
 * This is the main Agent implementation using Cloudflare's Agents SDK.
 * It registers all tools for interacting with the Globalping API.
 */
import { McpAgent } from 'agents/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { registerTools } from './tools/tool-definitions';

/**
 * Authentication context provided by the MCP OAuth flow
 * Contains the user's claims and other authentication info
 */
interface AuthContext {
  claims: {
    sub: string;
    name?: string;
    email?: string;
  };
  token?: string;
}

/**
 * GlobalpingAgent - Main MCP Agent class for Globalping API
 * 
 * An MCP server built on Cloudflare's Agents SDK.
 * Exposes Globalping API capabilities to MCP clients like LLMs.
 */
export class GlobalpingAgent extends McpAgent<any, any, AuthContext> {
  /**
   * The MCP server instance
   */
  server = new McpServer({
    name: 'Globalping Network Measurement',
    version: '1.0.0',
    description: 'Globalping API allows you to monitor, debug, and benchmark your internet infrastructure using a globally distributed network of probes.'
  });
  
  /**
   * Initial state for the agent
   */
  initialState = {
    lastMeasurementId: null,
    previousMeasurements: [],
    lastUpdated: null
  };
  
  /**
   * Initialize the agent
   * Register all tools and set up the server
   */
  async init() {
    // Register all MCP tools
    registerTools(this.server);
    
    // We could include additional setup here, like:
    // - History tracking for measurements
    // - Checking rate limits
    // - Analytics or logging
    
    console.log('GlobalpingAgent initialized');
  }
  
  /**
   * Called when the agent's state is updated
   * @param state The new state
   * @param source The source of the update
   */
  onStateUpdate(state: any, source: any) {
    console.log('State updated:', {
      lastMeasurementId: state.lastMeasurementId,
      measurementCount: state.previousMeasurements?.length || 0,
      lastUpdated: state.lastUpdated
    });
  }
  
  /**
   * Save a measurement ID to the agent's state
   * @param measurementId The ID to save
   */
  async saveMeasurementId(measurementId: string) {
    // Get the current measurements
    const previousMeasurements = [...(this.state.previousMeasurements || [])];
    
    // Add the new measurement to the list (limit to last 10)
    previousMeasurements.unshift(measurementId);
    if (previousMeasurements.length > 10) {
      previousMeasurements.pop();
    }
    
    // Update the state
    this.setState({
      ...this.state,
      lastMeasurementId: measurementId,
      previousMeasurements,
      lastUpdated: new Date().toISOString()
    });
  }
}
