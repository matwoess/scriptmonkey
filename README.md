# Scriptmonkey

Lightweight Manifest V3 Chrome extension for managing user scripts — like Tampermonkey, but local and minimal.

Built with **Vite**, **React**, and **TypeScript**.

## Usage

Click the Scriptmonkey icon in the toolbar to see:

- Scripts active on the current page
- All other installed scripts
- Toggle scripts on/off or remove them

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

Add scripts via the popup: pick a `.js` file.

If a script includes `@updateURL` or `@downloadURL`, Scriptmonkey checks for newer versions and shows:

- Per-script update info
- An `Update` button for that script
- An `Update all` button when any installed script has an update

Update checks are manual. Use `Check for updates` in the popup.

Each script must include at least one `@match` rule. Scriptmonkey only loads scripts that match the current page URL.

## Setup & Installation

### 1. Build the Extension

First, install the dependencies and build the extension:

```bash
npm install
npm run build
```

This will create a `dist/` directory containing the compiled extension.

### 2. Load into Chrome

1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select the **`dist/` directory** (not the project root).
3. Enable **Allow User Scripts** for the extension.

## How it works

- The UI is powered by a **React** application located in `src/popup/`.
- The background service worker is built with strict **TypeScript** and handles Chrome APIs in `src/background/`.
- Scripts are stored in `chrome.storage.local` with their parsed metadata.
- Matching scripts are registered through Chrome's `userScripts` API.
- The popup warns when `Allow User Scripts` is disabled.
- Script updates are fetched from `@downloadURL` or `@updateURL` and compared via `@version`.
- After adding, removing, or toggling a script, the popup reloads the current tab so the page picks up the new state.

## Development

To work on the extension with Hot Module Replacement (HMR) enabled:

```bash
npm run dev
```

Vite will watch your `src/` files and automatically inject updates into the popup and background worker when changes are made.

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
