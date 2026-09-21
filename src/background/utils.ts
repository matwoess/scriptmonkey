import type { Script, ScriptMeta } from "../types";
import { scriptMatchesUrl } from "../utils/matching";

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
		if (key === "include" || key === "exclude") {
			const arrKey = key === "include" ? "include" : "exclude";
			if (!meta[arrKey]) {
				meta[arrKey] = [];
			}
			(meta[arrKey] as string[]).push(value);
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
		if (!script.enabled) {
			return false;
		}

		return scriptMatchesUrl(script.meta, url);
	});
}

const MAX_ICON_BYTES = 128 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
	"image/png",
	"image/jpeg",
	"image/gif",
	"image/webp",
	"image/svg+xml",
	"image/x-icon",
	"image/vnd.microsoft.icon",
]);

function isPrivateHost(hostname: string): boolean {
	const host = hostname.toLowerCase();
	if (
		host === "localhost" ||
		host.endsWith(".localhost") ||
		host.endsWith(".local") ||
		host.endsWith(".internal") ||
		host.endsWith(".lan") ||
		host === "0.0.0.0" ||
		host.startsWith("[") ||
		host.includes(":")
	) {
		return true;
	}

	const ipv4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
	if (!ipv4) {
		return false;
	}

	const [b0, b1] = [Number(ipv4[1]), Number(ipv4[2])];
	return (
		b0 === 127 ||
		b0 === 10 ||
		b0 === 0 ||
		(b0 === 172 && b1 >= 16 && b1 <= 31) ||
		(b0 === 192 && b1 === 168) ||
		(b0 === 169 && b1 === 254)
	);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	const chunkSize = 8192;
	for (let i = 0; i < bytes.length; i += chunkSize) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
	}
	return btoa(binary);
}

/** Fetches, validates, and encodes a script icon into a data URI. */
export async function resolveScriptIcon(
	iconUrl?: string,
): Promise<string | undefined> {
	if (!iconUrl) {
		return undefined;
	}

	if (iconUrl.startsWith("data:")) {
		const match = iconUrl.match(/^data:([^;,]+)(;base64)?,/i);
		if (!match) {
			return undefined;
		}
		const mime = match[1].toLowerCase();
		if (!ALLOWED_IMAGE_TYPES.has(mime) || iconUrl.length > 180 * 1024) {
			return undefined;
		}
		return iconUrl;
	}

	try {
		const parsed = new URL(iconUrl);
		if (parsed.protocol !== "https:" || isPrivateHost(parsed.hostname)) {
			return undefined;
		}

		const response = await fetch(parsed.href, {
			cache: "no-store",
			signal: AbortSignal.timeout(5000),
		});

		if (!response.ok) {
			return undefined;
		}

		const rawType = response.headers.get("content-type") ?? "";
		const mime = rawType.split(";")[0].trim().toLowerCase();
		if (!ALLOWED_IMAGE_TYPES.has(mime)) {
			return undefined;
		}

		const contentLength = Number(response.headers.get("content-length"));
		if (contentLength > MAX_ICON_BYTES) {
			return undefined;
		}

		const buffer = await response.arrayBuffer();
		if (buffer.byteLength > MAX_ICON_BYTES) {
			return undefined;
		}

		const base64 = arrayBufferToBase64(buffer);
		return `data:${mime};base64,${base64}`;
	} catch {
		return undefined;
	}
}
