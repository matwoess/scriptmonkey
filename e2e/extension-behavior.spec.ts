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

	test("should import multiple scripts at once from a fresh install", async ({
		page,
		extensionId,
	}) => {
		await page.goto(`chrome-extension://${extensionId}/index.html`);
		await expect(page.locator("#count")).toHaveText("0 scripts");

		const addBtnScript = path.join(
			import.meta.dirname,
			"fixtures/add_button.js",
		);
		const paraCountScript = path.join(
			import.meta.dirname,
			"fixtures/paragraph_counter.js",
		);

		await page
			.locator("input[type='file']")
			.setInputFiles([addBtnScript, paraCountScript]);

		// Both scripts must appear — this was broken on fresh install
		await expect(page.locator("#count")).toHaveText("2 scripts");
		await expect(page.locator(".script-name")).toHaveCount(2);
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
			"fixtures/add_button.js",
		);
		const paraCountScript = path.join(
			import.meta.dirname,
			"fixtures/paragraph_counter.js",
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
					if (tabs[0]?.id) {
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
					if (tabs[0]?.id) {
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

	test("should show script details overlay and allow editing/saving and deleting from details overlay", async ({
		page,
		extensionId,
		context,
	}) => {
		// 1. Open popup
		await page.goto(`chrome-extension://${extensionId}/index.html`);

		// 2. Upload a test script
		const addBtnScript = path.join(
			import.meta.dirname,
			"fixtures/add_button.js",
		);
		await page.locator("input[type='file']").setInputFiles([addBtnScript]);

		// Verify script exists
		await expect(page.locator("#other-list .script-name")).toHaveText(
			"Test Script - Add Button",
		);

		// 3. Click the script info card button to open details overlay
		await page.locator("#other-list .script-info").click();

		// Verify details overlay shows up and is visible
		const detailsModal = page.locator("#details-modal");
		await expect(detailsModal).toBeVisible();

		// Verify detailed fields inside details modal
		await expect(
			detailsModal
				.locator(".detail-row")
				.filter({ has: page.locator(".detail-label", { hasText: /^Name$/ }) })
				.locator(".detail-val"),
		).toHaveText("Test Script - Add Button");
		await expect(
			detailsModal
				.locator(".detail-row")
				.filter({
					has: page.locator(".detail-label", { hasText: /^Matches$/ }),
				})
				.locator(".detail-val"),
		).toContainText("https://example.com/site-a/*");

		// 4. Click "Edit script" and wait for the editor page to open
		const [editorPage] = await Promise.all([
			context.waitForEvent("page"),
			detailsModal.locator("#btn-edit-script").click(),
		]);

		editorPage.on("console", (msg) => {
			console.log(`[BROWSER CONSOLE] ${msg.text()}`);
		});

		// Verify editor page loaded successfully and displays the script name
		await expect(editorPage.locator("header.editor-header h1")).toHaveText(
			"Test Script - Add Button",
		);

		// The Save button should initially be disabled because there are no changes
		const saveButton = editorPage.locator("#btn-save-script");
		await expect(saveButton).toBeDisabled();

		// Status should show "Saved" initially
		await expect(editorPage.locator(".status-tag.status-saved")).toHaveText(
			"Saved",
		);

		// 5. Trigger a syntax error by typing invalid syntax
		const editorContent = editorPage.locator(".cm-content");
		await editorContent.focus();
		await editorPage.keyboard.press("Control+A");
		await editorPage.keyboard.press("Backspace");
		await editorPage.keyboard.type("const = 5;");

		// Wait for CodeMirror parse tree/evaluation to detect error
		await expect(saveButton).toBeDisabled();
		await expect(editorPage.locator("#syntax-error-banner")).toBeVisible();
		await expect(editorPage.locator(".status-tag.status-error")).toHaveText(
			"Error",
		);

		// 6. Fix syntax error to make it valid code but modified
		await editorPage.keyboard.press("Control+A");
		await editorPage.keyboard.press("Backspace");
		await editorPage.keyboard.type("console.log('syntax is now fixed');");

		// The Save button must be enabled now since there is valid syntax and changes exist
		await expect(saveButton).toBeEnabled();
		await expect(editorPage.locator(".status-tag.status-unsaved")).toHaveText(
			"Unsaved changes",
		);
		await expect(editorPage.locator("#syntax-error-banner")).toBeHidden();

		// 7. Click Save button
		await saveButton.click();

		// Save status should show "Saved" and Save button should disable
		await expect(editorPage.locator(".status-tag.status-saved")).toHaveText(
			"Saved",
		);
		await expect(saveButton).toBeDisabled();

		// Close the editor page
		await editorPage.close();

		// 8. Go back to popup tab, reload or verify changes persist
		await page.reload();

		// Reopen the details modal
		await page.locator("#other-list .script-info").click();
		await expect(detailsModal).toBeVisible();

		// Click "Delete" button inside details modal
		await detailsModal.locator("#btn-delete-details").click();

		// Confirm modal should pop up
		const confirmModal = page.locator("#confirm-modal");
		await expect(confirmModal).toBeVisible();
		await page.locator("#confirm-ok").click();

		// Verify script is completely removed
		await expect(page.locator("#other-list")).toBeHidden();
	});
});
