export const USER_SCRIPT_BLOCK_REGEX =
	/\/\/\s*==UserScript==([\s\S]*?)\/\/\s*==\/UserScript==/;

export function isValidScriptExtension(filename: string): boolean {
	const trimmed = filename.trim().toLowerCase();
	if (!trimmed.endsWith(".js")) {
		return false;
	}
	const base = trimmed.endsWith(".user.js")
		? trimmed.slice(0, -".user.js".length)
		: trimmed.slice(0, -".js".length);
	return base.length > 0;
}

export function isBinarySource(source: string): boolean {
	return source.includes("\0");
}

export function hasUserScriptMetadata(source: string): boolean {
	return USER_SCRIPT_BLOCK_REGEX.test(source);
}

export function validateScriptFile(entry: {
	filename: string;
	source: string;
}): void {
	if (!isValidScriptExtension(entry.filename)) {
		throw new Error(
			`Invalid file extension for "${entry.filename}". Only .js files are supported.`,
		);
	}
	const trimmed = entry.source.trim();
	if (!trimmed) {
		throw new Error(`Script source is empty for "${entry.filename}".`);
	}
	if (isBinarySource(entry.source)) {
		throw new Error(
			`"${entry.filename}" appears to be a binary file and cannot be imported.`,
		);
	}
	if (!hasUserScriptMetadata(trimmed)) {
		throw new Error(
			`"${entry.filename}" does not contain a valid ==UserScript== metadata block.`,
		);
	}
}
