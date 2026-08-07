---
sidebar_position: 1
---

# Scriptmonkey Documentation

Welcome to the official documentation for **Scriptmonkey**, a lightweight, minimal Manifest V3 Chrome extension for managing user scripts locally in your browser.

## Getting Started

### Installation

1. Install Scriptmonkey from the [Chrome Web Store](https://chromewebstore.google.com/detail/scriptmonkey-beta/afmgkdanppbobipehgpfcmhpgeoejcpn).
2. After installing, navigate to `chrome://extensions`, locate **Scriptmonkey**, and enable **Allow User Scripts** toggle.

## User Interface Overview

Scriptmonkey provides two intuitive interfaces for controlling and authoring your user scripts:

### Extension Popup

Click the Scriptmonkey icon in the browser toolbar to access quick actions:

![Scriptmonkey Popup Details](/popup.png)
![Scriptmonkey Popup Overlay](/popup-overlay.png)

- **Toolbar Badge**: Shows the exact number of active user scripts matching the current web page.
- **Active & Available Scripts**: Easily view which scripts are executing on the current domain versus other installed scripts.
- **Quick Controls**: Toggle scripts on/off, trigger update checks, or delete scripts directly.
- **Manage Dashboard Link**: Click **Manage** to open the full management dashboard tab.

---

### Dashboard Interface

The Dashboard is a full-featured management studio for editing, organizing, and inspecting your scripts.

![Scriptmonkey Dashboard Editor](/dashboard.png)

- **CodeMirror 6 Editor**: Includes syntax highlighting, automatic line numbers, matching brackets, and real-time JavaScript syntax validation.
- **Save & Navigation Safety**: Save your scripts quickly using `Ctrl+S`. Scriptmonkey prompts for confirmation before navigating away with unsaved changes.
- **Collapsible Metadata Cards**: Automatically parses script header metadata into clear categories (General, Match Rules, Execution, Updates, and Advanced properties).
- **Searchable Sidebar**: Quickly search and filter through your installed script library.
- **Drag & Drop Import**: Drag and drop `.js` or `.user.js` files directly into the import drop zone or onto the editor.

---

## Adding and Updating Scripts

### Header Format

Scriptmonkey parses standard `==UserScript==` block headers:

```javascript
// ==UserScript==
// @name         Example Enhancement
// @namespace    http://example.com/
// @version      1.0.0
// @description  Adds awesome features to example.com
// @match        https://example.com/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';
  console.log('Scriptmonkey user script active!');
})();
```

### Checking for Updates

If a script defines an `@updateURL` or `@downloadURL`, Scriptmonkey can fetch remote headers and check for version updates:

- **Per-script status**: Shows current vs. available version numbers.
- **Manual Updates**: Click **Check for updates** in the popup or dashboard to trigger version comparison.
- **Batch Update**: Update individual scripts or click **Update all** when updates are detected.

---

## Technical Architecture

- **Frontend UIs**: Built with **React** and **TypeScript** (Popup in `src/popup/`, Dashboard in `src/dashboard/`), sharing common CSS variables in `src/theme.css`.
- **Background Worker**: Built with strict TypeScript running as a Manifest V3 Service Worker (`src/background/`).
- **Chrome userScripts API**: Registered scripts are dispatched to the browser's native `userScripts` execution engine in the `MAIN` page world.
- **Local Storage**: All script sources and parsed metadata reside locally in `chrome.storage.local`.
