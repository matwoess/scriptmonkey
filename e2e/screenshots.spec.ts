import fs from "node:fs";
import path from "node:path";
import { expect, test } from "./fixtures";

test.describe("Generate Documentation Screenshots", () => {
	test.beforeEach(async ({ context }) => {
		const mockPage = fs.readFileSync(
			path.join(import.meta.dirname, "mock-page.html"),
			"utf-8",
		);
		await context.route("https://vercel.com/**", (route) => {
			route.fulfill({
				status: 200,
				contentType: "text/html",
				body: mockPage,
			});
		});
		await context.route("https://example.com/**", (route) => {
			route.fulfill({
				status: 200,
				contentType: "text/html",
				body: mockPage,
			});
		});
	});

	test("generate documentation screenshots", async ({
		page,
		extensionId,
		context,
	}) => {
		const imagesDir = path.join(import.meta.dirname, "../public/images");

		// Override getStatus in pages to simulate enabled User Scripts permission
		const mockUserScriptsAvailable = async (p: typeof page) => {
			await p.addInitScript(() => {
				const origSendMessage = chrome.runtime.sendMessage.bind(chrome.runtime);
				chrome.runtime.sendMessage = (async (
					msg: unknown,
					...args: unknown[]
				) => {
					if (
						msg &&
						typeof msg === "object" &&
						"type" in msg &&
						msg.type === "getStatus"
					) {
						return { userScriptsAvailable: true };
					}
					// biome-ignore lint/suspicious/noExplicitAny: extension message forwarding
					return (origSendMessage as any)(msg, ...args);
				}) as typeof chrome.runtime.sendMessage;
			});
		};

		await mockUserScriptsAvailable(page);

		// 1. Prepare script sources with version offsets for updates
		const addBtnSource = fs.readFileSync(
			path.join(import.meta.dirname, "fixtures/add_button.js"),
			"utf-8",
		);
		const shiftKSource = fs
			.readFileSync(
				path.join(import.meta.dirname, "fixtures/control_palette_overlay.js"),
				"utf-8",
			)
			.replace("@version      1.2", "@version      1.1");
		const paraCountSource = fs
			.readFileSync(
				path.join(import.meta.dirname, "fixtures/paragraph_counter.js"),
				"utf-8",
			)
			.replace("@version      1.4", "@version      1.0");
		const readingProgSource = fs
			.readFileSync(
				path.join(import.meta.dirname, "fixtures/reading_progress.js"),
				"utf-8",
			)
			.replace("// @match        https://example.com/*\n", "");
		const scrollToTopSource = fs.readFileSync(
			path.join(import.meta.dirname, "fixtures/scroll_to_top.js"),
			"utf-8",
		);

		// 2. Open dashboard and seed scripts
		await page.goto(`chrome-extension://${extensionId}/dashboard.html`);
		await page.evaluate(
			async (scripts) => {
				await chrome.runtime.sendMessage({
					type: "addScripts",
					scripts,
				});
			},
			[
				{ filename: "add_button.js", source: addBtnSource },
				{ filename: "control_palette_overlay.js", source: shiftKSource },
				{ filename: "paragraph_counter.js", source: paraCountSource },
				{ filename: "reading_progress.js", source: readingProgSource },
				{ filename: "scroll_to_top.js", source: scrollToTopSource },
			],
		);

		// Reload dashboard
		await page.reload();
		await expect(page.locator(".script-card")).toHaveCount(5);

		// Disable Reading Progress for dashboard screenshot
		const readingCard = page.locator(".script-card", {
			hasText: "Test Script - Reading Progress",
		});
		await readingCard.locator(".toggle-slider").click();

		// Trigger update check to find the 2 updates
		await page.locator(".update-link-btn").click();
		await expect(
			page.locator(".update-link-btn", { hasText: "Update all scripts (2)" }),
		).toBeVisible({ timeout: 10000 });

		// Select Shift+K Overlay card
		const shiftKCard = page.locator(".script-card", {
			hasText: "Test Script - Shift+K Overlay",
		});
		await shiftKCard.locator(".card-name").click();

		// Add space to editor to show unsaved badge
		const editor = page.locator(".cm-content");
		await editor.focus();
		await page.keyboard.press("End");
		await page.keyboard.type(" ");

		await expect(page.locator(".unsaved-header-label")).toBeVisible();
		await expect(page.locator(".metadata-panel")).toBeVisible();

		// Blur editor for a clean capture without active cursor line
		await page.locator(".editor-view-header").click();

		// Set viewport and take dashboard screenshot
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.waitForTimeout(300);
		await page.screenshot({
			path: path.join(imagesDir, "dashboard.png"),
		});

		// 3. Open target website (Vercel docs)
		const targetPage = await context.newPage();
		await targetPage.goto("https://vercel.com/docs/getting-started");
		await targetPage.bringToFront();

		// Re-enable Reading Progress so all 3 matching scripts are active
		await readingCard.locator(".toggle-slider").click();

		// 4. Open Popup page
		const popupPage = await context.newPage();
		await mockUserScriptsAvailable(popupPage);
		await targetPage.bringToFront();
		await popupPage.goto(`chrome-extension://${extensionId}/index.html`);

		await expect(popupPage.locator("#active-list .script-item")).toHaveCount(3);
		await expect(popupPage.locator("#other-list .script-item")).toHaveCount(2);

		// Hide scrollbars on popup page for clean screenshot
		await popupPage.addStyleTag({
			content: `
				::-webkit-scrollbar { display: none !important; }
				html, body { overflow: hidden !important; }
			`,
		});

		// Set popup viewport to actual Chrome extension popup dimensions (400 x 550)
		const POPUP_WIDTH = 400;
		const POPUP_HEIGHT = 550;
		await popupPage.setViewportSize({
			width: POPUP_WIDTH,
			height: POPUP_HEIGHT,
		});
		await popupPage.waitForTimeout(300);
		await popupPage.screenshot({
			path: path.join(imagesDir, "popup.png"),
		});

		// 5. Open script details overlay for Reading Progress
		const readingItem = popupPage.locator("#active-list .script-item", {
			hasText: "Test Script - Reading Progress",
		});
		await readingItem.locator(".script-info").click();
		await expect(popupPage.locator("#details-modal")).toBeVisible();

		// Scroll details so Matches badge is fully visible
		await popupPage.locator(".matches-list").scrollIntoViewIfNeeded();

		// Capture popup overlay screenshot matching actual popup window dimensions
		await popupPage.waitForTimeout(300);
		await popupPage.screenshot({
			path: path.join(imagesDir, "popup-overlay.png"),
		});

		// 6. Generate Promotional Showcase Screenshots
		const promoDir = path.join(imagesDir, "promo");
		fs.mkdirSync(promoDir, { recursive: true });

		const showcasePage = await context.newPage();
		await showcasePage.setViewportSize({ width: 1280, height: 800 });
		const showcasePath = path.join(import.meta.dirname, "promo-showcase.html");
		await showcasePage.goto(`file://${showcasePath}`);
		await showcasePage.waitForTimeout(600);

		// Slide 1: Dashboard
		await showcasePage.locator("#slide-1").screenshot({
			path: path.join(promoDir, "1-dashboard.png"),
		});

		// Slide 2: Popup Controls
		await showcasePage.locator("#slide-2").screenshot({
			path: path.join(promoDir, "2-popup.png"),
		});

		// Slide 3: Script Details
		await showcasePage.locator("#slide-3").screenshot({
			path: path.join(promoDir, "3-popup-details.png"),
		});

		await showcasePage.close();
		await targetPage.close();
		await popupPage.close();
	});
});
