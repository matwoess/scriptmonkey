import path from "node:path";
import { defineConfig } from "@playwright/test";
import baseConfig from "../../playwright.config";

const serverPath = path.resolve(
	import.meta.dirname,
	"../../e2e/fixtures-server.js",
);

export default defineConfig({
	...baseConfig,
	testDir: ".",
	webServer: baseConfig.webServer
		? {
				...baseConfig.webServer,
				command: `node ${serverPath}`,
			}
		: undefined,
});
