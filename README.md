# Scriptmonkey

Minimal Chrome extension (Manifest V3) that loads the scripts in `userscripts/` on `bitbucket.lab.dynatrace.org`.

## Setup

1. Open `chrome://extensions`, enable **Developer mode**.
2. Click **Load unpacked** and select this directory.

## Adding scripts

1. Drop `.js` files into `userscripts/`.
2. Add the filename to the `js` list in `manifest.json`.
3. Reload the extension.

Scripts run in Chrome's `MAIN` world, so they execute in the page context.
