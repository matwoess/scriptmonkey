# AGENTS.md

Welcome! This file provides context for AI agents working on the Scriptmonkey project.

## Project Overview
Scriptmonkey is a lightweight Manifest V3 Chrome extension for managing user scripts (similar to Tampermonkey, but local and minimal). 
It is built with **Vite**, **React**, and **TypeScript**.

## Key Commands
- **Install dependencies:** `npm install` (this also installs git hooks via Lefthook)
- **Start dev server:** `npm run dev`
- **Build for production:** `npm run build`

## Code Style & Linting
This project uses **Biome** for formatting and linting.
- **Check formatting:** `npm run format:check`
- **Fix formatting:** `npm run format`
- **Run linter:** `npm run lint`

## Testing
This project uses **Vitest** for unit testing and **Playwright** for E2E testing.

### Unit Tests (Vitest)
- **Run tests:** `npm run test`
- **Run tests in watch mode:** `npm run test:watch`

Tests live in `tests/`, mirroring the `src/` structure. Pure utility functions are extracted from Chrome-API-dependent modules so they can be tested without mocks.

### E2E Tests (Playwright)
- **Run tests:** `npm run test:e2e`
- **Run tests with UI:** `npm run test:e2e:ui`

**⚠️ CRITICAL WARNING FOR AGENTS:**
Playwright tests may fail and automatically start a local web server to host the HTML report (e.g., at `http://localhost:9323`). This is a **blocking process**. 
- If you see "Serving HTML report...", you **must** terminate the process (e.g., send SIGINT/Ctrl+C) to continue. 
- Avoid running E2E tests in a way that blocks your execution flow unless you can handle background processes.
- Ensure the extension is built (`npm run build`) before running E2E tests, as they test the compiled `dist/` folder.

## Guidelines
- Write smart, concise tests with high signal and low boilerplate.
- Keep code diffs minimal.
- Use the latest supported syntax and best practices.
- Use early return to reduce nesting.
- Ask for details if scope or information is missing.
- Always update the docs or tests if needed.
