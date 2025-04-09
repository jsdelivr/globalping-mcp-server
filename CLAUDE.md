# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Lint/Test Commands
- Deploy: `npm run deploy` (wrangler deploy)
- Development server: `npm run dev` or `npm start` (wrangler dev)
- Format code: `npm run format` (biome format --write)
- Lint and fix: `npm run lint:fix` (biome lint --fix)
- Generate Cloudflare types: `npm run cf-typegen` (wrangler types)

## Code Style Guidelines
- **Formatting**: Use Biome with 4-space indentation and 100 character line width
- **TypeScript**: Use strict mode, ES2021 target, ES2022 modules, Bundler module resolution
- **Imports**: Group and sort imports automatically using Biome
- **Error Handling**: Use explicit error types and proper try/catch blocks
- **Naming**: Use camelCase for variables/functions, PascalCase for classes/interfaces
- **Types**: Always define explicit return types for functions
- **Async**: Use async/await pattern for asynchronous code
- **Comments**: Keep comments focused and relevant to complex logic