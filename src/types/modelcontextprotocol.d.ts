/**
 * Type declarations for @modelcontextprotocol/sdk modules
 * This helps TypeScript understand the module structure without needing to find the exact files.
 */

declare module '@modelcontextprotocol/sdk/server/mcp.js' {
  export class McpServer {
    constructor(config: {
      name: string;
      description?: string;
      version?: string;
      capabilities?: {
        tools?: Record<string, any>;
        resources?: Record<string, any>;
        prompts?: Record<string, any>;
      };
    });
    
    tool(
      name: string,
      description: string,
      schema: any,
      handler: (params: any) => Promise<any>
    ): void;
    
    connect(transport: any): Promise<void>;
  }
}

declare module '@modelcontextprotocol/sdk/server/stdio.js' {
  export class StdioServerTransport {
    constructor();
  }
}

declare module '@modelcontextprotocol/sdk/server/tool.js' {
  export interface ToolResult {
    code: number;
    message: string;
    [key: string]: any;
  }
  
  export const RESULT_CODE: {
    SUCCESS: number;
    ERROR: number;
    [key: string]: number;
  };
}
