import { describe, expect, it } from "vitest";
import {
	compareVersions,
	getMatchingScripts,
	getUpdateUrl,
	normalizeVersion,
	parseMetadata,
} from "../../src/background/utils";
import type { Script } from "../../src/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeScript(overrides: Partial<Script> = {}): Script {
	return {
		id: "test-id",
		filename: "test.user.js",
		source: "",
		meta: { matches: ["https://example.com/*"] },
		enabled: true,
		createdAt: 0,
		...overrides,
	};
}

const MINIMAL_SOURCE = `
// ==UserScript==
// @name        My Script
// @namespace   https://example.com
// @version     1.0.0
// @description A test script
// @match       https://example.com/*
// @match       https://*.example.com/*
// ==/UserScript==
console.log("hello");
`;

// ---------------------------------------------------------------------------
// parseMetadata
// ---------------------------------------------------------------------------

describe("parseMetadata", () => {
	it("returns empty meta when no block is present", () => {
		const meta = parseMetadata("console.log('no metadata here')");
		expect(meta).toEqual({ matches: [] });
	});

	it("parses standard fields", () => {
		const meta = parseMetadata(MINIMAL_SOURCE);
		expect(meta.name).toBe("My Script");
		expect(meta.namespace).toBe("https://example.com");
		expect(meta.version).toBe("1.0.0");
		expect(meta.description).toBe("A test script");
	});

	it("collects multiple @match entries into the matches array", () => {
		const meta = parseMetadata(MINIMAL_SOURCE);
		expect(meta.matches).toEqual([
			"https://example.com/*",
			"https://*.example.com/*",
		]);
	});

	it("normalises keys to lowercase", () => {
		const src = `// ==UserScript==\n// @Name Test\n// ==/UserScript==`;
		const meta = parseMetadata(src);
		expect(meta.name).toBe("Test");
	});
});

// ---------------------------------------------------------------------------
// normalizeVersion / compareVersions
// ---------------------------------------------------------------------------

describe("normalizeVersion", () => {
	it("splits dotted version into numbers", () => {
		expect(normalizeVersion("1.2.3")).toEqual([1, 2, 3]);
	});

	it("handles missing version", () => {
		expect(normalizeVersion(undefined)).toEqual([]);
		expect(normalizeVersion("")).toEqual([]);
	});

	it("keeps non-numeric segments as lowercase strings", () => {
		expect(normalizeVersion("1.0.0-beta")).toEqual([1, 0, 0, "beta"]);
	});
});

describe("compareVersions", () => {
	it("returns 0 for equal versions", () => {
		expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
	});

	it("returns positive when left is newer", () => {
		expect(compareVersions("2.0.0", "1.9.9")).toBeGreaterThan(0);
		expect(compareVersions("1.1.0", "1.0.9")).toBeGreaterThan(0);
	});

	it("returns negative when left is older", () => {
		expect(compareVersions("1.0.0", "1.0.1")).toBeLessThan(0);
	});

	it("treats missing version as older than any real version", () => {
		expect(compareVersions(undefined, "1.0.0")).toBeLessThan(0);
	});

	it("numeric segments outrank string segments (pre-release < release)", () => {
		// "beta" is string, 0 is number — number wins → 1.0.0 > 1.0.0-beta
		expect(compareVersions("1.0.0", "1.0.0-beta")).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// getUpdateUrl
// ---------------------------------------------------------------------------

describe("getUpdateUrl", () => {
	it("returns downloadurl when present", () => {
		const script = makeScript({
			meta: {
				matches: [],
				downloadurl: "https://cdn.example.com/script.user.js",
			},
		});
		expect(getUpdateUrl(script)).toBe("https://cdn.example.com/script.user.js");
	});

	it("falls back to updateurl", () => {
		const script = makeScript({
			meta: {
				matches: [],
				updateurl: "https://cdn.example.com/update.meta.js",
			},
		});
		expect(getUpdateUrl(script)).toBe("https://cdn.example.com/update.meta.js");
	});

	it("prefers downloadurl over updateurl", () => {
		const script = makeScript({
			meta: {
				matches: [],
				downloadurl: "https://dl.example.com/script.user.js",
				updateurl: "https://update.example.com/meta.js",
			},
		});
		expect(getUpdateUrl(script)).toBe("https://dl.example.com/script.user.js");
	});

	it("returns null when neither url is set", () => {
		const script = makeScript({ meta: { matches: [] } });
		expect(getUpdateUrl(script)).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// getMatchingScripts
// ---------------------------------------------------------------------------

describe("getMatchingScripts", () => {
	const matchingScript = makeScript({
		id: "a",
		meta: { matches: ["https://example.com/*"] },
	});
	const otherScript = makeScript({
		id: "b",
		meta: { matches: ["https://other.com/*"] },
	});
	const disabledScript = makeScript({ id: "c", enabled: false });
	const noMatchesScript = makeScript({ id: "d", meta: { matches: [] } });

	it("returns scripts whose patterns match the url", () => {
		const result = getMatchingScripts(
			[matchingScript, otherScript],
			"https://example.com/page",
		);
		expect(result.map((s) => s.id)).toEqual(["a"]);
	});

	it("excludes disabled scripts", () => {
		const result = getMatchingScripts(
			[disabledScript],
			"https://example.com/page",
		);
		expect(result).toHaveLength(0);
	});

	it("excludes scripts with no match patterns", () => {
		const result = getMatchingScripts(
			[noMatchesScript],
			"https://example.com/page",
		);
		expect(result).toHaveLength(0);
	});

	it("returns multiple matches when several scripts apply", () => {
		const wildcard = makeScript({
			id: "e",
			meta: { matches: ["https://example.com/*", "https://other.com/*"] },
		});
		const result = getMatchingScripts(
			[matchingScript, wildcard],
			"https://example.com/",
		);
		expect(result.map((s) => s.id)).toEqual(["a", "e"]);
	});
});
