// Types for OAuth
export interface PKCECodePair {
    codeVerifier: string;
    codeChallenge: string;
}

export interface StateData {
  redirectUri: string;
  codeVerifier: string;
  codeChallenge: string;
  clientId: string;
  state: string;
  createdAt: number;
}