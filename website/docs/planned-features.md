---
sidebar_position: 6
---

# Planned Features

This document outlines upcoming features, enhancements, and roadmap items planned for **Scriptmonkey**.

- **Script Templates & New Script Button**:
  - Create new user scripts directly in the dashboard using a pre-defined minimal template block.
- **Icon Support**:
  - Parse and support the `@icon` metadata tag to load and display custom script icons in popups and dashboard lists.
- **Editor Enhancements**:
  - Add an auto-save configuration option to CodeMirror.
  - Implement script version history and change log tracking.
- **Permissions & Settings**:
  - Provide granular controls over script permissions (e.g., restricting network requests per script).
- **Greasemonkey / Tampermonkey `GM_*` APIs**:
  - Implement `@grant` support to provide standard GreaseMonkey helper functions (e.g. `GM_addStyle`, `GM_xmlhttpRequest`, `GM_setValue`, `GM_getValue`).