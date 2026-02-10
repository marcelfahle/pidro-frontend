## Build & Run

- Monorepo root: `packages/web/` (you are here)
- Shared package must be built first: `bun run --cwd ../shared build`
- Dev server: `bun run dev` (http://localhost:5173)
- Build: `bun run build`

## Validation

Run these after implementing to get immediate feedback:

- Tests: `bun run test`
- Typecheck: `bun run typecheck`
- Lint: `bun run lint`
- Lint fix: `bun run lint:fix`
- All checks: `bun run check`

## Codebase Patterns

- State management: Zustand stores via `@pidro/shared` in `src/stores/`
- API clients: Axios-based in `src/api/`, factory from `@pidro/shared`
- Real-time: Phoenix WebSocket channels in `src/channels/`
- Path alias: `@/` maps to `src/`
- Test files: colocated next to source (e.g. `src/App.test.tsx`)
- Test framework: Vitest + Testing Library + jsdom

## Operational Notes
