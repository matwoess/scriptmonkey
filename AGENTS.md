# AGENTS.md

## Project Overview
Scriptmonkey is a lightweight Manifest V3 Chrome extension for managing user scripts.
Built with **Vite**, **React**, and **TypeScript**.

## Key Commands
- **Install dependencies:** `npm install` (installs git hooks via Lefthook)
- **Start extension dev server:** `npm run dev`
- **Build for production:** `npm run build`
- **Start website dev server:** `npm --prefix website run start`

## Code Style & Linting
Uses **Biome** for formatting and linting.
- **Check formatting:** `npm run format:check`
- **Fix formatting:** `npm run format`
- **Run linter:** `npm run lint`

## Testing
Uses **Vitest** for unit tests and **Playwright** for E2E tests.

### Unit Tests (Vitest)
- **Run tests:** `npm run test`
- **Run watch mode:** `npm run test:watch`

Tests live in `tests/`, mirroring `src/`. Extract pure utility functions from Chrome-API-dependent modules for mock-free testing.

### E2E Tests (Playwright)
- **Run E2E tests:** `npm run test:e2e`
- **Run E2E tests with UI:** `npm run test:e2e:ui`
- Playwright uses `open: "never"` for its HTML reporter to avoid launching a blocking local server on failure.
- Build the extension (`npm run build`) before running E2E tests against `dist/`.

## Documentation & Website
- Update docs in `website/docs/` whenever adding or modifying features.
- Keep the interactive UI mockup in `website/src/pages/index.tsx` updated when UI elements or script metadata behavior change.

## Guidelines
- Write smart, concise tests with high signal and low boilerplate.
- Keep code diffs minimal.
- Use early return to reduce nesting.
- Ask for details if scope or information is missing.
