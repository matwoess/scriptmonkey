import { describe, expect, it } from "vitest";
import {
	escapeRegex,
	matchIncludeExclude,
	matchPattern,
	scriptMatchesUrl,
} from "../../src/utils/matching";

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

	describe("matchIncludeExclude", () => {
		it("handles regex patterns", () => {
			expect(
				matchIncludeExclude(
					"/^https?:\\/\\/example\\.com\\/page/",
					"https://example.com/page?id=1",
				),
			).toBe(true);
			expect(
				matchIncludeExclude(
					"/^https?:\\/\\/example\\.com\\/page/",
					"https://example.org/page",
				),
			).toBe(false);
		});

		it("handles invalid regex safely", () => {
			expect(matchIncludeExclude("/[unclosed/", "https://example.com/")).toBe(
				false,
			);
		});

		it("handles glob wildcards including query strings", () => {
			expect(
				matchIncludeExclude(
					"http://example.com/page?id=*",
					"http://example.com/page?id=42",
				),
			).toBe(true);
			expect(
				matchIncludeExclude(
					"http://example.com/page?id=*",
					"http://example.com/page",
				),
			).toBe(false);
		});

		it("handles .tld in domain patterns", () => {
			expect(
				matchIncludeExclude(
					"http://example.tld/test",
					"http://example.com/test",
				),
			).toBe(true);
			expect(
				matchIncludeExclude(
					"http://example.tld/test",
					"http://example.org/test",
				),
			).toBe(true);
		});
	});

	describe("scriptMatchesUrl", () => {
		it("matches @include when @match is empty", () => {
			expect(
				scriptMatchesUrl(
					{ matches: [], include: ["https://example.com/*"] },
					"https://example.com/test",
				),
			).toBe(true);
		});

		it("respects @exclude over @match and @include", () => {
			expect(
				scriptMatchesUrl(
					{
						matches: ["https://example.com/*"],
						exclude: ["https://example.com/admin/*"],
					},
					"https://example.com/admin/dashboard",
				),
			).toBe(false);
		});

		it("returns false when no rules match", () => {
			expect(
				scriptMatchesUrl(
					{ matches: ["https://example.com/*"] },
					"https://other.com/test",
				),
			).toBe(false);
		});

		it("defaults to matching all pages when matches and include are both empty", () => {
			expect(
				scriptMatchesUrl({ matches: [] }, "https://example.com/test"),
			).toBe(true);
		});
	});
});
