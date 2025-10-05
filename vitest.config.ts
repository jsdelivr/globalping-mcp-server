import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		typecheck: {
			include: ["**/*.test.ts"],
			enabled: true,
			ignoreSourceErrors: false,
		},
	},
});
