import { Hono } from "hono";
import {
  layout,
  homeContent,
  renderAuthorizationApprovedContent,
  createPKCECodes,
  generateRandomString
} from "./utils";
import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { StateData } from "./types/oauth";
import { GlobalpingOAuthTokenResponse } from "./types/globalping";
import { html } from "hono/html";

// Globalping OAuth
const GLOBALPING_AUTH_URL = "https://auth.globalping.io/oauth/authorize";
const GLOBALPING_TOKEN_URL = "https://auth.globalping.io/oauth/token";
const TOKEN_COOKIE_NAME = "globalping_token";
const STATE_KV_PREFIX = "state:";
const TOKEN_KV_PREFIX = "token:";

interface Env {
  GLOBALPING_CLIENT_ID: string;
  GLOBALPING_CLIENT_SECRET: string;
  OAUTH_KV: KVNamespace;
  ASSETS: { fetch: typeof fetch };
}

type Bindings = Env & {
  OAUTH_PROVIDER: OAuthHelpers;
}

const app = new Hono<{
  Bindings: Bindings;
}>();

/**
 * Get access token from request
 * @param c Hono context
 * @returns Access token with Bearer prefix if available
 */
export async function getAccessToken(c: { env: Env; req: Request }): Promise<string | undefined> {
  // Check if we have an authorization header
  const authHeader = c.req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    // Check token validity in KV
    const token = authHeader.substring(7);
    const tokenData = await c.env.OAUTH_KV.get(`${TOKEN_KV_PREFIX}${token}`);
    if (tokenData) {
      return authHeader;
    }
  }

  // Check if we have a token cookie
  const token = getCookie(c as any, TOKEN_COOKIE_NAME);
  if (!token) {
    return undefined;
  }

  // Get token data from KV
  const tokenJson = await c.env.OAUTH_KV.get(`${TOKEN_KV_PREFIX}${token}`);
  if (!tokenJson) {
    // Token not found or expired, delete cookie
    deleteCookie(c as any, TOKEN_COOKIE_NAME);
    return undefined;
  }

  // Return token with Bearer prefix
  return `Bearer ${token}`;
}

/**
 * Refresh token if it's about to expire
 * @param c Hono context
 * @param token Current token
 * @returns New token or current one if refresh is not needed
 */
async function refreshTokenIfNeeded(c: { env: Env }, token: string): Promise<string | undefined> {
  // Get current token data
  const tokenJson = await c.env.OAUTH_KV.get(`${TOKEN_KV_PREFIX}${token}`);
  if (!tokenJson) return undefined;

  const tokenData = JSON.parse(tokenJson) as GlobalpingOAuthTokenResponse;

  // Check if the token is about to expire (e.g., in 5 minutes)
  const createdAt = tokenData.created_at || Math.floor(Date.now() / 1000) - 60; // If no created_at, assume it was created a minute ago
  const expiresAt = createdAt + tokenData.expires_in;
  const fiveMinutesFromNow = Math.floor(Date.now() / 1000) + 300;

  if (expiresAt > fiveMinutesFromNow) {
    // Token is still valid for a sufficient time
    return token;
  }

  // Token is about to expire, refresh it
  if (tokenData.refresh_token) {
    try {
      const refreshRequest = new FormData();
      refreshRequest.append("grant_type", "refresh_token");
      refreshRequest.append("client_id", c.env.GLOBALPING_CLIENT_ID);
      if (c.env.GLOBALPING_CLIENT_SECRET) {
        refreshRequest.append("client_secret", c.env.GLOBALPING_CLIENT_SECRET);
      }
      refreshRequest.append("refresh_token", tokenData.refresh_token);

      const response = await fetch(GLOBALPING_TOKEN_URL, {
        method: "POST",
        body: refreshRequest,
        headers: {
          "Accept": "application/json"
        }
      });

      if (response.ok) {
        const newTokenData = await response.json() as GlobalpingOAuthTokenResponse;
        newTokenData.created_at = Math.floor(Date.now() / 1000);

        // Save new token
        await c.env.OAUTH_KV.put(
          `${TOKEN_KV_PREFIX}${newTokenData.access_token}`,
          JSON.stringify(newTokenData),
          { expirationTtl: newTokenData.expires_in }
        );

        // Update cookie
        setCookie(c as any, TOKEN_COOKIE_NAME, newTokenData.access_token, {
          path: "/",
          secure: true,
          httpOnly: true,
          sameSite: "Lax",
          maxAge: newTokenData.expires_in
        });

        // Return new token
        return newTokenData.access_token;
      }
    } catch (error) {
      console.error("Error refreshing token:", error);
    }
  }

  // If refresh failed, return undefined
  return undefined;
}

app.get("/", async (c) => {
  const content = await homeContent(c.req.raw);
  return c.html(layout(content, "Globalping MCP Server"));
});

