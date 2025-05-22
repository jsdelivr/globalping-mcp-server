import { Hono } from "hono";
import {
  layout,
  createPKCECodes,
  generateRandomString,
} from "./utils";
import type { AuthRequest, OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { StateData } from "./types/oauth";
import { GlobalpingEnv, GlobalpingOAuthTokenResponse } from "./types/globalping";
import { html } from "hono/html";

// Globalping OAuth
const GLOBALPING_AUTH_URL = "https://auth.globalping.io/oauth/authorize";
const GLOBALPING_TOKEN_URL = "https://auth.globalping.io/oauth/token";
const GLOBALPING_USERDATA_URL = "https://auth.globalping.io/oauth/token/introspect";
const GLOBALPING_REPOSITORY_URL = "https://github.com/jsdelivr/globalping-mcp-server";

interface Env extends GlobalpingEnv {
  OAUTH_PROVIDER: OAuthHelpers;
}

const app = new Hono<{
  Bindings: Env;
}>();

async function getUserData(accessToken: string): Promise<any> {
  let params = new URLSearchParams();

  params.append("token", accessToken);

  const userInfoResponse = await fetch(GLOBALPING_USERDATA_URL, {
    method: "POST",
    body: params,
  });

  if (userInfoResponse.ok) {
    return await userInfoResponse.json();
  }

  return null;
}

app.get("/", async (c) => {
  return Response.redirect(GLOBALPING_REPOSITORY_URL);
});

app.get("/authorize", async (c) => {
  let oauthReqInfo: AuthRequest | undefined;
  try {
    oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
  } catch (error: any) {
    return c.html(layout(await html`<h1>Invalid request</h1><p>${error.message}</p>`, "Invalid request"));
  }

  if(!oauthReqInfo) {
    return c.html(layout(await html`<h1>Invalid request</h1><p>Missing OAuth request information.</p>`, "Invalid request"));
  }

  // validate redirect_uri, it could be any redirect_uri with dynamic client registration
  if (`${new URL(c.req.url).origin}/auth/callback` !== oauthReqInfo.redirectUri && !/http:\/\/localhost:\d+\/(.*)/is.test(oauthReqInfo.redirectUri)) {
    return c.html(layout(await html`<h1>Invalid redirect URI</h1><p>Redirect URI does not match the original request.</p>`, "Invalid redirect URI"));
  }

  const { codeVerifier, codeChallenge } = await createPKCECodes();
  const state = generateRandomString(32);

  const redirectUri = `${new URL(c.req.url).origin}/auth/callback`;

  const clientId = c.env.GLOBALPING_CLIENT_ID;

  const stateData: StateData = {
    redirectUri: redirectUri,
    clientRedirectUri: oauthReqInfo.redirectUri,
    codeVerifier,
    codeChallenge,
    clientId,
    state,
    oauthReqInfo,
    createdAt: Date.now()
  };

  await c.env.OAUTH_KV.put(`oauth_state_${state}`, JSON.stringify(stateData), {
    expirationTtl: 60 * 10, // 10 minutes
  });

  const authUrl = new URL(GLOBALPING_AUTH_URL);
  authUrl.searchParams.append("client_id", c.env.GLOBALPING_CLIENT_ID);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("redirect_uri", redirectUri);
  authUrl.searchParams.append("state", state);
  authUrl.searchParams.append("code_challenge", codeChallenge);
  authUrl.searchParams.append("code_challenge_method", "S256");
  authUrl.searchParams.append("scope", "measurements");

  return Response.redirect(authUrl.toString());
});

app.get("/auth/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const error = c.req.query("error");

  if (error) {
    return c.html(layout(await html`<h1>Authentication error</h1><p>Error: ${error}</p>`, "Authentication error"));
  }

  if (!code || !state) {
    return c.html(layout(await html`<h1>Invalid request</h1><p>Code and state are missing</p>`, "Invalid request"));
  }

  const stateKV = await c.env.OAUTH_KV.get(`oauth_state_${state}`);

  if (!stateKV) {
    return c.html(layout(await html`<h1>State is outdated</h1><p>State is outdated or missing.</p>`, "State is outdated"));
  }

  let stateData: StateData | null = null;
  try {
    stateData = JSON.parse(stateKV as string) as StateData;
  } catch {
    return c.html(layout(await html`<h1>State error</h1><p>Stored state is malformed.</p>`, "State error"));
  }

  await c.env.OAUTH_KV.delete(`oauth_state_${state}`);

  if (!stateData) {
    return c.html(layout(await html`<h1>State is outdated</h1><p>State is outdated or missing.</p>`, "State is outdated"));
  }

  const oauthReqInfo = stateData.oauthReqInfo;

  if (stateData.state !== state) {
    return c.html(layout(await html`<h1>Invalid state</h1><p>State does not match the original request.</p>`, "Invalid state"));
  }

  // Form token request - using ONLY values from our stored state data
  // This ensures the token request uses the original, validated parameters
  // even if the callback parameters were manipulated
  const tokenRequest = new URLSearchParams();
  tokenRequest.append("grant_type", "authorization_code");
  tokenRequest.append("client_id", stateData.clientId);
  tokenRequest.append("code", code); // The only value taken from the callback
  tokenRequest.append("redirect_uri", stateData.redirectUri);
  tokenRequest.append("code_verifier", stateData.codeVerifier);

  // Only log non-sensitive information
  try {
    const tokenResponse = await fetch(GLOBALPING_TOKEN_URL, {
      method: "POST",
      body: tokenRequest,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      }
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      return c.html(layout(await html`<h1>Token error</h1><p>Failed to get access token. ${JSON.stringify(errorData)}</p>`, "Token error"));
    }

    const tokenData = await tokenResponse.json() as GlobalpingOAuthTokenResponse;
    tokenData.created_at = Math.floor(Date.now() / 1000);
    // Complete OAuth authorization process
    let userData = await getUserData(tokenData.access_token);
    if (!userData) {
      return c.html(layout(await html`<h1>Authentication error</h1><p>Failed to get user data.</p>`, "Authentication error"));
    }

    const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
      request: oauthReqInfo,
      userId: userData.username,
      metadata: {
        label: userData.username,
      },
      scope: oauthReqInfo.scope,
      props: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        clientId: oauthReqInfo.clientId,
        state,
        userName: userData.username,
        isAuthenticated: true,
      },
    });

    // Directly redirect to the client app instead of showing a page
    return Response.redirect(redirectTo, 302);
  } catch (error: any) {
    console.error("Token exchange error:", error);
    return c.html(layout(await html`<h1>Authentication error</h1><p>An error occurred during token exchange. ${error.message}</p>`, "Authentication error"));
  }
});

export default app;