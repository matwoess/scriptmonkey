import { describe, expect, it } from "vitest";
import {
	hasUserScriptMetadata,
	isBinarySource,
	isValidScriptExtension,
	validateScriptFile,
} from "../../src/utils/validation";

const VALID_SCRIPT_SOURCE = `// ==UserScript==
// @name         Test Script
// @match        https://example.com/*
// ==/UserScript==
console.log("running");
`;

describe("isValidScriptExtension", () => {
	it("accepts .user.js and .js extensions case-insensitively", () => {
		expect(isValidScriptExtension("script.user.js")).toBe(true);
		expect(isValidScriptExtension("script.js")).toBe(true);
		expect(isValidScriptExtension("MY-SCRIPT.USER.JS")).toBe(true);
		expect(isValidScriptExtension("nested.sub.dev.js")).toBe(true);
	});

	it("rejects non-script extensions and empty filenames", () => {
		expect(isValidScriptExtension("text-file.txt")).toBe(false);
		expect(isValidScriptExtension("image.png")).toBe(false);
		expect(isValidScriptExtension("binary.bin")).toBe(false);
		expect(isValidScriptExtension("document.pdf")).toBe(false);
		expect(isValidScriptExtension(".js")).toBe(false);
		expect(isValidScriptExtension(".user.js")).toBe(false);
		expect(isValidScriptExtension("")).toBe(false);
		expect(isValidScriptExtension("   ")).toBe(false);
	});
});

describe("isBinarySource", () => {
	it("detects null bytes in binary content", () => {
		expect(isBinarySource("PNG\r\n\x1a\n\0\0\0\rIHDR")).toBe(true);
		expect(isBinarySource("plain text script")).toBe(false);
	});
});

describe("hasUserScriptMetadata", () => {
	it("returns true when ==UserScript== block is present", () => {
		expect(hasUserScriptMetadata(VALID_SCRIPT_SOURCE)).toBe(true);
		expect(
			hasUserScriptMetadata(
				"/* note */ // ==UserScript==\n// @name T\n// ==/UserScript==\n",
			),
		).toBe(true);
	});

	it("returns false when ==UserScript== block is absent or incomplete", () => {
		expect(hasUserScriptMetadata("console.log('hello world');")).toBe(false);
		expect(
			hasUserScriptMetadata("// ==UserScript==\n// missing closing tag"),
		).toBe(false);
		expect(hasUserScriptMetadata("")).toBe(false);
	});
});

describe("validateScriptFile", () => {
	it("succeeds for valid script files", () => {
		expect(() =>
			validateScriptFile({
				filename: "my-script.user.js",
				source: VALID_SCRIPT_SOURCE,
			}),
		).not.toThrow();
	});

	it("throws for invalid file extensions", () => {
		expect(() =>
			validateScriptFile({
				filename: "text-file.txt",
				source: VALID_SCRIPT_SOURCE,
			}),
		).toThrow('Invalid file extension for "text-file.txt"');
	});

	it("throws for empty source", () => {
		expect(() =>
			validateScriptFile({
				filename: "empty.user.js",
				source: "   ",
			}),
		).toThrow('Script source is empty for "empty.user.js"');
	});

	it("throws for binary content", () => {
		expect(() =>
			validateScriptFile({
				filename: "binary.user.js",
				source: "binary\0data",
			}),
		).toThrow('"binary.user.js" appears to be a binary file');
	});

	it("throws when ==UserScript== metadata block is missing", () => {
		expect(() =>
			validateScriptFile({
				filename: "plain.js",
				source: 'console.log("no metadata");',
			}),
		).toThrow(
			'"plain.js" does not contain a valid ==UserScript== metadata block',
		);
	});
});
