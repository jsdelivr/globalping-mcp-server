/**
 * Entry point for the Globalping MCP server
 * 
 * Sets up the MCP server with OAuth authentication and routes requests
 * to the GlobalpingAgent.
 */
import { GlobalpingAgent } from './globalping-agent.js';
import { OAuthProvider } from '@cloudflare/workers-oauth-provider';

// Export the GlobalpingAgent class for Durable Objects
export { GlobalpingAgent } from './globalping-agent.js';

/**
 * In-memory store for OAuth client registrations
 */
class MemoryStore {
  private clients = new Map();
  private codes = new Map();
  private tokens = new Map();

  // Client store methods
  async put(id: string, data: any) {
    this.clients.set(id, data);
    return data;
  }

  async get(id: string) {
    return this.clients.get(id);
  }

  async delete(id: string) {
    this.clients.delete(id);
  }

  // Code store methods
  async putCode(code: string, data: any) {
    this.codes.set(code, data);
    return data;
  }

  async getCode(code: string) {
    return this.codes.get(code);
  }

  async deleteCode(code: string) {
    this.codes.delete(code);
  }

  // Token store methods
  async putToken(token: string, data: any) {
    this.tokens.set(token, data);
    return data;
  }

  async getToken(token: string) {
    return this.tokens.get(token);
  }

  async deleteToken(token: string) {
    this.tokens.delete(token);
  }
}

// Create our stores
const clientStore = new MemoryStore();
const codeStore = new MemoryStore();
const tokenStore = new MemoryStore();

/**
 * Create an API handler for the MCP server
 * This wraps our agent in a format that the OAuthProvider can understand
 */
const MCPApiHandler = {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    // Extract the agent ID from the URL or use a default
    const url = new URL(request.url);
    const agentId = url.searchParams.get('agent') || 'default';
    
    // Get an instance of our agent
    const namespace = env.GlobalpingAgent;
    const id = namespace.idFromName(agentId);
    const agent = namespace.get(id);
    
    // Forward the request to the agent
    return await agent.fetch(request);
  }
};

/**
 * OAuth Handler for the MCP server
 * This handler implements a simple auth flow for MCP clients
 */
