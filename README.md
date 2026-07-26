# Scriptmonkey

Lightweight Manifest V3 Chrome extension for managing user scripts — like Tampermonkey, but local and minimal.

Built with **Vite**, **React**, and **TypeScript**.

## Usage

Scriptmonkey provides two main interfaces:
1. **Extension Popup**: Click the toolbar icon to quickly toggle, update, delete, or view details of scripts.
2. **Dashboard**: A full-featured management panel to create, import, search, and edit scripts with an integrated code editor.

Click the Scriptmonkey icon in the toolbar to see:
- Scripts active on the current page
- All other installed scripts
- Toggle scripts on/off, check for updates, or delete them
- Click any script to open its details or edit it in the Dashboard

Click the **Manage** button to open the dashboard tab.

### Dashboard Features

- **CodeMirror Editor**: Full-featured code editor with syntax highlighting and real-time syntax error validation.
- **Save Shortcut & Safety**: Save your code using `Ctrl+S`. Displays a warning before closing or navigating away with unsaved changes.
- **Collapsible Metadata Panel**: View parsed metadata categorized into cards (General, Match Rules, Execution, Updates, and Advanced properties).
- **Searchable Sidebar**: Search and filter scripts in a resizable, draggable sidebar.

### Adding scripts

Scripts use the standard `==UserScript==` metadata format (same as Tampermonkey):

```js
// ==UserScript==
// @name         My Script
// @match        https://example.com/*
// @description  Does something useful
// @version      1.0
// ==/UserScript==

(function () {
  'use strict';
  // ...
})();
```

Add scripts via the popup or the dashboard:
- **Import Zone**: Click the "Add / Import Script" zone in the dashboard sidebar to select a `.js` or `.user.js` file.
- **Drag & Drop**: Drag and drop script files directly onto the popup or the dashboard page.

If a script includes `@updateURL` or `@downloadURL`, Scriptmonkey checks for newer versions and shows:
- Per-script update info
- An `Update` button/status for that script
- An `Update all` option when updates are available

Update checks are manual. Click `Check for updates` in the popup or dashboard.

Each script must include at least one `@match` rule. Scriptmonkey only loads scripts that match the current page URL. GreaseMonkey-style `@include` and `@exclude` tags are also parsed and displayed.

## Installation

Install Scriptmonkey directly from the [Chrome Web Store](https://chromewebstore.google.com/detail/scriptmonkey-beta/afmgkdanppbobipehgpfcmhpgeoejcpn).

After installing, make sure to enable **Allow User Scripts** for the extension in `chrome://extensions`.

For building from source or setting up a local development environment, see [DEVELOPMENT.md](DEVELOPMENT.md).

## How it works

- The UI consists of two **React** applications: the popup (`src/popup/`) and the full-screen dashboard (`src/dashboard/`), with styling variables centralized in `src/theme.css`.
- The background service worker is built with strict **TypeScript** and handles Chrome APIs in `src/background/`.
- Scripts are stored in `chrome.storage.local` with their parsed metadata.
- Matching scripts are registered through Chrome's `userScripts` API.
- The popup and dashboard warn when `Allow User Scripts` is disabled.
- Script updates are fetched from `@downloadURL` or `@updateURL` and compared via `@version`.
- After adding, removing, or toggling an active script, the extension reloads the current tab so the page picks up the new state. Inactive or non-matching scripts are updated/deleted without forcing unnecessary page reloads.
