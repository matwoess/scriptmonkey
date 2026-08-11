---
sidebar_position: 2
---

# Features

This page details the technical features and capabilities supported by **Scriptmonkey**.

## Manifest V3 User Script Engine

- **Native Execution**: Leverages Chrome's official `chrome.userScripts` API to register and run user scripts without content script workarounds.
- **Execution World**: Executes scripts directly inside the web page's `MAIN` JavaScript world, allowing direct access to page DOM objects and window globals.
- **Execution Timing**: Supports `@run-at` configurations to run scripts at `document-start` (`document_start`) or `document-idle` (`document_idle`).

## Dashboard Editor

- **Editor Interface**: Full-screen management dashboard built with CodeMirror 6, including line numbers, bracket matching, and JavaScript syntax highlighting.
- **Syntax Validation**: Provides real-time syntax checking and inline error indicators as you type.
- **Metadata Inspector**: Automatically parses `==UserScript==` header blocks into collapsible inspection cards for General info, Match rules, Execution timing, and Custom keys.
- **File Import**: Supports importing local `.js` and `.user.js` files via file picker or drag-and-drop onto the editor.
- **Unsaved Changes Guard**: Prompts for confirmation before closing or navigating away with unsaved editor modifications (`Ctrl+S` shortcut supported).

## Toolbar Extension Popup

- **Badge Indicator**: Displays the number of active user scripts matching the current web page directly on the extension icon badge.
- **Contextual Categorization**: Evaluates the active tab URL to group scripts into active scripts on the current domain versus other installed scripts.
- **Quick Actions**: Toggle individual scripts on or off, trigger manual update checks, open the dashboard editor, or delete scripts from the popup.

## Pattern & Rule Matching

- **Chrome Match Patterns**: Evaluates standard Chrome `@match` pattern strings (e.g. `https://*.example.com/*`).
- **Include & Exclude Directives**: Supports `@include` and `@exclude` patterns with wildcards (`*`), explicit regular expressions (`/.../`), and top-level domain (`.tld`) aliases.
- **Rule Precedence**: `@exclude` rules are evaluated first to override any matching `@match` or `@include` specifications.

## Script Updates & Version Management

- **Remote Header Inspection**: Fetches and parses remote `==UserScript==` header blocks from defined `@updateURL` or `@downloadURL` endpoints.
- **Version Comparison**: Compares installed versus remote version strings using semver and numerical version segment comparison.
- **Update Workflows**: Displays version diff indicators and supports updating individual scripts or running batch updates.

## Local Data Storage & Privacy

- **Local Storage API**: Stores all user script code, parsed metadata, and application state in `chrome.storage.local`.
- **Ad-Free & Tracking-Free**: Contains zero advertisements, sponsored links, analytics tracking, or background telemetry.
- **No External Sync**: Runs entirely local to the browser with no external cloud synchronization.
