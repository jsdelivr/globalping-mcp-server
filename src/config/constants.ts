/**
 * Centralized application constants
 */

export const GLOBALPING_API = {
	BASE_URL: "https://api.globalping.io/v1",
	ENDPOINTS: {
		MEASUREMENTS: "/measurements",
		PROBES: "/probes",
		LIMITS: "/limits",
	},
	DEFAULT_LIMIT: 3,
	MAX_LIMIT: 100,
	MIN_LIMIT: 1,
	POLL_CONFIG: {
		MAX_ATTEMPTS: 30,
		DELAY_MS: 500,
		TIMEOUT_ATTEMPTS: 20,
	},
};

export const HTTP_STATUS = {
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
};

export const OAUTH_CONFIG = {
	SCOPES: ["measurements"],
	ENDPOINTS: {
		AUTHORIZE: "/authorize",
		TOKEN: "/token",
		REGISTER: "/register",
	},
	API_ROUTES: ["/sse", "/mcp", "/streamable-http"],
};

export const MCP_CONFIG = {
	NAME: "Globalping MCP",
	VERSION: "1.0.2",
	ICONS: [],
	WEBSITE_URL: "https://www.globalping.io",
	ROUTES: {
		SSE: "/sse",
		SSE_MESSAGE: "/sse/message",
		MCP: "/mcp",
		STREAMABLE_HTTP: "/streamable-http",
	},
	BINDING_NAME: "globalping_mcp_object",
};

export const HTTP_HEADERS = {
	ACCEPT: "application/json",
	CONTENT_TYPE: "application/json",
	USER_AGENT: `GlobalpingMcpServer/${MCP_CONFIG.VERSION}`,
};

export const TOKEN_CONFIG = {
	API_TOKEN_LENGTH: 32,
	API_TOKEN_REGEX: /^[a-zA-Z0-9]{32}$/,
	OAUTH_TOKEN_PARTS: 3,
	BEARER_PREFIX: "Bearer ",
};

export const STANDARD_PROTOCOLS = new Set([
	"http:",
	"https:",
	"ftp:",
	"file:",
	"mailto:",
	"tel:",
	"ws:",
	"wss:",
	"sms:",
	"data:",
	"blob:",
	"about:",
	"chrome:",
	"opera:",
	"edge:",
	"safari:",
	"javascript:",
]);

export const PKCE_CONFIG = {
	CODE_VERIFIER_LENGTH: 64,
	HASH_ALGORITHM: "SHA-256",
};

export const RANDOM_STRING_CONFIG = {
	HEX_RADIX: 16,
	PAD_LENGTH: 2,
	PAD_CHAR: "0",
};

export const EXCEPTION_HOSTS = new Set([
	"playground.ai.cloudflare.com",
	"mcp.docker.com",
	"mcptotal.io",
]);
