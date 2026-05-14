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
This project uses **Vitest** for testing.
- **Run tests:** `npm run test`
- **Run tests in watch mode:** `npm run test:watch`

## Guidelines
- Write smart, concise tests with high signal and low boilerplate.
- Keep code diffs minimal.
- Use the latest supported syntax and best practices.
- Use early return to reduce nesting.
- Ask for details if scope or information is missing.
- Always update the docs or tests if needed.
