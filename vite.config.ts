import { crx } from "@crxjs/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import manifest from "./manifest.json" with { type: "json" };

export default defineConfig({
	plugins: [react(), crx({ manifest })],
	build: {
		rolldownOptions: {
			input: {
				popup: "index.html",
				dashboard: "dashboard.html",
			},
		},
		chunkSizeWarningLimit: 1024,
	},
	test: {
		environment: "jsdom",
		globals: true,
		exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
	},
});
