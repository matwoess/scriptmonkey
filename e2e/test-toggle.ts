import path from "node:path";
import { chromium } from "playwright";

async function main() {
	const pathToExtension = path.join(import.meta.dirname, "../dist");
	const context = await chromium.launchPersistentContext("", {
		headless: false,
		args: [
			`--disable-extensions-except=${pathToExtension}`,
			`--load-extension=${pathToExtension}`,
		],
	});

	let [background] = context.serviceWorkers();
	if (!background) background = await context.waitForEvent("serviceworker");
	const extensionId = background.url().split("/")[2];

	const page = await context.newPage();

	// Go to main extensions page and enable developer mode
	await page.goto("chrome://extensions");
	await page
		.locator("extensions-manager")
		.locator("#toolbar")
		.locator("#devMode")
		.click();

	// Go to extension detail page and enable user scripts
	await page.goto(`chrome://extensions/?id=${extensionId}`);

	// Toggle user scripts
	const toggle = page
		.locator("extensions-manager")
		.locator("extensions-detail-view")
		.locator("#allow-interactive-checkbox"); // wait, let's find the exact ID.

	// Just dump the HTML of the detail view
	const html = await page
		.locator("extensions-manager")
		.locator("extensions-detail-view")
		.innerHTML();
	console.log(html.includes("allow"));

	await context.close();
}
main().catch(console.error);
