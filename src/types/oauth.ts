import type { AuthRequest } from "@cloudflare/workers-oauth-provider";

// Types for OAuth
export interface PKCECodePair {
	codeVerifier: string;
	codeChallenge: string;
}

export interface StateData {
	redirectUri: string;
	clientRedirectUri: string;
	codeVerifier: string;
	codeChallenge: string;
	clientId: string;
	state: string;
	oauthReqInfo: AuthRequest;
	createdAt: number;
}
