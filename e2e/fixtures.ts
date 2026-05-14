import fs from "node:fs";
import path from "node:path";
import { type BrowserContext, test as base } from "@playwright/test";

export const test = base.extend<{
	context: BrowserContext;
	extensionId: string;
}>({
	context: async (_args, use) => {
		const pathToExtension = path.join(import.meta.dirname, "../dist");
		if (!fs.existsSync(pathToExtension)) {
			throw new Error("Extension not built yet. Run `npm run build` first.");
		}

		const args = [
			`--disable-extensions-except=${pathToExtension}`,
			`--load-extension=${pathToExtension}`,
		];
		if (process.env.CI) {
			args.push("--headless=new");
		}

		const context = await chromium.launchPersistentContext("", {
			headless: false,
			args,
		});
		await use(context);
		await context.close();
	},
	extensionId: async ({ context }, use) => {
		// Wait for the background service worker to start
		let [background] = context.serviceWorkers();
		if (!background) {
			background = await context.waitForEvent("serviceworker");
		}

		// Extract the extension ID from the service worker URL
		const extensionId = background.url().split("/")[2];
		await use(extensionId);
	},
});

export const expect = test.expect;

// Need to import chromium at the top
import { chromium } from "@playwright/test";
