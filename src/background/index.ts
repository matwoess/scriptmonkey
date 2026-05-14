import type { ExtensionMessage, Script, UpdateInfo } from "../types";
import {
	compareVersions,
	getMatchingScripts,
	getUpdateUrl,
	parseMetadata,
} from "./utils";

const STORAGE_KEY = "scriptmonkey_scripts";

function canUseUserScripts(): boolean {
	return Boolean(chrome.userScripts?.register);
}

async function loadScripts(): Promise<Script[]> {
	const { [STORAGE_KEY]: scripts } =
		await chrome.storage.local.get(STORAGE_KEY);
	return (scripts as Script[] | undefined) ?? [];
}

async function saveScripts(scripts: Script[]): Promise<void> {
	await chrome.storage.local.set({ [STORAGE_KEY]: scripts });
}

async function fetchScriptUpdate(script: Script): Promise<{
	canUpdate: boolean;
	source?: string;
	meta?: ScriptMeta;
	hasUpdate?: boolean;
}> {
	const url = getUpdateUrl(script);
	if (!url) {
		return { canUpdate: false };
	}

	const response = await fetch(url, { cache: "no-store" });
	if (!response.ok) {
		throw new Error(`Update check failed (${String(response.status)}).`);
	}

	const source = await response.text();
	const meta = parseMetadata(source);
	return {
		canUpdate: true,
		source,
		meta,
		hasUpdate: compareVersions(meta.version, script.meta.version) > 0,
	};
}

function toRegisteredScript(
	script: Script,
): chrome.userScripts.RegisteredUserScript {
	return {
		id: script.id,
		matches: script.meta.matches,
		js: [{ code: script.source }],
		runAt:
			script.meta["run-at"] === "document-start"
				? "document_start"
				: "document_idle",
		world: "MAIN",
	};
}

async function updateBadgeForTab(tabId: number, url?: string): Promise<void> {
	try {
		if (!url || (!url.startsWith("http") && !url.startsWith("file"))) {
			await chrome.action.setBadgeText({ text: "", tabId });
			return;
		}
		const scripts = await loadScripts();
		const active = getMatchingScripts(scripts, url);
		const text = active.length > 0 ? active.length.toString() : "";
		await chrome.action.setBadgeText({ text, tabId });
		await chrome.action.setBadgeBackgroundColor({ color: "#3b82f6", tabId });
	} catch (_err: unknown) {
		// ignore
	}
}

async function updateAllBadges(): Promise<void> {
	try {
		const tabs = await chrome.tabs.query({});
		const scripts = await loadScripts();
		for (const tab of tabs) {
			if (tab.id === undefined) continue;
			if (
				!tab.url ||
				(!tab.url.startsWith("http") && !tab.url.startsWith("file"))
			) {
				chrome.action.setBadgeText({ text: "", tabId: tab.id }).catch(() => {});
				continue;
			}
			const active = getMatchingScripts(scripts, tab.url);
			const text = active.length > 0 ? active.length.toString() : "";
			chrome.action.setBadgeText({ text, tabId: tab.id }).catch(() => {});
			chrome.action
				.setBadgeBackgroundColor({ color: "#3b82f6", tabId: tab.id })
				.catch(() => {});
		}
	} catch (error) {
		console.warn("[Scriptmonkey] Failed to update badges.", error);
	}
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (changeInfo.url) {
		updateBadgeForTab(tabId, changeInfo.url).catch(() => {});
	} else if (changeInfo.status === "complete" && tab.url) {
		updateBadgeForTab(tabId, tab.url).catch(() => {});
	}
});

chrome.tabs.onActivated.addListener((activeInfo) => {
	chrome.tabs.get(activeInfo.tabId, (tab) => {
		if (tab?.url) updateBadgeForTab(tab.id, tab.url).catch(() => {});
	});
});

async function syncRegisteredScripts(): Promise<void> {
	if (!canUseUserScripts()) {
		return;
	}

	const existing = await chrome.userScripts.getScripts();
	if (existing.length) {
		await chrome.userScripts.unregister({
			ids: existing.map((script) => script.id),
		});
	}

	const scripts = await loadScripts();
	const enabled = scripts.filter(
		(script) => script.enabled && script.meta.matches.length > 0,
	);

	if (enabled.length) {
		await chrome.userScripts.register(enabled.map(toRegisteredScript));
	}

	updateAllBadges().catch(() => {});
}

chrome.runtime.onInstalled.addListener(() => {
	syncRegisteredScripts().catch((error: unknown) => {
		console.warn("[Scriptmonkey] Failed to sync registered scripts.", error);
	});
});

