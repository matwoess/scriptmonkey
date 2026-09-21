import { afterEach, describe, expect, it, vi } from "vitest";
import {
	compareVersions,
	getMatchingScripts,
	getUpdateUrl,
	normalizeVersion,
	parseMetadata,
	resolveScriptIcon,
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

const FIXTURE_WITH_INCLUDE_EXCLUDE = `
// ==UserScript==
// @name        Include Exclude Script
// @namespace   https://example.com
// @version     1.0.0
// @include     https://example.com/pages/*
// @include     /^https?:\\/\\/.*\\.example\\.org\\//
// @exclude     https://example.com/pages/admin/*
// ==/UserScript==
console.log("include exclude test");
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

	it("parses @icon tag", () => {
		const src = `
		// ==UserScript==
		// @name Icon Script
		// @icon https://example.com/icon.png
		// ==/UserScript==
		`;
		const meta = parseMetadata(src);
		expect(meta.icon).toBe("https://example.com/icon.png");
	});

	it("collects multiple @match entries into the matches array", () => {
		const meta = parseMetadata(MINIMAL_SOURCE);
		expect(meta.matches).toEqual([
			"https://example.com/*",
			"https://*.example.com/*",
		]);
	});

	it("parses @include and @exclude entries into arrays", () => {
		const meta = parseMetadata(FIXTURE_WITH_INCLUDE_EXCLUDE);
		expect(meta.include).toEqual([
			"https://example.com/pages/*",
			"/^https?:\\/\\/.*\\.example\\.org\\//",
		]);
		expect(meta.exclude).toEqual(["https://example.com/pages/admin/*"]);
	});

	it("normalises keys to lowercase", () => {
		const src = `// ==UserScript==\n// @Name Test\n// ==/UserScript==`;
		const meta = parseMetadata(src);
		expect(meta.name).toBe("Test");
	});

	it("parses @run-at and @grant fields", () => {
		const src = `
		// ==UserScript==
		// @name Test Extra
		// @run-at document-start
		// @grant GM_xmlhttpRequest
		// ==/UserScript==
		`;
		const meta = parseMetadata(src);
		expect(meta["run-at"]).toBe("document-start");
		expect(meta.grant).toBe("GM_xmlhttpRequest");
	});

	it("parses multiple @include and @exclude tags into arrays", () => {
		const src = `
		// ==UserScript==
		// @include http://*.example.com/*
		// @include https://*.example.com/*
		// @exclude https://*.google.com/*
		// ==/UserScript==
		`;
		const meta = parseMetadata(src);
		expect(meta.include).toEqual([
			"http://*.example.com/*",
			"https://*.example.com/*",
		]);
		expect(meta.exclude).toEqual(["https://*.google.com/*"]);
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

	it("includes scripts with no match or include patterns (defaulting to match all)", () => {
		const result = getMatchingScripts(
			[noMatchesScript],
			"https://example.com/page",
		);
		expect(result.map((s) => s.id)).toEqual(["d"]);
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

	it("evaluates @include and @exclude directives from script metadata", () => {
		const includeExcludeScript = makeScript({
			id: "inc-exc",
			source: FIXTURE_WITH_INCLUDE_EXCLUDE,
			meta: parseMetadata(FIXTURE_WITH_INCLUDE_EXCLUDE),
		});

		expect(
			getMatchingScripts(
				[includeExcludeScript],
				"https://example.com/pages/dashboard",
			).map((s) => s.id),
		).toEqual(["inc-exc"]);

		expect(
			getMatchingScripts(
				[includeExcludeScript],
				"https://sub.example.org/home",
			).map((s) => s.id),
		).toEqual(["inc-exc"]);

		expect(
			getMatchingScripts(
				[includeExcludeScript],
				"https://example.com/pages/admin/settings",
			),
		).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// resolveScriptIcon
// ---------------------------------------------------------------------------

describe("resolveScriptIcon", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns undefined when no icon is provided", async () => {
		expect(await resolveScriptIcon(undefined)).toBeUndefined();
		expect(await resolveScriptIcon("")).toBeUndefined();
	});

	it("returns valid data URI directly", async () => {
		const validDataUri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";
		expect(await resolveScriptIcon(validDataUri)).toBe(validDataUri);
	});

	it("rejects non-image data URI", async () => {
		expect(
			await resolveScriptIcon("data:text/javascript;base64,YWxlcnQoMSk="),
		).toBeUndefined();
	});

	it("rejects oversized data URI", async () => {
		const hugeData = `data:image/png;base64,${"A".repeat(190 * 1024)}`;
		expect(await resolveScriptIcon(hugeData)).toBeUndefined();
	});

	it("rejects non-https URLs", async () => {
		expect(
			await resolveScriptIcon("http://example.com/icon.png"),
		).toBeUndefined();
		expect(await resolveScriptIcon("file:///path/to/icon.png")).toBeUndefined();
	});

	it("rejects loopback and private IP hosts", async () => {
		expect(
			await resolveScriptIcon("https://localhost/icon.png"),
		).toBeUndefined();
		expect(
			await resolveScriptIcon("https://127.0.0.1/icon.png"),
		).toBeUndefined();
		expect(
			await resolveScriptIcon("https://192.168.1.1/icon.png"),
		).toBeUndefined();
		expect(
			await resolveScriptIcon("https://10.0.0.5/icon.png"),
		).toBeUndefined();
		expect(await resolveScriptIcon("https://[::1]/icon.png")).toBeUndefined();
		expect(
			await resolveScriptIcon("https://internal.lan/icon.png"),
		).toBeUndefined();
	});

	it("fetches, validates, and base64 encodes https image", async () => {
		const bytes = new Uint8Array([1, 2, 3, 4]);
		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(bytes, {
				headers: { "content-type": "image/png" },
			}),
		);

		const result = await resolveScriptIcon("https://example.com/icon.png");
		expect(result).toBe("data:image/png;base64,AQIDBA==");
	});

	it("rejects responses with non-image Content-Type", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response("console.log(1)", {
				headers: { "content-type": "text/html" },
			}),
		);

		const result = await resolveScriptIcon("https://example.com/icon.png");
		expect(result).toBeUndefined();
	});

	it("rejects responses exceeding max bytes", async () => {
		const bigBytes = new Uint8Array(130 * 1024);
		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(bigBytes, {
				headers: { "content-type": "image/png" },
			}),
		);

		const result = await resolveScriptIcon("https://example.com/icon.png");
		expect(result).toBeUndefined();
	});

	it("returns undefined on fetch network error", async () => {
		vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
			new Error("Network failure"),
		);

		const result = await resolveScriptIcon("https://example.com/icon.png");
		expect(result).toBeUndefined();
	});
});
