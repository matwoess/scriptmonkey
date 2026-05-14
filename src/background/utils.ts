import type { Script, ScriptMeta } from "../types";
import { matchPattern } from "../utils/matching";

/** Parses the ==UserScript== metadata block from a script source string. */
export function parseMetadata(source: string): ScriptMeta {
	const meta: ScriptMeta = { matches: [] };
	const block = source.match(
		/\/\/\s*==UserScript==([\s\S]*?)\/\/\s*==\/UserScript==/,
	);
	if (!block) {
		return meta;
	}

	for (const line of block[1].split("\n")) {
		const match = line.match(/\/\/\s*@([^\s]+)\s+(.*)/);
		if (!match) {
			continue;
		}

		const [, rawKey, rawValue] = match;
		const key = rawKey.toLowerCase();
		const value = rawValue.trim();
		if (key === "match") {
			meta.matches.push(value);
			continue;
		}

		meta[key] = value;
	}

	return meta;
}

/** Splits a version string into comparable parts (numbers stay numeric). */
export function normalizeVersion(version?: string): (string | number)[] {
	return (version ?? "")
		.split(/[^0-9A-Za-z]+/)
		.filter(Boolean)
		.map((part) => (/^\d+$/.test(part) ? Number(part) : part.toLowerCase()));
}

/** Returns positive if left > right, negative if left < right, 0 if equal. */
export function compareVersions(left?: string, right?: string): number {
	const a = normalizeVersion(left);
	const b = normalizeVersion(right);
	const length = Math.max(a.length, b.length);

	for (let index = 0; index < length; index += 1) {
		const leftPart = a[index] ?? 0;
		const rightPart = b[index] ?? 0;

		if (leftPart === rightPart) {
			continue;
		}

		if (typeof leftPart === typeof rightPart) {
			return leftPart > rightPart ? 1 : -1;
		}

		return typeof leftPart === "number" ? 1 : -1;
	}

	return 0;
}

/** Returns the URL to use for fetching script updates. */
export function getUpdateUrl(script: Script): string | null {
	return (
		(script.meta.downloadurl as string | undefined) ??
		(script.meta.updateurl as string | undefined) ??
		null
	);
}

/** Filters scripts that are enabled and match the given URL. */
export function getMatchingScripts(scripts: Script[], url: string): Script[] {
	return scripts.filter((script) => {
		if (!script.enabled || script.meta.matches.length === 0) {
			return false;
		}

		return script.meta.matches.some((pattern) => matchPattern(pattern, url));
	});
}
