const STORAGE_KEY = "scriptmonkey_scripts";

function canUseUserScripts() {
  return Boolean(chrome.userScripts?.register);
}

function parseMetadata(source) {
  const meta = { matches: [] };
  const block = source.match(/\/\/\s*==UserScript==([\s\S]*?)\/\/\s*==\/UserScript==/);
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

async function loadScripts() {
  const { [STORAGE_KEY]: scripts } = await chrome.storage.local.get(STORAGE_KEY);
  return scripts ?? [];
}

async function saveScripts(scripts) {
  await chrome.storage.local.set({ [STORAGE_KEY]: scripts });
}

function normalizeVersion(version) {
  return (version ?? "")
    .split(/[^0-9A-Za-z]+/)
    .filter(Boolean)
    .map(part => (/^\d+$/.test(part) ? Number(part) : part.toLowerCase()));
}

function compareVersions(left, right) {
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

function getUpdateUrl(script) {
  return script.meta.downloadurl ?? script.meta.updateurl ?? null;
}

async function fetchScriptUpdate(script) {
  const url = getUpdateUrl(script);
  if (!url) {
    return { canUpdate: false };
  }

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Update check failed (${response.status}).`);
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

function escapeRegex(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function matchPattern(pattern, urlString) {
  try {
    const url = new URL(urlString);
    const parsed = pattern.match(/^(\*|http|https|file|ftp):\/\/([^/]+)(\/.*)$/);
    if (!parsed) {
      return false;
    }

    const [, schemePattern, hostPattern, pathPattern] = parsed;

    if (schemePattern !== "*" && schemePattern !== url.protocol.slice(0, -1)) {
      return false;
    }

    const hostRegex = new RegExp(
      "^" + escapeRegex(hostPattern).replace(/\*/g, ".*") + "$",
      "i"
    );
    if (!hostRegex.test(url.host)) {
      return false;
    }

    const pathRegex = new RegExp("^" + escapeRegex(pathPattern).replace(/\*/g, ".*") + "$");
    return pathRegex.test(`${url.pathname}${url.search}${url.hash}`);
  } catch {
    return false;
  }
}

function getMatchingScripts(scripts, url) {
  return scripts.filter(script => {
    if (!script.enabled || !script.meta.matches?.length) {
      return false;
    }

    return script.meta.matches.some(pattern => matchPattern(pattern, url));
  });
}

function toRegisteredScript(script) {
  return {
    id: script.id,
    matches: script.meta.matches,
    js: [{ code: script.source }],
    runAt: script.meta["run-at"] === "document-start" ? "document_start" : "document_idle",
    world: "MAIN",
  };
}

async function updateBadgeForTab(tabId, url) {
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
  } catch (err) {
    // ignore
  }
}

async function updateAllBadges() {
  try {
    const tabs = await chrome.tabs.query({});
    const scripts = await loadScripts();
    for (const tab of tabs) {
      if (!tab.url || (!tab.url.startsWith("http") && !tab.url.startsWith("file"))) {
        chrome.action.setBadgeText({ text: "", tabId: tab.id }).catch(() => {});
        continue;
      }
      const active = getMatchingScripts(scripts, tab.url);
      const text = active.length > 0 ? active.length.toString() : "";
      chrome.action.setBadgeText({ text, tabId: tab.id }).catch(() => {});
      chrome.action.setBadgeBackgroundColor({ color: "#3b82f6", tabId: tab.id }).catch(() => {});
    }
  } catch (error) {
    console.warn("[Scriptmonkey] Failed to update badges.", error);
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    updateBadgeForTab(tabId, changeInfo.url);
  } else if (changeInfo.status === "complete" && tab.url) {
    updateBadgeForTab(tabId, tab.url);
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab && tab.url) updateBadgeForTab(tab.id, tab.url);
  });
});

async function syncRegisteredScripts() {
  if (!canUseUserScripts()) {
    return;
  }

  const existing = await chrome.userScripts.getScripts();
  if (existing.length) {
    await chrome.userScripts.unregister({ ids: existing.map(script => script.id) });
  }

  const scripts = await loadScripts();
  const enabled = scripts.filter(script => script.enabled && script.meta.matches?.length);
  
  if (enabled.length) {
    await chrome.userScripts.register(enabled.map(toRegisteredScript));
  }
  
  updateAllBadges();
}

chrome.runtime.onInstalled.addListener(() => {
  syncRegisteredScripts().catch(error => {
    console.warn("[Scriptmonkey] Failed to sync registered scripts.", error);
  });
});

chrome.runtime.onStartup.addListener(() => {
  syncRegisteredScripts().catch(error => {
    console.warn("[Scriptmonkey] Failed to sync registered scripts.", error);
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch(error => sendResponse({ error: error.message }));
  return true;
});

async function handleMessage(message) {
  switch (message.type) {
    case "getStatus":
      return { userScriptsAvailable: canUseUserScripts() };

    case "getScripts":
      return await loadScripts();

    case "getScriptsForUrl": {
      if (!message.url) {
        return [];
      }

      return getMatchingScripts(await loadScripts(), message.url);
    }

    case "toggleScript": {
      const scripts = await loadScripts();
      const script = scripts.find(item => item.id === message.id);
      if (script) {
        script.enabled = !script.enabled;
        await saveScripts(scripts);
        await syncRegisteredScripts();
      }
      return scripts;
    }

    case "addScript": {
      const source = message.source?.trim();
      if (!source) {
        throw new Error("Script source is empty.");
      }

      const meta = parseMetadata(source);
      if (!meta.matches.length) {
        throw new Error("Script is missing at least one @match rule.");
      }

      const scripts = await loadScripts();
      scripts.push({
        id: crypto.randomUUID(),
        filename: message.filename ?? "script.js",
        source,
        meta,
        enabled: true,
        createdAt: Date.now(),
      });
      await saveScripts(scripts);
      await syncRegisteredScripts();
      return scripts;
    }

    case "addScripts": {
      const entries = message.scripts ?? [];
      if (!entries.length) {
        return await loadScripts();
      }

      const scripts = await loadScripts();
      for (const entry of entries) {
        const source = entry.source?.trim();
        if (!source) {
          throw new Error(`Script source is empty for ${entry.filename ?? "script.js"}.`);
        }

        const meta = parseMetadata(source);
        if (!meta.matches.length) {
          throw new Error(`Script is missing at least one @match rule: ${entry.filename ?? "script.js"}.`);
        }

        scripts.push({
          id: crypto.randomUUID(),
          filename: entry.filename ?? "script.js",
          source,
          meta,
          enabled: true,
          createdAt: Date.now(),
        });
      }

      await saveScripts(scripts);
      await syncRegisteredScripts();
      return scripts;
    }

    case "checkForUpdates": {
      const scripts = await loadScripts();
      const updates = [];

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
            error: error.message,
          });
        }
      }

      return updates;
    }

    case "updateScript": {
      const scripts = await loadScripts();
      const script = scripts.find(item => item.id === message.id);
      if (!script) {
        throw new Error("Script not found.");
      }

      const result = await fetchScriptUpdate(script);
      if (!result.canUpdate) {
        throw new Error("Script does not define @updateURL or @downloadURL.");
      }

      if (!result.hasUpdate) {
        return { updated: false };
      }

      script.source = result.source;
      script.meta = result.meta;
      script.updatedAt = Date.now();
      await saveScripts(scripts);
      await syncRegisteredScripts();
      return { updated: true, version: result.meta.version ?? null };
    }

    case "updateAllScripts": {
      const scripts = await loadScripts();
      const results = [];
      let changed = false;

      for (const script of scripts) {
        try {
          const result = await fetchScriptUpdate(script);
          if (!result.canUpdate || !result.hasUpdate) {
            results.push({ id: script.id, updated: false });
            continue;
          }

          script.source = result.source;
          script.meta = result.meta;
          script.updatedAt = Date.now();
          changed = true;
          results.push({ id: script.id, updated: true, version: result.meta.version ?? null });
        } catch (error) {
          results.push({ id: script.id, updated: false, error: error.message });
        }
      }

      if (changed) {
        await saveScripts(scripts);
        await syncRegisteredScripts();
      }

      return results;
    }

    case "removeScript": {
      const scripts = (await loadScripts()).filter(script => script.id !== message.id);
      await saveScripts(scripts);
      await syncRegisteredScripts();
      return scripts;
    }

    default:
      return null;
  }
}

syncRegisteredScripts().catch(error => {
  console.warn("[Scriptmonkey] Failed to sync registered scripts.", error);
});
