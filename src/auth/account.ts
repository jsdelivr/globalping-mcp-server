const GLOBALPING_INTROSPECTION_URL = "https://auth.globalping.io/oauth/token/introspect";

export type TokenIntrospection = {
	active: boolean;
	username?: string;
	organization?: string;
};

/**
 * Introspect a Globalping token
 * @param token The token without the Bearer prefix
 * @returns The introspection result, or null if the request failed
 */
export async function introspectToken(token: string): Promise<TokenIntrospection | null> {
	const params = new URLSearchParams();
	params.append("token", token);

	const response = await fetch(GLOBALPING_INTROSPECTION_URL, {
		method: "POST",
		body: params,
	});

	if (!response.ok) {
		return null;
	}

	return (await response.json()) as TokenIntrospection;
}

/**
 * Name the account a token acts for, and for an org token also the user it acts through
 * @param introspection The token introspection
 * @returns The account name, or undefined if the token has no user
 */
export function getAccountName({ username, organization }: TokenIntrospection): string | undefined {
	if (!username) {
		return undefined;
	}

	return organization ? `${organization} (via ${username})` : username;
}
