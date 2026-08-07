---
sidebar_position: 2
---

# Features & Metadata Support

This page provides an overview of what **Scriptmonkey** currently does, what features and metadata keys are supported, and what functionality is not supported yet.

---

## What Scriptmonkey Does

- **Manifest V3 Native User Scripts**: Leverages Chrome's official `chrome.userScripts` API to register and execute user scripts securely in the page (`MAIN` execution world).
- **Full Dashboard & Popup UI**: Provides a clean popup interface for quick script toggles/badges and a full-screen dashboard editor powered by CodeMirror with real-time syntax checking.
- **Local Storage & Privacy**: Keeps all script source code and metadata strictly in your browser using `chrome.storage.local`.
- **Flexible URL Matching**: Matches target URLs using `@match` patterns, `@include` wildcards/regex/TLD rules, and `@exclude` overrides.
- **Manual Version Updates**: Checks remote `@updateURL` or `@downloadURL` endpoints and compares version strings to update installed scripts.

---

## Metadata Key Support

User scripts specify metadata headers inside a `// ==UserScript== ... // ==/UserScript==` block.

### Supported Metadata Keys

| Key | Description | Status / Handling |
| :--- | :--- | :--- |
| `@name` | Name of the user script | **Fully supported**. Used as primary title and for script identification. |
| `@namespace` | Script namespace identifier | **Fully supported**. Combined with `@name` to uniquely identify scripts and resolve updates/overwrites. |
| `@version` | Script version string | **Fully supported**. Parsed and compared numerically/lexicographically during update checks. |
| `@description` | Brief summary of the script | **Fully supported**. Displayed in popup lists, script cards, and sidebar metadata. |
| `@match` | Chrome match pattern target | **Fully supported**. Registered with Chrome `userScripts` API and used for URL matching. |
| `@include` | Include rule or URL pattern | **Fully supported**. Supports match patterns, wildcards (`*`), regular expressions (`/.../`), and `.tld` aliases. |
| `@exclude` | Exclude rule or URL pattern | **Fully supported**. Overrides match and include patterns to prevent script execution on matching URLs. |
| `@run-at` | Timing of script execution | **Supported**. `document-start` maps to `document_start`; all other values default to `document_idle`. |
| `@updateURL` | URL to fetch version metadata | **Fully supported**. Used by update check runner to inspect remote headers. |
| `@downloadURL` | URL to download script source | **Fully supported**. Takes precedence over `@updateURL` for downloading updated source code. |

### Parsed & Displayed Keys (No Active Enforcement)

The following keys are parsed into the script's metadata object and rendered in the dashboard's collapsible metadata cards, but currently have no specific extension runtime enforcement:

| Key | Status / Behavior |
| :--- | :--- |
| `@grant` | Displayed in metadata cards, but privilege/GM API grants are **not enforced** (scripts run in standard `MAIN` page world). |
| `@author` | Parsed into metadata store and displayed in script details cards. |
| `@icon` | Parsed into metadata store and displayed in script details cards. |
| `@license` | Parsed into metadata store and displayed in script details cards. |
| Custom Keys (`@customKey`) | Any additional `@key value` pair is generic-parsed and displayed in the metadata inspector panel. |

---

## What Scriptmonkey Does Not Do Yet

Scriptmonkey is intentionally lightweight and local. The following features are currently **not supported**:

1. **Greasemonkey / Tampermonkey `GM_*` APIs**:
   - Privileged APIs such as `GM_setValue`, `GM_getValue`, `GM_xmlhttpRequest`, `GM_addStyle`, or `GM_registerMenuCommand` are not injected or implemented.
   - All user scripts run directly in the web page's `MAIN` JavaScript world.
2. **External Resource & Library Injections**:
   - `@require` (fetching and pre-pending external JavaScript libraries) is not supported.
   - `@resource` (fetching and storing external CSS or image resources) is not supported.
3. **Automated Background Update Schedules**:
   - Scriptmonkey does not run background cron jobs or periodic automatic network polls for updates. Update checks must be triggered manually via the popup or dashboard.
4. **Cloud / Cross-Device Sync**:
   - Scripts are stored exclusively in local browser storage (`chrome.storage.local`) and are not synced via Chrome Sync or external cloud services.
5. **Non-Chrome Browsers**:
   - Built specifically for Chrome Manifest V3 using the `userScripts` permission. Firefox and Safari extensions are not currently supported.
