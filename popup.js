// Scriptmonkey popup.

const activeList = document.getElementById("active-list");
const otherList = document.getElementById("other-list");
const countEl = document.getElementById("count");
const activeSection = document.getElementById("active-section");
const otherSection = document.getElementById("other-section");
const warningEl = document.getElementById("warning");
const updateStatusEl = document.getElementById("update-status");
const checkUpdatesButton = document.getElementById("btn-check-updates");
const updateAllButton = document.getElementById("btn-update-all");

let currentUrl = "";
let updatesById = new Map();
let hasCheckedUpdates = false;

async function send(message) {
  const response = await chrome.runtime.sendMessage(message);
  if (response?.error) {
    throw new Error(response.error);
  }
  return response;
}

async function getCurrentTabUrl() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.url ?? "";
}

function matchPattern(pattern, url) {
  try {
    const parsed = pattern.match(/^(\*|http|https|file|ftp):\/\/([^/]+)(\/.*)$/);
    if (!parsed) {
      return false;
    }

    const target = new URL(url);
    const [, schemePattern, hostPattern, pathPattern] = parsed;

    if (schemePattern !== "*" && schemePattern !== target.protocol.slice(0, -1)) {
      return false;
    }

    const hostRegex = new RegExp(
      "^" + hostPattern.replace(/[|\\{}()[\]^$+?.]/g, "\\$&").replace(/\*/g, ".*") + "$",
      "i"
    );
    if (!hostRegex.test(target.host)) {
      return false;
    }

    const pathRegex = new RegExp(
      "^" + pathPattern.replace(/[|\\{}()[\]^$+?.]/g, "\\$&").replace(/\*/g, ".*") + "$"
    );
    return pathRegex.test(`${target.pathname}${target.search}${target.hash}`);
  } catch {
    return false;
  }
}

function isActiveOnUrl(script, url) {
  return script.meta.matches?.some(p => matchPattern(p, url)) ?? false;
}

function getUpdateInfo(script) {
  return updatesById.get(script.id) ?? null;
}

function renderScript(script) {
  const div = document.createElement("div");
  div.className = "script-item";

  const name = script.meta.name ?? script.filename;
  const desc = script.meta.description ?? "";
  const match = script.meta.matches?.join(", ") ?? "no @match";
  const update = getUpdateInfo(script);
  const updateLabel = !hasCheckedUpdates
    ? ""
    : update?.hasUpdate
      ? `Update available: ${update.currentVersion ?? "?"} -> ${update.nextVersion ?? "?"}`
      : update?.error
        ? `Update check failed: ${update.error}`
        : update?.canUpdate
          ? `Up to date${update.currentVersion ? ` (${update.currentVersion})` : ""}`
          : "";

  div.innerHTML = `
    <div class="script-info">
      <div class="script-name">${esc(name)}</div>
      ${desc ? `<div class="script-desc">${esc(desc)}</div>` : ""}
      <div class="script-match">${esc(match)}</div>
      ${updateLabel ? `<div class="script-update">${esc(updateLabel)}</div>` : ""}
    </div>
    ${hasCheckedUpdates && update?.hasUpdate ? '<button class="btn btn-update">Update</button>' : ""}
    <label class="toggle">
      <input type="checkbox" ${script.enabled ? "checked" : ""}>
      <span class="slider"></span>
    </label>
    <button class="btn-remove" title="Remove">&times;</button>
  `;

  div.querySelector("input").addEventListener("change", async () => {
    await send({ type: "toggleScript", id: script.id });
    await chrome.tabs.reload();
    await render();
  });

  div.querySelector(".btn-remove").addEventListener("click", async () => {
    if (!confirm(`Remove "${name}"?`)) return;
    await send({ type: "removeScript", id: script.id });
    await chrome.tabs.reload();
    await render();
  });

  const updateButton = div.querySelector(".btn-update");
  if (updateButton) {
    updateButton.addEventListener("click", async () => {
      updateButton.disabled = true;
      try {
        await send({ type: "updateScript", id: script.id });
        await refreshUpdates();
        await chrome.tabs.reload();
        await render();
      } catch (error) {
        alert(error.message);
        updateButton.disabled = false;
      }
    });
  }

  return div;
}

function esc(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

async function render() {
  const [status, scripts] = await Promise.all([
    send({ type: "getStatus" }),
    send({ type: "getScripts" }),
  ]);

  warningEl.hidden = status.userScriptsAvailable;
  warningEl.textContent = status.userScriptsAvailable
    ? ""
    : "Allow User Scripts is disabled for this extension. Enable it in chrome://extensions before scripts can run.";

  countEl.textContent = `${scripts.length} script${scripts.length === 1 ? "" : "s"}`;

  const active = [];
  const other = [];
  for (const s of scripts) {
    (isActiveOnUrl(s, currentUrl) ? active : other).push(s);
  }

  activeList.innerHTML = "";
  otherList.innerHTML = "";

  if (active.length) {
    activeSection.style.display = "";
    for (const s of active) activeList.appendChild(renderScript(s));
  } else {
    activeSection.style.display = "";
    activeList.innerHTML = `<div class="empty">No scripts for this page</div>`;
  }

  if (other.length) {
    otherSection.style.display = "";
    for (const s of other) otherList.appendChild(renderScript(s));
  } else {
    otherSection.style.display = "none";
  }
}

async function refreshUpdates() {
  hasCheckedUpdates = true;
  const updates = await send({ type: "checkForUpdates" });
  updatesById = new Map(updates.map(update => [update.id, update]));

  const available = updates.filter(update => update.hasUpdate).length;
  const checkable = updates.filter(update => update.canUpdate).length;

  updateStatusEl.textContent = checkable
    ? `${available} update${available === 1 ? "" : "s"} available`
    : "No update URLs";
  updateAllButton.hidden = available === 0;
}

// --- Add script via file picker ---

document.getElementById("btn-add-file").addEventListener("click", () => {
  document.getElementById("file-input").click();
});

document.getElementById("file-input").addEventListener("change", async (e) => {
  try {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) {
      return;
    }

    const scripts = await Promise.all(
      files.map(async file => ({
        filename: file.name,
        source: await file.text(),
      }))
    );

    await send({
      type: "addScripts",
      scripts,
    });

    await chrome.tabs.reload();
    await render();
  } catch (error) {
    alert(error.message);
  }
  e.target.value = "";
});

checkUpdatesButton.addEventListener("click", async () => {
  checkUpdatesButton.disabled = true;
  updateStatusEl.textContent = "Checking...";
  try {
    await refreshUpdates();
    await render();
  } catch (error) {
    updateStatusEl.textContent = "Update check failed";
    alert(error.message);
  } finally {
    checkUpdatesButton.disabled = false;
  }
});

updateAllButton.addEventListener("click", async () => {
  updateAllButton.disabled = true;
  try {
    await send({ type: "updateAllScripts" });
    await refreshUpdates();
    await chrome.tabs.reload();
    await render();
  } catch (error) {
    alert(error.message);
  } finally {
    updateAllButton.disabled = false;
  }
});

// --- Init ---

(async () => {
  currentUrl = await getCurrentTabUrl();
  updateStatusEl.textContent = "Click 'Check for updates'";
  await render();
})();
