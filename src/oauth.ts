/**
 * Globalping OAuth with PKCE implementation
 */
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import * as crypto from "crypto";

// Types for OAuth
interface PKCECodePair {
  codeVerifier: string;
  codeChallenge: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

interface OAuthState {
  clientId: string;
  redirectUri: string;
  state: string;
  codeVerifier: string;
  scope: string;
  createdAt: number;
}

// Environment interface
interface OAuthEnv {
  GLOBALPING_CLIENT_ID: string;
  GLOBALPING_CLIENT_SECRET?: string; // Optional for public clients
  OAUTH_KV: KVNamespace;
}

// Constants
const AUTHORIZATION_URL = "https://auth.globalping.io/oauth/authorize";
const TOKEN_URL = "https://auth.globalping.io/oauth/token";
const AUTH_COOKIE_NAME = "globalping_oauth_state";
const TOKEN_COOKIE_NAME = "globalping_access_token";
const TOKEN_KV_PREFIX = "token:";
const STATE_KV_PREFIX = "state:";
const DEFAULT_SCOPE = "measurements";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days 

/**
 * Generate a random string for PKCE and state
 * @param length Length of the random string
 * @returns A URL-safe random string
 */
export function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, length);
}

/**
 * Create a code verifier and code challenge pair for PKCE
 * @returns A code verifier and challenge pair
 */
export async function createPKCECodes(): Promise<PKCECodePair> {
  // Generate code verifier (random string between 43-128 chars)
  const codeVerifier = generateRandomString(64);
  
  // Create code challenge using SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  
  // Convert digest to base64url format
  const base64Digest = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return {
    codeVerifier,
    codeChallenge: base64Digest
  };
}

/**
 * Get the access token for a request
 * @param c The Hono context
 * @returns The access token if available, undefined otherwise
 */
export async function getAccessToken(c: { env: OAuthEnv; req: Request }): Promise<string | undefined> {
  // Check if we have a custom header with the token
  const customTokenHeader = c.req.headers.get("x-globalping-token");
  if (customTokenHeader) {
    return `Bearer ${customTokenHeader}`;
  }
  
  // Check if we have an authorization header
  const authHeader = c.req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader;
  }
  
  // Check if we have a cookie with a token ID
  const tokenId = getCookie(c as any, TOKEN_COOKIE_NAME);
  if (!tokenId) {
    return undefined;
  }
  
  // Get the token from KV
  const tokenJson = await c.env.OAUTH_KV.get(`${TOKEN_KV_PREFIX}${tokenId}`);
  if (!tokenJson) {
    return undefined;
  }
  
  // Parse the token
  const tokenData = JSON.parse(tokenJson) as TokenResponse;
  
  // Return the access token with Bearer prefix
  return `Bearer ${tokenData.access_token}`;
}

/**
 * Refresh an OAuth token
 * @param refreshToken The refresh token
 * @param env The environment variables
 * @returns The new token response
 */
export async function refreshOAuthToken(refreshToken: string, env: OAuthEnv): Promise<TokenResponse> {
  const { GLOBALPING_CLIENT_ID, GLOBALPING_CLIENT_SECRET } = env;
  
  const tokenRequest = new FormData();
  tokenRequest.append("grant_type", "refresh_token");
  tokenRequest.append("client_id", GLOBALPING_CLIENT_ID);
  tokenRequest.append("refresh_token", refreshToken);
  
  // Add client secret if available
  if (GLOBALPING_CLIENT_SECRET) {
    tokenRequest.append("client_secret", GLOBALPING_CLIENT_SECRET);
  }
  
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    body: tokenRequest,
    headers: {
      "Accept": "application/json"
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${errorText}`);
  }
  
  return await response.json() as TokenResponse;
}