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

## Project

This is a public MCP server for Globalping API https://api.globalping.io/v1/spec.yaml that is built and deployed to Cloudflare Workers.

- Always follow and refer to the Globalping API spec to ensure all tools and requests are properly formatted and use all fields
- For location always use the magic field. Ensure to document it properly in tools to correctly guide MCP clients to use it.
- For measurement with multiple locations also use magic field but ensure the correct format is used
- All measurements have a default limit of 3 but the MCP client can provide its own limit
- If the MCP client wants to run a comparison measurement, it needs to know that the second measurement can accept the ID of the first measurement as location to ensure the same probes are used
- This MCP server does not require authentication to use. But users can optionally provide a Globalping token when connecting and configured in their MCP clients. Use the token when available.
