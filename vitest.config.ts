import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
		coverage: {
			reporter: ["text", "lcov"],
			include: ["src/**/*.ts"],
			exclude: ["src/generated/**", "src/**/*.d.ts"],
		},
	},
	resolve: {
		alias: {
			"@": new URL("./src", import.meta.url).pathname,
		},
	},
});
