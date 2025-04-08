/**
 * Entry point for the Globalping MCP server
 * 
 * Sets up the MCP server with OAuth authentication and routes requests
 * to the GlobalpingAgent.
 */
import { GlobalpingAgent } from './globalping-agent';
import { OAuthProvider } from '@cloudflare/workers-oauth-provider';

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
        // In a real implementation, you would validate the code
        // and exchange it for a real token
        
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
        
        // Create a token response
        const token = {
          access_token: crypto.randomUUID(),
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: crypto.randomUUID()
        };
        
        return new Response(JSON.stringify(token), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
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
        
        // In a real implementation, you would validate the registration
        // and store the client information
        
        // Create a client registration response
        const client = {
          client_id: crypto.randomUUID(),
          client_secret: crypto.randomUUID(),
          client_id_issued_at: Math.floor(Date.now() / 1000),
          client_secret_expires_at: 0
        };
        
        return new Response(JSON.stringify(client), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
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
  apiHandler: GlobalpingAgent.Router, // The MCP agent router
  defaultHandler: OAuthHandler, // The default handler for other routes
  authorizeEndpoint: '/authorize', // The OAuth authorization endpoint
  tokenEndpoint: '/token', // The OAuth token endpoint
  clientRegistrationEndpoint: '/register', // The OAuth client registration endpoint,
  debug: true // Enable debug mode for easier troubleshooting
});
