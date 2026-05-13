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
			"^" + escapeRegex(hostPattern).replace(/\\\*/g, ".*") + "$",
			"i",
		);
		if (!hostRegex.test(url.host)) {
			return false;
		}

		let pathRegexStr = "^" + escapeRegex(pathPattern);
		pathRegexStr = pathRegexStr.replace(/\/\\\*$/, "(?:[/?#].*)?");
		pathRegexStr = pathRegexStr.replace(/\\\*/g, ".*") + "$";
		const pathRegex = new RegExp(pathRegexStr);
		return pathRegex.test(`${url.pathname}${url.search}${url.hash}`);
	} catch {
		return false;
	}
}