app.get("/authorize", async (c) => {

  const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);

  const { codeVerifier, codeChallenge } = await createPKCECodes();
  const state = generateRandomString(32);

  const redirectUri = `${new URL(c.req.url).origin}/auth/callback`;

  const stateData: StateData = {
    redirectUri,
    codeVerifier,
    state,
    createdAt: Date.now()
  };

  await c.env.OAUTH_KV.put(
    `${STATE_KV_PREFIX}${state}`,
    JSON.stringify(stateData),
    { expirationTtl: 600 }
  );

  await c.env.OAUTH_KV.put(
    `oauth_req:${state}`,
    JSON.stringify(oauthReqInfo),
    { expirationTtl: 600 }
  );

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

  const stateDataJson = await c.env.OAUTH_KV.get(`${STATE_KV_PREFIX}${state}`);

  if (!stateDataJson) {
    return c.html(layout(`<h1>State is outdated</h1><p>State is outdated or missing.</p>`, "State is outdated"));
  }

  // Parse state data
  const stateData = JSON.parse(stateDataJson) as StateData;

  // Clear state data from KV
  await c.env.OAUTH_KV.delete(`${STATE_KV_PREFIX}${state}`);

  // Form token request
  const tokenRequest = new URLSearchParams();
  tokenRequest.append("grant_type", "authorization_code");
  tokenRequest.append("client_id", c.env.GLOBALPING_CLIENT_ID);
  tokenRequest.append("client_secret", c.env.GLOBALPING_CLIENT_SECRET);
  tokenRequest.append("code", code);
  tokenRequest.append("redirect_uri", stateData.redirectUri);
  tokenRequest.append("code_verifier", stateData.codeVerifier);
  console.log("Token request body:", JSON.stringify(stateData));
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

    await c.env.OAUTH_KV.put(
      `${TOKEN_KV_PREFIX}${tokenData.access_token}`,
      JSON.stringify(tokenData),
      { expirationTtl: tokenData.expires_in }
    );

    setCookie(c, TOKEN_COOKIE_NAME, tokenData.access_token, {
      path: "/",
      secure: true,
      httpOnly: true,
      sameSite: "Lax",
      maxAge: tokenData.expires_in
    });

    const oauthReqInfoJson = await c.env.OAUTH_KV.get(`oauth_req:${state}`);
    if (oauthReqInfoJson) {

      // Restore OAuth request information
      const oauthReqInfo = JSON.parse(oauthReqInfoJson);

      // Complete OAuth authorization process
      const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
        request: oauthReqInfo,
        userId: state, // Use some user identifier
        metadata: {
          label: "Globalping member",
        },
        scope: oauthReqInfo.scope,
        props: {
          accessToken: `${tokenData.access_token}`,
          refreshToken: `${tokenData.access_token}`
        },
      });
      //return c.html(layout(JSON.stringify(tokenData), "Globalping MCP - Authorization completed"));
      return c.html(
        layout(
          await renderAuthorizationApprovedContent(redirectTo),
          "Globalping MCP - Authorization approved",
        ),
      );
    }

    // If it was a direct login (not part of OAuth), redirect to home
    return c.redirect("/");

  } catch (error: any) {
    console.error("Token exchange error:", error);
    return c.html(layout(`<h1>Authentication error</h1><p>An error occurred during token exchange. ${error.message}</p>`, "Authentication error"));
  }
});

// Status endpoint to check user authentication
app.get("/auth/status", async (c) => {
  const token = getCookie(c, TOKEN_COOKIE_NAME);

  if (!token) {
    return c.json({ authenticated: false });
  }

  // Check token validity and get its data
  const tokenDataJson = await c.env.OAUTH_KV.get(`${TOKEN_KV_PREFIX}${token}`);

  if (!tokenDataJson) {
    // Token not in KV, possibly expired
    deleteCookie(c, TOKEN_COOKIE_NAME);
    return c.json({ authenticated: false });
  }

  // Parse token data
  const tokenData = JSON.parse(tokenDataJson) as GlobalpingOAuthTokenResponse;

  // Check if the token needs to be refreshed
  const refreshedToken = await refreshTokenIfNeeded(c, token);

  return c.json({
    authenticated: true,
    expiresIn: tokenData.expires_in,
    scope: tokenData.scope,
    tokenType: tokenData.token_type,
    refreshed: refreshedToken !== token && refreshedToken !== undefined
  });
});

// Logout endpoint to clear authentication
app.get("/logout", async (c) => {
  const token = getCookie(c, TOKEN_COOKIE_NAME);

  if (token) {
    // Clear KV storage
    await c.env.OAUTH_KV.delete(`${TOKEN_KV_PREFIX}${token}`);
    // Clear cookie
    deleteCookie(c, TOKEN_COOKIE_NAME);
  }

  // Redirect to home
  return c.redirect("/");
});

export default app;