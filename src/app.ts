import { Hono } from "hono";
import {
  layout,
  createPKCECodes,
  generateRandomString,
  getDurableObject
} from "./utils";
import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";
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

export async function refreshToken(env: any, refreshToken: string): Promise<any> {
  // Form token request
  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("client_id", env.GLOBALPING_CLIENT_ID);
  params.append("refresh_token", refreshToken);

  // Send request to refresh token
  const response = await fetch(GLOBALPING_TOKEN_URL, {
    method: "POST",
    body: params,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error("Failed to refresh token");
  }

  return await response.json();
}

app.get("/", async (c) => {
  return Response.redirect(GLOBALPING_REPOSITORY_URL);
});

app.get("/authorize", async (c) => {

  const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);

  const { codeVerifier, codeChallenge } = await createPKCECodes();
  const state = generateRandomString(32);
  const durableObject = getDurableObject(state, c.env);


  const redirectUri = `${new URL(c.req.url).origin}/auth/callback`;
  const clientId = c.env.GLOBALPING_CLIENT_ID;

  const stateData: StateData = {
    redirectUri,
    codeVerifier,
    codeChallenge,
    clientId,
    state,
    createdAt: Date.now()
  };

  await durableObject.setOAuthState({stateData, oauthReqInfo});

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
  
  const durableObject = getDurableObject(state, c.env);
  const durableObjectResponse = await durableObject.getOAuthState();
  const stateData = durableObjectResponse.stateData;
  const oauthReqInfo = durableObjectResponse.oauthReqInfo;
  
  // Validate that the current request matches the original OAuth parameters
  // This prevents CSRF and authorization code interception attacks
  if (!stateData) {
    return c.html(layout(await html`<h1>State is outdated</h1><p>State is outdated or missing.</p>`, "State is outdated"));
  }
  
  // Note: We're not attempting to validate client_id in the callback since it's not typically included
  // The security comes from using the originally stored client_id for the token request below
  // and validating the state parameter which is cryptographically bound to the original request

  const redirectUri = `${new URL(c.req.url).origin}/auth/callback`;

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
        accessToken: `${tokenData.access_token}`,
        refreshToken: `${tokenData.refresh_token || tokenData.access_token}`,
        clientId: oauthReqInfo.clientId,
        state,
        userName: userData.username,
      },
    });
    // Directly redirect to the client app instead of showing a page
    return Response.redirect(redirectTo, 302);
  } catch (error: any) {
    console.error("Token exchange error:", error);
    return c.html(layout(await html`<h1>Authentication error</h1><p>An error occurred during token exchange. ${error.message}</p>`, "Authentication error"));
  }
});

app.post("/token", async (c) => {
  const { grantType, props } = await c.env.OAUTH_PROVIDER.parseTokenRequest(c.req.raw);
  const tokens = await refreshToken(c.env, props.refreshToken);
  if (tokens) {
    return c.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      token_type: "Bearer",
      scope: props.scope,
    });
  }
});

export default app;