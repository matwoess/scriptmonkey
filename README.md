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

## Setup & Installation

### Install from a GitHub Release (recommended)

1. Download `scriptmonkey-vX.Y.Z.zip` from the [Releases](https://github.com/mathiaswoess/Scriptmonkey/releases) page.
2. Unzip it to a permanent folder (don't delete it — Chrome needs the folder to stay).
3. Open `chrome://extensions` and enable **Developer mode**.
4. Click **Load unpacked** and select the unzipped folder.
5. Enable **Allow User Scripts** for the extension.

### Build from source

```bash
npm install
npm run build
```

Then follow steps 3–5 above, pointing at the `dist/` folder.

## How it works

- The UI consists of two **React** applications: the popup (`src/popup/`) and the full-screen dashboard (`src/dashboard/`), with styling variables centralized in `src/theme.css`.
- The background service worker is built with strict **TypeScript** and handles Chrome APIs in `src/background/`.
- Scripts are stored in `chrome.storage.local` with their parsed metadata.
- Matching scripts are registered through Chrome's `userScripts` API.
- The popup and dashboard warn when `Allow User Scripts` is disabled.
- Script updates are fetched from `@downloadURL` or `@updateURL` and compared via `@version`.
- After adding, removing, or toggling an active script, the extension reloads the current tab so the page picks up the new state. Inactive or non-matching scripts are updated/deleted without forcing unnecessary page reloads.

## Development

To work on the extension with Hot Module Replacement (HMR) enabled:

```bash
npm run dev
```

Vite will watch your `src/` files and automatically inject updates into the popup and background worker when changes are made.

## Testing

### Unit Tests
This project uses [Vitest](https://vitest.dev/) for unit testing.

```bash
npm run test         # run once
npm run test:watch   # watch mode
```

Tests live in `tests/`, mirroring the `src/` structure. Pure utility logic is kept separate from Chrome-API-dependent code in `src/background/utils.ts` so it can be tested without mocks.

### E2E Tests
We use [Playwright](https://playwright.dev/) for end-to-end testing of the extension behavior.

```bash
npm run build        # E2E tests require a fresh build
npm run test:e2e     # run Playwright tests
```

E2E tests are located in the `e2e/` directory and test the actual extension loaded in a browser.

## Formatting & Linting

This project uses [Biome](https://biomejs.dev/) to enforce code formatting and catch issues.

To format all files:
```bash
npm run format
```

To run the linter:
```bash
npm run lint
```

### Pre-commit Hooks

We use [Lefthook](https://github.com/evilmartians/lefthook) to automatically format and lint code before it is committed. 

The hooks are installed automatically during `npm install`. When you run `git commit`, Lefthook executes Biome on your staged files. Any auto-fixable issues are corrected and re-staged automatically.

## Releasing

Releases are automated via GitHub Actions (`.github/workflows/release.yaml`). On every `v*` tag push, the workflow builds the extension, runs tests, and publishes a GitHub Release with the zipped `dist/` as an attachment.

```bash
# 1. Bump the version in manifest.json
# 2. Commit and tag
git add manifest.json
git commit -m "chore: release v0.3.0"
git tag v0.3.0
git push origin main --tags
```

GitHub will build and attach `scriptmonkey-v0.3.0.zip` to the release automatically.

To create a local zip without publishing:

```bash
npm run pack
```
