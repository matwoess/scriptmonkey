---
sidebar_position: 3
---

# Development Guide

This document provides instructions for setting up, developing, testing, formatting, and releasing Scriptmonkey.

## Building from source

1. Clone the repository:
   ```bash
   git clone https://github.com/matwoess/Scriptmonkey.git
   cd Scriptmonkey
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the project:
   ```bash
   npm run build
   ```
4. Load the extension in Chrome:
   1. Open `chrome://extensions` and enable **Developer mode**.
   2. Click **Load unpacked** and select the `dist/` folder.
   3. Enable **Allow User Scripts** for the extension.

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
