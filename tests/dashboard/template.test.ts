import { describe, expect, it } from "vitest";
import { parseMetadata } from "../../src/background/utils";
import { DEFAULT_SCRIPT_TEMPLATE } from "../../src/dashboard/App";

describe("DEFAULT_SCRIPT_TEMPLATE", () => {
	it("contains standard UserScript metadata block", () => {
		expect(DEFAULT_SCRIPT_TEMPLATE).toContain("// ==UserScript==");
		expect(DEFAULT_SCRIPT_TEMPLATE).toContain("// ==/UserScript==");
		expect(DEFAULT_SCRIPT_TEMPLATE).toContain("// @name         New Script");
	});

	it("parses correctly with parseMetadata", () => {
		const meta = parseMetadata(DEFAULT_SCRIPT_TEMPLATE);
		expect(meta.name).toBe("New Script");
		expect(meta.version).toBe("1.0.0");
		expect(meta.matches).toEqual(["https://*/*"]);
		expect(meta.grant).toBeUndefined();
	});
});