chrome.runtime.onStartup.addListener(() => {
	syncRegisteredScripts().catch((error: unknown) => {
		console.warn("[Scriptmonkey] Failed to sync registered scripts.", error);
	});
});

chrome.runtime.onMessage.addListener(
	(message: ExtensionMessage, _sender, sendResponse) => {
		handleMessage(message)
			.then(sendResponse)
			.catch((error: unknown) => {
				sendResponse({
					error: error instanceof Error ? error.message : String(error),
				});
			});
		return true;
	},
);

async function handleMessage(message: ExtensionMessage): Promise<unknown> {
	switch (message.type) {
		case "getStatus":
			return { userScriptsAvailable: canUseUserScripts() };

		case "getScripts":
			return await loadScripts();

		case "toggleScript": {
			const scripts = await loadScripts();
			const script = scripts.find((item) => item.id === message.id);
			if (script) {
				script.enabled = !script.enabled;
				await saveScripts(scripts);
				await syncRegisteredScripts();
			}
			return scripts;
		}

		case "addScripts": {
			const entries = message.scripts;
			if (!entries.length) {
				return await loadScripts();
			}

			const scripts = await loadScripts();
			for (const entry of entries) {
				const source = entry.source.trim();
				if (!source) {
					throw new Error(`Script source is empty for ${entry.filename}.`);
				}

				const meta = parseMetadata(source);
				if (!meta.matches.length) {
					throw new Error(
						`Script is missing at least one @match rule: ${entry.filename}.`,
					);
				}

				const existingIndex = meta.name
					? scripts.findIndex(
							(s) =>
								s.meta.name === meta.name &&
								s.meta.namespace === meta.namespace,
						)
					: -1;

				if (existingIndex >= 0) {
					scripts[existingIndex] = {
						...scripts[existingIndex],
						filename: entry.filename,
						source,
						meta,
						updatedAt: Date.now(),
					};
				} else {
					scripts.push({
						id: crypto.randomUUID(),
						filename: entry.filename,
						source,
						meta,
						enabled: true,
						createdAt: Date.now(),
					});
				}
			}

			await saveScripts(scripts);
			await syncRegisteredScripts();
			return scripts;
		}

		case "checkForUpdates": {
			const scripts = await loadScripts();
			const updates: UpdateInfo[] = [];

			for (const script of scripts) {
				try {
					const result = await fetchScriptUpdate(script);
					updates.push({
						id: script.id,
						canUpdate: result.canUpdate,
						hasUpdate: result.hasUpdate ?? false,
						currentVersion: script.meta.version ?? null,
						nextVersion: result.meta?.version ?? null,
					});
				} catch (error) {
					updates.push({
						id: script.id,
						canUpdate: Boolean(getUpdateUrl(script)),
						hasUpdate: false,
						currentVersion: script.meta.version ?? null,
						nextVersion: null,
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}

			return updates;
		}

		case "updateScript": {
			const scripts = await loadScripts();
			const script = scripts.find((item) => item.id === message.id);
			if (!script) {
				throw new Error("Script not found.");
			}

			const result = await fetchScriptUpdate(script);
			if (!result.canUpdate) {
				throw new Error("Script does not define @updateURL or @downloadURL.");
			}

			if (!result.hasUpdate || !result.source || !result.meta) {
				return { updated: false };
			}

			script.source = result.source;
			script.meta = result.meta;
			script.updatedAt = Date.now();
			await saveScripts(scripts);
			await syncRegisteredScripts();
			return { updated: true, version: result.meta.version ?? null };
		}

		case "removeScript": {
			const scripts = (await loadScripts()).filter(
				(script) => script.id !== message.id,
			);
			await saveScripts(scripts);
			await syncRegisteredScripts();
			return scripts;
		}

		case "updateAllScripts": {
			const scripts = await loadScripts();
			let changed = false;
			for (const script of scripts) {
				try {
					const result = await fetchScriptUpdate(script);
					if (result.hasUpdate && result.source && result.meta) {
						script.source = result.source;
						script.meta = result.meta;
						script.updatedAt = Date.now();
						changed = true;
					}
				} catch {
					// Skip scripts that fail to update.
				}
			}
			if (changed) {
				await saveScripts(scripts);
				await syncRegisteredScripts();
			}
			return null;
		}

		default:
			return null;
	}
}

syncRegisteredScripts().catch((error: unknown) => {
	console.warn("[Scriptmonkey] Failed to sync registered scripts.", error);
});
