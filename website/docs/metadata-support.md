---
sidebar_position: 3
---

# Metadata Support

This page details the user script header metadata tags parsed, displayed, and enforced by **Scriptmonkey**.

User scripts specify metadata headers inside a `// ==UserScript== ... // ==/UserScript==` block.

## Supported Metadata Keys

| Key | Description | Status / Handling |
| :--- | :--- | :--- |
| `@name` | Name of the user script | **Fully supported**. Used as primary title and for script identification. |
| `@namespace` | Script namespace identifier | **Fully supported**. Combined with `@name` to uniquely identify scripts and resolve updates/overwrites. |
| `@version` | Script version string | **Fully supported**. Parsed and compared numerically/lexicographical during update checks. |
| `@description` | Brief summary of the script | **Fully supported**. Displayed in popup lists, script cards, and sidebar metadata. |
| `@match` | Chrome match pattern target | **Fully supported**. Registered with Chrome `userScripts` API and used for URL matching. |
| `@include` | Include rule or URL pattern | **Fully supported**. Supports match patterns, wildcards (`*`), regular expressions (`/.../`), and `.tld` aliases. |
| `@exclude` | Exclude rule or URL pattern | **Fully supported**. Overrides match and include patterns to prevent script execution on matching URLs. |
| `@run-at` | Timing of script execution | **Supported**. `document-start` maps to `document_start`; all other values default to `document_idle`. |
| `@updateURL` | URL to fetch version metadata | **Fully supported**. Used by update check runner to inspect remote headers. |
| `@downloadURL` | URL to download script source | **Fully supported**. Takes precedence over `@updateURL` for downloading updated source code. |

## Parsed & Displayed Keys (No Active Enforcement)

The following keys are parsed into the script's metadata object and rendered in the dashboard's collapsible metadata cards, but currently have no specific extension runtime enforcement:

| Key | Status / Behavior |
| :--- | :--- |
| `@grant` | Displayed in metadata cards, but privilege/GM API grants are **not enforced** (scripts run in standard `MAIN` page world). |
| `@author` | Parsed into metadata store and displayed in script details cards. |
| `@icon` | Parsed into metadata store and displayed in script details cards. |
| `@license` | Parsed into metadata store and displayed in script details cards. |
| Custom Keys (`@customKey`) | Any additional `@key value` pair is generic-parsed and displayed in the metadata inspector panel. |
