/**
 * Web routes for OAuth authentication flow
 */
import { Hono } from "hono";
import { html } from "hono/html";
import { layout, manualRedirectPage } from "./ui";
import { createPKCECodes, generateRandomString, isTrustedRedirectUri } from "./lib";
import type { AuthRequest, OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import type { StateData, GlobalpingEnv, GlobalpingOAuthTokenResponse } from "./types";

// Globalping OAuth configuration
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

/**
 * Get user data from Globalping OAuth
 * @param accessToken The access token
 * @returns User data or null
 */
async function getUserData(accessToken: string): Promise<any> {
	const params = new URLSearchParams();
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

// Root route - redirect to repository
app.get("/", async (_c) => {
	return Response.redirect(GLOBALPING_REPOSITORY_URL);
});

// OAuth 2.1 Protected Resource Metadata (OpenAI Apps SDK requirement)
// This endpoint is required for ChatGPT and other OAuth 2.1 clients to discover
// authorization servers and understand how to authenticate with this MCP server
app.get("/.well-known/oauth-protected-resource", async (c) => {
	const origin = new URL(c.req.url).origin;

	return c.json({
		resource: origin,
		authorization_servers: ["https://auth.globalping.io"],
		scopes_supported: ["measurements"],
		resource_documentation: "https://www.globalping.io",
	});
});

// Authorization endpoint
app.get("/authorize", async (c) => {
	let oauthReqInfo: AuthRequest | undefined;
	try {
		oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
	} catch (error: any) {
		return c.html(
			layout(await html`<h1>Invalid request</h1><p>${error.message}</p>`, "Invalid request"),
		);
	}

	if (!oauthReqInfo) {
		return c.html(
			layout(
				await html`<h1>Invalid request</h1><p>Missing OAuth request information.</p>`,
				"Invalid request",
			),
		);
	}

	// Basic validation: just check redirect_uri is set and parsable
	// The callback endpoint will later decide if auto-redirect or show manual confirmation
	if (!oauthReqInfo.redirectUri) {
		return c.html(
			layout(
				await html`<h1>Invalid request</h1><p>Missing redirect URI.</p>`,
				"Invalid request",
			),
		);
	}

	try {
		new URL(oauthReqInfo.redirectUri);
	} catch (error) {
		return c.html(
			layout(
				await html`<h1>Invalid redirect URI</h1><p>Redirect URI is malformed.</p>`,
				"Invalid redirect URI",
			),
		);
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
		createdAt: Date.now(),
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

// OAuth callback endpoint
app.get("/auth/callback", async (c) => {
	const code = c.req.query("code");
	const state = c.req.query("state");
	const error = c.req.query("error");

	if (error) {
		return c.html(
			layout(
				await html`<h1>Authentication error</h1><p>Error: ${error}</p>`,
				"Authentication error",
			),
		);
	}

	if (!code || !state) {
		return c.html(
			layout(
				await html`<h1>Invalid request</h1><p>Code and state are missing</p>`,
				"Invalid request",
			),
		);
	}

	const stateKV = await c.env.OAUTH_KV.get(`oauth_state_${state}`);

	if (!stateKV) {
		return c.html(
			layout(
				await html`<h1>State is outdated</h1><p>State is outdated or missing.</p>`,
				"State is outdated",
			),
		);
	}

	let stateData: StateData | null = null;
	try {
		stateData = JSON.parse(stateKV as string) as StateData;
	} catch {
		return c.html(
			layout(
				await html`<h1>State error</h1><p>Stored state is malformed.</p>`,
				"State error",
			),
		);
	}

	await c.env.OAUTH_KV.delete(`oauth_state_${state}`);

	if (!stateData) {
		return c.html(
			layout(
				await html`<h1>State is outdated</h1><p>State is outdated or missing.</p>`,
				"State is outdated",
			),
		);
	}

	const oauthReqInfo = stateData.oauthReqInfo;

	if (stateData.state !== state) {
		return c.html(
			layout(
				await html`<h1>Invalid state</h1><p>State does not match the original request.</p>`,
				"Invalid state",
			),
		);
	}

	// Form token request using validated state data
	const tokenRequest = new URLSearchParams();
	tokenRequest.append("grant_type", "authorization_code");
	tokenRequest.append("client_id", stateData.clientId);
	tokenRequest.append("code", code);
	tokenRequest.append("redirect_uri", stateData.redirectUri);
	tokenRequest.append("code_verifier", stateData.codeVerifier);

	try {
		const tokenResponse = await fetch(GLOBALPING_TOKEN_URL, {
			method: "POST",
			body: tokenRequest,
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Accept: "application/json",
			},
		});

		if (!tokenResponse.ok) {
			const errorData = await tokenResponse.text();
			return c.html(
				layout(
					await html`<h1>Token error</h1><p>Failed to get access token. ${JSON.stringify(errorData)}</p>`,
					"Token error",
				),
			);
		}

		const tokenData = (await tokenResponse.json()) as GlobalpingOAuthTokenResponse;
		tokenData.created_at = Math.floor(Date.now() / 1000);

		// Get user data
		const userData = await getUserData(tokenData.access_token);
		if (!userData) {
			return c.html(
				layout(
					await html`<h1>Authentication error</h1><p>Failed to get user data.</p>`,
					"Authentication error",
				),
			);
		}

		// Complete OAuth authorization process
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

		// Per OAuth 2.0 Security Best Practices (RFC 6819 section 7.12.2),
		// only automatically redirect to trusted URIs
		if (isTrustedRedirectUri(redirectTo)) {
			// Auto-redirect for trusted URIs (localhost, deep links)
			return Response.redirect(redirectTo, 302);
		}

		// Show manual confirmation page for untrusted HTTPS URIs
		// Extract origin for cleaner display (without query params/paths)
		const displayUrl = new URL(redirectTo).origin;
		return c.html(
			layout(await manualRedirectPage(redirectTo, displayUrl), "Complete Authentication"),
		);
	} catch (error: any) {
		console.error("Token exchange error:", error);
		return c.html(
			layout(
				await html`<h1>Authentication error</h1><p>An error occurred during token exchange. ${error.message}</p>`,
				"Authentication error",
			),
		);
	}
});

export default app;
