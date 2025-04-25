import { Hono } from "hono";
import {
  layout,
  homeContent,
  renderAuthorizationApprovedContent,
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
  params.append("client_secret", env.GLOBALPING_CLIENT_SECRET);
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
  const content = await homeContent(c.req.raw);
  return c.html(layout(content, "Globalping MCP Server"));
});

app.get("/authorize", async (c) => {

  const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);

  const { codeVerifier, codeChallenge } = await createPKCECodes();
  const state = generateRandomString(32);
  const durableObject = getDurableObject(state, c.env);


  const redirectUri = `${new URL(c.req.url).origin}/auth/callback`;

  const stateData: StateData = {
    redirectUri,
    codeVerifier,
    state,
    createdAt: Date.now()
  };

  await durableObject.setOAuthState({ stateData: stateData, oauthReqInfo: oauthReqInfo });

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

  if (!stateData) {
    return c.html(layout(`<h1>State is outdated</h1><p>State is outdated or missing.</p>`, "State is outdated"));
  }

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

      // Complete OAuth authorization process
      let userData = await getUserData(tokenData.access_token);

      if (!userData) {
        return c.html(layout(await html`<h1>Authentication error</h1><p>Failed to get user data.</p>`, "Authentication error"));
      }
      const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
        request: oauthReqInfo,
        userId: userData.client_id,
        metadata: {
          label: userData.username,
        },
        scope: oauthReqInfo.scope,
        props: {
          accessToken: `${tokenData.access_token}`,
          refreshToken: `${tokenData.access_token}`,
          state,
          userName: userData.username,
        },
      });

      return c.html(
        layout(
          await renderAuthorizationApprovedContent(redirectTo),
          "Globalping MCP - Authorization approved",
        ),
      );
  } catch (error: any) {
    console.error("Token exchange error:", error);
    return c.html(layout(await html`<h1>Authentication error</h1><p>An error occurred during token exchange. ${error.message}</p>`, "Authentication error"));
  }
});

export default app;