const OAuthHandler = {
  async fetch(request: Request, context: any): Promise<Response> {
    // This is a simple handler that just shows a login form
    // In a production environment, you would integrate with
    // a real authentication provider
    
    const url = new URL(request.url);
    
    // Handle the callback from the authorize page
    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const redirectUri = url.searchParams.get('redirect_uri');
      
      if (!code || !state || !redirectUri) {
        return new Response('Invalid callback parameters', { status: 400 });
      }
      
      // Store the code for later validation
      await codeStore.putCode(code, {
        redirectUri,
        state,
        createdAt: Date.now()
      });
      
      // Redirect back to the client
      return Response.redirect(`${redirectUri}?code=${code}&state=${state}`, 302);
    }
    
    // Show login form for the authorize endpoint
    if (url.pathname === '/authorize') {
      const clientId = url.searchParams.get('client_id');
      const redirectUri = url.searchParams.get('redirect_uri');
      const state = url.searchParams.get('state');
      const codeChallenge = url.searchParams.get('code_challenge');
      
      if (!clientId || !redirectUri || !state || !codeChallenge) {
        return new Response('Invalid authorization parameters', { status: 400 });
      }
      
      // Generate a simple code
      const code = crypto.randomUUID();
      
      // In a real implementation, you would store this code and associate it
      // with the client_id, state, code_challenge, etc.
      
      const loginForm = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Globalping MCP Server - Login</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .login-container {
              background-color: #f9f9f9;
              border: 1px solid #ddd;
              border-radius: 8px;
              padding: 20px;
              margin-top: 20px;
            }
            h1 {
              color: #2563eb;
            }
            button {
              background-color: #2563eb;
              color: white;
              border: none;
              padding: 10px 15px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 16px;
            }
            button:hover {
              background-color: #1d4ed8;
            }
            p {
              margin-bottom: 15px;
            }
          </style>
        </head>
        <body>
          <h1>Globalping MCP Server</h1>
          <div class="login-container">
            <p>AI assistant is requesting access to run network measurements using Globalping's global probe network.</p>
            <p>This will allow the AI to perform ping, traceroute, DNS, MTR, and HTTP measurements from locations around the world.</p>
            <p><strong>No authentication is required</strong> as the Globalping API is public, but you can provide your own API token below if you have higher rate limits.</p>
            
            <form action="/callback" method="get">
              <input type="hidden" name="code" value="${code}">
              <input type="hidden" name="state" value="${state}">
              <input type="hidden" name="redirect_uri" value="${redirectUri}">
              
              <div style="margin-bottom: 15px;">
                <label for="token" style="display: block; margin-bottom: 5px;">Globalping API Token (optional):</label>
                <input type="text" id="token" name="token" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                <small style="color: #666;">Leave empty to use without authentication</small>
              </div>
              
              <button type="submit">Authorize Access</button>
            </form>
          </div>
        </body>
        </html>
      `;
      
      return new Response(loginForm, {
        headers: {
          'Content-Type': 'text/html',
        },
      });
    }
    
    // Handle token endpoint - exchange code for token
    if (url.pathname === '/token' && request.method === 'POST') {
      try {
        // Parse the form data
        const formData = await request.formData();
        const code = formData.get('code');
        const codeVerifier = formData.get('code_verifier');
        
        if (!code || !codeVerifier) {
          return new Response(JSON.stringify({
            error: 'invalid_request',
            error_description: 'Missing required parameters'
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // In a real implementation, you would validate the code
        // and verify the code verifier using the code challenge
        
        // Create a token response
        const accessToken = crypto.randomUUID();
        const refreshToken = crypto.randomUUID();
        
        // Store token information
        await tokenStore.putToken(accessToken, {
          clientId: 'default-client',
          scope: 'measurements',
          expiresAt: Date.now() + 3600 * 1000 // 1 hour
        });
        
        return new Response(JSON.stringify({
          access_token: accessToken,
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: refreshToken
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Token endpoint error:', error);
        return new Response(JSON.stringify({
          error: 'server_error',
          error_description: 'An error occurred processing the request'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Handle client registration (dynamic registration)
    if (url.pathname === '/register' && request.method === 'POST') {
      try {
        const registration = await request.json();
        
        // Generate client ID and secret
        const clientId = crypto.randomUUID();
        const clientSecret = crypto.randomUUID();
        
        // Store client information
        await clientStore.put(clientId, {
          ...registration,
          client_id: clientId,
          client_secret: clientSecret,
          client_id_issued_at: Math.floor(Date.now() / 1000),
          client_secret_expires_at: 0
        });
        
        // Return client registration response
        return new Response(JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          client_id_issued_at: Math.floor(Date.now() / 1000),
          client_secret_expires_at: 0
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Client registration error:', error);
        return new Response(JSON.stringify({
          error: 'invalid_client_metadata',
          error_description: 'Invalid client metadata'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Default response for other paths
    return new Response('Globalping MCP Server', {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};

/**
 * Configure the OAuth provider with our MCP agent
 */
export default new OAuthProvider({
  apiRoute: '/sse', // The route for the MCP SSE endpoint
  apiHandler: MCPApiHandler, // Our custom handler for MCP requests
  defaultHandler: OAuthHandler, // The default handler for other routes
  authorizeEndpoint: '/authorize', // The OAuth authorization endpoint
  tokenEndpoint: '/token', // The OAuth token endpoint
  clientRegistrationEndpoint: '/register', // The OAuth client registration endpoint
  clientStore: clientStore, // Store for client registrations
  codeStore: codeStore, // Store for authorization codes
  tokenStore: tokenStore, // Store for tokens
  debug: true // Enable debug mode for easier troubleshooting
});