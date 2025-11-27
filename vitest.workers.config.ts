import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
	test: {
		globals: true,
		include: ["test/integration/**/*.test.ts"],
		deps: {
			optimizer: {
				ssr: {
					enabled: true,
					include: ["globalping", "ajv"],
				},
			},
		},
		poolOptions: {
			workers: {
				wrangler: { configPath: "./wrangler.jsonc" },
				main: "./src/index.ts",
				miniflare: {
					compatibilityDate: "2025-03-10",
					compatibilityFlags: ["nodejs_compat_v2"],
					kvNamespaces: ["OAUTH_KV"],
					bindings: {
						GLOBALPING_CLIENT_ID: "test-client-id",
						// Disable MCPcat during tests - it adds a required 'context' parameter to all tools for agents to understand their use-cases
						MCPCAT_PROJECT_ID: "",
					},
				},
				isolatedStorage: false,
			},
		},
	},
});
