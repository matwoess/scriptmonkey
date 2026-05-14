import { describe, expect, it } from "vitest";
import { escapeRegex, matchPattern } from "../../src/utils/matching";

describe("matching utils", () => {
	describe("escapeRegex", () => {
		it("escapes special regex characters", () => {
			expect(escapeRegex("https://example.com/path?foo=bar")).toBe(
				"https://example\\.com/path\\?foo=bar",
			);
			expect(escapeRegex("a*b+c(d)")).toBe("a\\*b\\+c\\(d\\)");
		});
	});

	describe("matchPattern", () => {
		it("matches exact paths", () => {
			expect(
				matchPattern("https://example.com/path", "https://example.com/path"),
			).toBe(true);
			expect(
				matchPattern("https://example.com/path", "https://example.com/other"),
			).toBe(false);
		});

		it("matches wildcards in host", () => {
			expect(
				matchPattern("https://*.example.com/*", "https://sub.example.com/foo"),
			).toBe(true);
			expect(
				matchPattern("https://*.example.com/*", "https://example.com/foo"),
			).toBe(false); // Does not match example.com without the leading dot
			expect(
				matchPattern("https://*.example.com/*", "https://other.com/foo"),
			).toBe(false);
		});

		it("matches wildcards in path", () => {
			expect(
				matchPattern(
					"https://example.com/api/*",
					"https://example.com/api/v1/users",
				),
			).toBe(true);
			expect(
				matchPattern("https://example.com/api/*", "https://example.com/api"),
			).toBe(true);
			expect(
				matchPattern("https://example.com/api/*", "https://example.com/apiv2"),
			).toBe(false);
		});

		it("matches scheme wildcards", () => {
			expect(matchPattern("*://example.com/*", "http://example.com/")).toBe(
				true,
			);
			expect(matchPattern("*://example.com/*", "https://example.com/")).toBe(
				true,
			);
			expect(matchPattern("*://example.com/*", "file://example.com/")).toBe(
				true,
			); // The current implementation allows file:// when * is used
		});

		it("handles invalid urls safely", () => {
			expect(matchPattern("https://example.com/*", "not-a-url")).toBe(false);
		});
	});
});
