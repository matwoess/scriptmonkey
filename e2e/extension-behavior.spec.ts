import fs from "node:fs";
import path from "node:path";
import { expect, test } from "./fixtures";

test.describe("Scriptmonkey Advanced E2E", () => {
	test.beforeEach(async ({ context }) => {
		// Serve our styled mock page for any example.com URL
		const mockPage = fs.readFileSync(
			path.join(import.meta.dirname, "mock-page.html"),
			"utf-8",
		);
		await context.route("https://example.com/**", (route) => {
			route.fulfill({
				status: 200,
				contentType: "text/html",
				body: mockPage,
			});
		});
	});

	test("should manage scripts, active/inactive lists, and badge", async ({
		page,
		extensionId,
		context,
	}) => {
		// 1. Open popup
		await page.goto(`chrome-extension://${extensionId}/index.html`);
		await expect(page.locator("h1", { hasText: "Scriptmonkey" })).toBeVisible();

		// 2. Upload test scripts
		const addBtnScript = path.join(
			import.meta.dirname,
			"../test_scripts/add_button.js",
		);
		const paraCountScript = path.join(
			import.meta.dirname,
			"../test_scripts/paragraph_counter.js",
		);

		await page
			.locator("input[type='file']")
			.setInputFiles([addBtnScript, paraCountScript]);

		// Verify they appear in "Other scripts" (since current URL is chrome-extension://...)
		await expect(page.locator("#other-list .script-name")).toHaveCount(2);

		// 3. Navigate to Site A (Matches both scripts)
		const targetPage = await context.newPage();
		await targetPage.goto("https://example.com/site-a/");

		// Add script tags manually to simulate injection
		// (since Playwright blocks real userScripts injection automatically due to missing UI permission toggle)
		await targetPage.addScriptTag({ path: addBtnScript });
		await targetPage.addScriptTag({ path: paraCountScript });

		// Verify injections work on the styled page
		await expect(
			targetPage.locator("button", { hasText: "Test Button" }),
		).toBeVisible();
		// Wait for paragraph counter to inject (it has a 1.5s timeout to simulate slow SPAs)
		await expect(
			targetPage.locator("div", { hasText: "Paragraphs: 3" }),
		).toBeVisible({ timeout: 5000 });

		// Check Popup state for Site A
		// Bring targetPage to front so it is the active tab when popup queries chrome.tabs
		await targetPage.bringToFront();
		await page.reload();
		await expect(page.locator("#active-list .script-name")).toHaveCount(2);
		await expect(page.locator("#other-list")).toBeHidden(); // No other scripts

		// Check Badge for Site A (should be "2")
		let [background] = context.serviceWorkers();
		if (!background) background = await context.waitForEvent("serviceworker");

		const targetUrlA = targetPage.url();
		const badgeTextA = await background.evaluate(async (url) => {
			return new Promise((resolve) => {
				chrome.tabs.query({ url }, (tabs) => {
					if (tabs[0] && tabs[0].id) {
						chrome.action.getBadgeText({ tabId: tabs[0].id }, resolve);
					} else resolve(null);
				});
			});
		}, targetUrlA);
		expect(badgeTextA).toBe("2");

		// 4. Navigate to Site B (Matches ONLY paragraph_counter)
		await targetPage.bringToFront();
		await targetPage.goto("https://example.com/site-b/");
		// Add only paragraph counter for site B simulation
		await targetPage.addScriptTag({ path: paraCountScript });

		// Check Popup state for Site B
		await targetPage.bringToFront();
		await page.reload();
		await expect(page.locator("#active-list .script-name")).toHaveCount(1);
		await expect(page.locator("#active-list .script-name")).toHaveText(
			"Test Script - Paragraph Counter",
		);
		await expect(page.locator("#other-list .script-name")).toHaveCount(1);
		await expect(page.locator("#other-list .script-name")).toHaveText(
			"Test Script - Add Button",
		);

		// Check Badge for Site B (should be "1")
		const targetUrlB = targetPage.url();
		const badgeTextB = await background.evaluate(async (url) => {
			return new Promise((resolve) => {
				chrome.tabs.query({ url }, (tabs) => {
					if (tabs[0] && tabs[0].id) {
						chrome.action.getBadgeText({ tabId: tabs[0].id }, resolve);
					} else resolve(null);
				});
			});
		}, targetUrlB);
		expect(badgeTextB).toBe("1");

		// 5. Remove script
		const removeBtn = page
			.locator("#other-list .script-item", {
				hasText: "Test Script - Add Button",
			})
			.locator(".btn-remove");
		await removeBtn.click();
		await page.locator("#confirm-ok").waitFor({ state: "visible" });
		await page.locator("#confirm-ok").click();

		// Verify it's gone
		await expect(page.locator("#other-list")).toBeHidden();
	});
});
