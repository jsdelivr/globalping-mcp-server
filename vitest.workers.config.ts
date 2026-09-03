import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

const testClientId = "test-client-id";
process.env.GLOBALPING_CLIENT_ID ??= testClientId;

export default defineConfig({
	plugins: [
		cloudflareTest({
			wrangler: { configPath: "./wrangler.jsonc" },
			main: "./src/index.ts",
			miniflare: {
				compatibilityDate: "2025-03-10",
				compatibilityFlags: ["nodejs_compat_v2"],
				kvNamespaces: ["OAUTH_KV"],
				bindings: {
					GLOBALPING_CLIENT_ID: testClientId,
					OPENAI_APPS_CHALLENGE: "openai-test-verification-token",
					// Disable AgentCat during tests to avoid sending telemetry.
					MCPCAT_PROJECT_ID: "",
				},
			},
		}),
	],
	test: {
		globals: true,
		include: ["test/integration/**/*.test.ts"],
		coverage: {
			provider: "istanbul",
		},
		deps: {
			optimizer: {
				ssr: {
					enabled: true,
					include: ["globalping", "ajv"],
				},
			},
		},
	},
});
