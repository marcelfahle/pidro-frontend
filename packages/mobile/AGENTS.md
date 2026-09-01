# Pidro Mobile - Agent Guide

This file contains information for AI coding assistants working on the Pidro mobile client.

## Project Overview

React Native mobile app using Expo Router for a multiplayer card game. Connects to a Phoenix/Elixir backend via REST API and Phoenix Channels (WebSocket).

## Architecture Principle: Dumb Client, Smart Server

**The server is the single source of truth.** This is a card game with an authoritative server architecture.

### Key Rules

1. **Server owns all game state** - The client never computes game logic (valid moves, scoring, turn order, etc.)
2. **Client sends intents, not results** - Client says "I want to play this card", server validates and responds with new state
3. **Client renders what server tells it** - The UI is a "privileged spectator" of the game state
4. **Never trust client data** - All validation happens server-side

### What the Client Does

- Sends user intents/actions to server (play card, place bid, etc.)
- Receives and renders game state from server
- Handles UI/UX (animations, transitions, user feedback)
- Manages local-only state (UI preferences, which modal is open, etc.)

### What the Client Does NOT Do

- Validate if a move is legal (server does this)
- Calculate scores or determine winners
- Manage turn order or game phase transitions
- Store authoritative game state (only caches what server sends)

### When to Push Back

If a feature request implies the client should:

- Compute game rules or validation logic
- Determine game outcomes
- Make decisions that affect game state

...then push back and suggest it belongs on the server.

**Reference**: [Gabriel Gambetta - Client-Server Game Architecture](https://www.gabrielgambetta.com/client-server-game-architecture.html)

> "The game state is managed by the server alone. Clients send their actions to the server. The server updates the game state periodically, and then sends the new game state back to clients, who just render it on the screen."

Note: Unlike fast-paced games, Pidro is turn-based, so we don't need client-side prediction or lag compensation. This makes our architecture simpler - pure request/response with server authority.

## Tech Stack

- **Framework**: React Native with Expo SDK 54+
- **Package Manager**: Bun
- **Language**: TypeScript (strict mode)
- **Navigation**: Expo Router (file-based routing)
- **Styling**: NativeWind v4 + Tailwind CSS v3
  - **CRITICAL**: ALWAYS use `className` prop for styling.
  - **DO NOT** use inline `style` objects unless absolutely necessary (e.g., dynamic values).
  - Uses standard Tailwind v3 configuration.
- **State Management**:
  - Zustand for client state (auth, settings, UI)
  - TanStack Query for server state (planned)
  - Phoenix Channels for real-time game state
- **Backend**: Phoenix/Elixir server (see PIDRO_PROJECT_OVERVIEW.md)

## Key Commands

```bash
# Development
bun start              # Start Expo dev server
bun ios                # Run on iOS simulator
bun android            # Run on Android emulator

# Code Quality
bun lint               # Lint and check formatting
bun format             # Auto-fix linting and format code

# Testing (when implemented)
bun test               # Run Jest tests

# Clear cache (if styles not updating)
bun expo start -c      # Clear Metro bundler cache
```

## Project Structure

```
app/                    # Expo Router (file-based routing)
  (auth)/              # Auth screens (login, register)
  (tabs)/              # Main app tabs (lobby, games, profile)
  index.tsx            # Initial route with auth redirect
  _layout.tsx          # Root layout
  emergency.tsx        # Emergency reset screen

src/
  api/                 # API client (axios)
  bootstrap/           # App initialization (realtime, etc)
  channels/            # Phoenix Channels (WebSocket)
  components/ui/       # Reusable UI components
  constants/           # App config and constants
  hooks/               # Custom React hooks
  stores/              # Zustand stores
  types/               # TypeScript types
  utils/               # Utility functions
```

## Conventions

### File Naming

- Components: PascalCase (e.g., `Button.tsx`, `UserProfile.tsx`)
- Utilities/Hooks: camelCase (e.g., `useAuth.ts`, `storage.ts`)
- Constants: camelCase files, UPPER_SNAKE exports (e.g., `config.ts` exports `API_CONFIG`)

### Import Aliases

- `@/*` → `src/*`
- `~/*` → Root directory

### Code Style

- Use NativeWind's `className` prop for styling
- Prefer `const` over `let`
- Use `useCallback` for functions passed as props
- Extract error handling to utility functions
- Prefix console logs with component/module name: `[Auth]`, `[Socket]`

### State Management

- **Auth state**: `src/stores/auth.ts` (persisted to SecureStore)
- **UI state**: `src/stores/ui.ts` (ephemeral)
- **Server data**: TanStack Query (when implemented)
- **Real-time game state**: Phoenix Channels custom hooks

### Testing (Not Yet Implemented)

When adding tests, follow these patterns:

- Unit tests: `__tests__/unit/`
- Component tests: `__tests__/integration/`
- Use React Native Testing Library
- Mock Phoenix Channels in tests

## Critical Implementation Notes

### NativeWind v4 Setup (Tailwind v3)

1.  **Styling Rules**:
    - **ALWAYS** use `className="..."` for styling components.
    - **NEVER** use inline styles (e.g., `style={{ width: 100 }}`) if a utility class can achieve the same result.
    - If you find yourself writing `style={...}`, stop and check if there's a Tailwind class for it.
2.  **Configuration**:
    - `tailwind.config.js` handles the configuration (v3 syntax).
    - `babel.config.js` includes `nativewind/babel`.
3.  **Note**: ScrollView `contentContainerClassName` IS supported in v4 (via `nativewind/preset`), but verify if it works or use `contentContainerStyle` if issues arise.

**Troubleshooting Styles**:

- If styles aren't applying, run `bun expo start -c` to clear the Metro cache.

### Navigation & Auth Flow

- `app/index.tsx` handles initial routing based on auth state
- Uses `<Redirect />` component (not imperative navigation)
- Auth state managed by Zustand with SecureStore persistence
- Session validation happens in `onRehydrateStorage` callback

### Phoenix Channels

- Socket initialized in `app/_layout.tsx` via `initRealtime()`
- Auto-connects/disconnects based on auth state
- Pauses in background, reconnects in foreground (AppState listener)

### Environment Variables

- Create `.env` from `.env.example`
- All public env vars must be prefixed with `EXPO_PUBLIC_`
- Access via `process.env.EXPO_PUBLIC_*`

## Common Issues

### White Screen

- Check if NativeWind babel preset is configured
- Clear Metro cache: `bun expo start -c`
- Check console for errors

### Navigation Errors

- Don't use imperative navigation in `_layout.tsx` before mount
- Use `<Redirect />` in route components instead

### Auth Issues

- Check SecureStore permissions on device
- Use Emergency Reset screen: `/(emergency)`
- Check session validation in `src/stores/auth.ts`

## Next Steps (Phases 8+)

See `spec/PIDRO_MOBILE_SETUP_PLAN.md` for full roadmap:

- [ ] Phase 8: Lobby UI
- [ ] Phase 9: Room Management
- [ ] Phase 10: Game UI
- [ ] Phase 11: Real-time Gameplay
- [ ] Phase 12: Polish & Testing

## Resources

- [Expo Docs](https://docs.expo.dev)
- [NativeWind](https://www.nativewind.dev)
- [Phoenix Channels JS](https://hexdocs.pm/phoenix/js/)
- [Zustand](https://docs.pmnd.rs/zustand)
