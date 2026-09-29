---
sidebar_position: 6
---

# Planned Features

This document outlines upcoming features, enhancements, and roadmap items planned for **Scriptmonkey**.

- **User Feedback**:
  - Add a feedback button in the popup and maybe the dashboard.
  - Send anonymized feedback freetext to the developer.
  - Optionally allow attaching a user script to a feedback.
  - When uninstalling the extension, open a browser tab announcing regret and optionally asking for uninstall reason or improvement suggestions.
- **Editor Enhancements**:
  - Add an auto-save configuration option to CodeMirror.
  - Implement script version history and change log tracking.
- **Permissions & Settings**:
  - Provide granular controls over script permissions (e.g., restricting network requests per script).
- **Greasemonkey / Tampermonkey `GM_*` APIs**:
  - Implement `@grant` support to provide standard GreaseMonkey helper functions (e.g. `GM_addStyle`, `GM_xmlhttpRequest`, `GM_setValue`, `GM_getValue`).