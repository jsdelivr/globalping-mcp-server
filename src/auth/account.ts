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
