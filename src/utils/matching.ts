import type { ScriptMeta } from "../types";

export function escapeRegex(value: string): string {
	return value.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
}

export function matchPattern(pattern: string, urlString: string): boolean {
	try {
		const url = new URL(urlString);
		const parsed = pattern.match(
			/^(\*|http|https|file|ftp):\/\/([^/]+)(\/.*)$/,
		);
		if (!parsed) {
			return false;
		}

		const [, schemePattern, hostPattern, pathPattern] = parsed;

		if (schemePattern !== "*" && schemePattern !== url.protocol.slice(0, -1)) {
			return false;
		}

		const hostRegex = new RegExp(
			`^${escapeRegex(hostPattern).replace(/\\\*/g, ".*")}$`,
			"i",
		);
		if (!hostRegex.test(url.host)) {
			return false;
		}

		let pathRegexStr = `^${escapeRegex(pathPattern)}`;
		pathRegexStr = pathRegexStr.replace(/\/\\\*$/, "(?:[/?#].*)?");
		pathRegexStr = `${pathRegexStr.replace(/\\\*/g, ".*")}$`;
		const pathRegex = new RegExp(pathRegexStr);
		return pathRegex.test(`${url.pathname}${url.search}${url.hash}`);
	} catch {
		return false;
	}
}

export function matchIncludeExclude(
	pattern: string,
	urlString: string,
): boolean {
	if (!pattern || !urlString) {
		return false;
	}

	if (pattern.startsWith("/") && pattern.endsWith("/") && pattern.length >= 2) {
		try {
			const regex = new RegExp(pattern.slice(1, -1), "i");
			return regex.test(urlString);
		} catch {
			return false;
		}
	}

	if (matchPattern(pattern, urlString)) {
		return true;
	}

	try {
		const globRegexStr = pattern
			.replace(/[|\\{}()[\]^$+?.]/g, "\\$&")
			.replace(/\\\.\btld\b/gi, "\\.[a-z]+")
			.replace(/\*/g, ".*");
		return new RegExp(`^${globRegexStr}$`, "i").test(urlString);
	} catch {
		return false;
	}
}

function toArray(val: string | string[] | undefined): string[] {
	if (!val) {
		return [];
	}
	return Array.isArray(val) ? val : [val];
}

export function scriptMatchesUrl(meta: ScriptMeta, urlString: string): boolean {
	if (
		!urlString ||
		(!urlString.startsWith("http://") &&
			!urlString.startsWith("https://") &&
			!urlString.startsWith("file://") &&
			!urlString.startsWith("ftp://"))
	) {
		return false;
	}

	const excludes = toArray(meta.exclude);
	if (excludes.some((pattern) => matchIncludeExclude(pattern, urlString))) {
		return false;
	}

	const matches = toArray(meta.matches);
	const includes = toArray(meta.include);

	if (matches.length === 0 && includes.length === 0) {
		return true;
	}

	const hasMatch = matches.some(
		(pattern) =>
			matchPattern(pattern, urlString) ||
			matchIncludeExclude(pattern, urlString),
	);
	if (hasMatch) {
		return true;
	}

	return includes.some((pattern) => matchIncludeExclude(pattern, urlString));
}
