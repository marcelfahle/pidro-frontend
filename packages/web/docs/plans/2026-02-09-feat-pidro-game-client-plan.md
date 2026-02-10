---
title: "feat: Pidro Game Client - Full Game Experience"
type: feat
date: 2026-02-09
brainstorm: docs/brainstorms/2026-02-09-pidro-game-client-brainstorm.md
---

# feat: Pidro Game Client - Full Web Game Experience

## Overview

Build a complete, ready-to-play Pidro card game web client covering the full player journey: registration, login, lobby with real-time room list, game creation with bots, joining games, and real-time gameplay (bidding, trump declaration, card play, scoring, game over).

The Elixir/Phoenix backend is fully functional. The `@pidro/shared` package provides stores, types, API clients, and utilities. This plan is primarily **UI components + wiring** with a small amount of backend work for bot support and the dealer rob phase.

## Problem Statement

The web package currently has only a basic login page and a read-only lobby list with inline styles. There is no way to register, create games, join games, or play. The shared infrastructure (`@pidro/shared`) is ~80% ready but the web has no game UI whatsoever.

## Proposed Solution

Build the game client in 6 phases, starting with infrastructure (Tailwind, channel hooks, routing) and progressing through auth, lobby, game table, gameplay phases, and polish. Each phase produces a working increment.

## Technical Approach

### Architecture

```
packages/web/src/
├── api/                    # Existing - auth.ts, lobby.ts, client.ts
├── bootstrap/              # Existing - realtime.ts (enhanced)
├── channels/
│   ├── socket.ts           # Existing - WebPhoenixSocket
│   ├── useLobbyChannel.ts  # NEW - web version of lobby channel hook
│   └── useGameChannel.ts   # NEW - web version of game channel hook
├── components/
│   ├── ui/                 # NEW - shared UI primitives
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   ├── Badge.tsx
│   │   └── Spinner.tsx
│   ├── game/               # NEW - game-specific components
│   │   ├── GameTable.tsx
│   │   ├── PlayerHand.tsx
│   │   ├── Card.tsx
│   │   ├── TrickArea.tsx
│   │   ├── BiddingPanel.tsx
│   │   ├── TrumpSelector.tsx
│   │   ├── HandSelector.tsx
│   │   ├── GameInfoBar.tsx
│   │   ├── GameOverOverlay.tsx
│   │   └── WaitingRoom.tsx
│   └── lobby/              # NEW - lobby-specific components
│       ├── RoomTable.tsx
│       ├── RoomRow.tsx
│       └── CreateGameModal.tsx
├── pages/
│   ├── LoginPage.tsx        # Existing - restyle with Tailwind
│   ├── RegisterPage.tsx     # NEW
│   ├── LobbyPage.tsx        # Existing - major enhancement
│   └── GamePage.tsx         # NEW - main game orchestrator
├── platform/               # Existing - config.ts, storage.ts
├── stores/                 # Existing - auth.ts, settings.ts
├── App.tsx                 # Existing - add routes
└── main.tsx                # Existing
```

### Key Technical Decisions

1. **Channel hooks live in web package** (not shared) - The mobile versions use `unstable_batchedUpdates` which is React Native-specific. Web versions are identical minus that wrapper. Could be moved to shared later with a platform adapter.

2. **Tailwind CSS v4** - Install and configure for the web package. All components use utility classes.

3. **GamePhase type needs updating** - Add missing phases: `discarding`, `second_deal`, `complete`. The server sends these as strings in `game_state.phase`.

4. **Bot support requires a backend endpoint** - The current backend has no REST API for bots. We need either: (a) a new `POST /api/v1/rooms` handler that accepts seat configuration with bot types, or (b) a separate `POST /api/v1/rooms/:code/bots` endpoint. **Recommendation: extend room creation to accept seat config.**

5. **`select_hand` requires a backend channel handler** - Add `handle_in("select_hand", ...)` to `game_channel.ex` to support the dealer rob phase.

6. **"Play Again" creates a new room** - No backend rematch support exists. The button creates a new room with same config and navigates to it.

### Implementation Phases

---

#### Phase 1: Infrastructure Setup

**Goal:** Tailwind CSS, routing, channel hooks, type fixes.

##### 1.1 Install and configure Tailwind CSS v4

- Install `tailwindcss` and `@tailwindcss/vite`
- Add Tailwind Vite plugin to `vite.config.ts`
- Create `src/index.css` with `@import "tailwindcss"`
- Import CSS in `main.tsx`

**Files:**
- `packages/web/package.json` - add dependencies
- `packages/web/vite.config.ts` - add plugin
- `packages/web/src/index.css` - NEW
- `packages/web/src/main.tsx` - import CSS

##### 1.2 Add routes

Update `App.tsx` to include all routes:

```tsx
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />
  <Route path="/lobby" element={<ProtectedRoute><LobbyPage /></ProtectedRoute>} />
  <Route path="/game/:code" element={<ProtectedRoute><GamePage /></ProtectedRoute>} />
  <Route path="/" element={<Navigate to="/lobby" replace />} />
</Routes>
```

Also: redirect authenticated users away from `/login` and `/register`.

**Files:**
- `packages/web/src/App.tsx`

##### 1.3 Create web channel hooks

Port from mobile package, removing `unstable_batchedUpdates`:

**`src/channels/useGameChannel.ts`:**
- Singleton channel pattern with ref counting
- Join `game:${roomCode}` topic
- Handle events: `game_state`, `turn_changed`, `presence_state`, `presence_diff`, `player_disconnected`, `player_reconnected`
- Export `pushGameAction(event, payload)` helper
- Wire to `useGameStore` setters

**`src/channels/useLobbyChannel.ts`:**
- Singleton channel pattern with ref counting
- Join `lobby` topic
- Handle events: `room_created`, `room_updated`, `room_closed`, `lobby_update`, `presence_state`, `presence_diff`
- Wire to `useLobbyStore` setters

**Files:**
- `packages/web/src/channels/useGameChannel.ts` - NEW
- `packages/web/src/channels/useLobbyChannel.ts` - NEW

##### 1.4 Fix shared types

Update `GamePhase` to include all server phases:

```typescript
export type GamePhase =
  | 'dealer_selection' | 'dealing' | 'bidding'
  | 'declaring' | 'declaring_trump' | 'trump_declaration'
  | 'discarding' | 'second_deal'
  | 'playing' | 'scoring'
  | 'complete' | 'game_over';
```

Add `SelectHandAction` to `LegalAction`:

```typescript
export interface SelectHandAction {
  type: 'select_hand';
  cards: Card[];
}
export type LegalAction = PassAction | BidAction | PlayCardAction | DeclareTrumpAction | SelectHandAction;
```

**Files:**
- `packages/shared/src/types/game.ts`

##### 1.5 Backend: Add `select_hand` handler to game channel

Add a new `handle_in("select_hand", ...)` clause to `game_channel.ex`:

```elixir
def handle_in("select_hand", %{"cards" => cards}, socket) do
  cards = Enum.map(cards, fn %{"rank" => rank, "suit" => suit} ->
    {rank, String.to_existing_atom(suit)}
  end)
  apply_game_action(socket, {:select_hand, cards})
end
```

**Files:**
- `pidro_backend/apps/pidro_server/lib/pidro_server_web/channels/game_channel.ex`

##### 1.6 Backend: Add bot support to room creation

Extend `RoomController.create/2` to accept seat configuration:

```elixir
# POST /api/v1/rooms
# Body: %{"room" => %{"name" => "...", "seats" => %{"seat_2" => "ai", "seat_3" => "open", "seat_4" => "ai"}, "bot_difficulty" => "basic"}}
```

After room creation, for each `"ai"` seat, call `BotManager.start_bot/4` with the appropriate position and strategy.

**Files:**
- `pidro_backend/apps/pidro_server/lib/pidro_server_web/controllers/api/room_controller.ex`

---

#### Phase 2: Auth Pages

**Goal:** Login restyled, registration page, auth redirects.

##### 2.1 Restyle LoginPage with Tailwind

- Centered card layout with form
- Username and password inputs with labels
- Error message display (differentiate network vs. auth errors)
- "Sign in" button
- "Don't have an account? Create one" link to `/register`
- Redirect to `/lobby` if already authenticated

**Files:**
- `packages/web/src/pages/LoginPage.tsx`

##### 2.2 Create RegisterPage

- Same centered card layout as login
- Fields: username, email, password, confirm password
- Client-side validation (min lengths, email format, password match)
- Calls `authApi.register()` → `setSession()` → navigate to `/lobby`
- Error display (duplicate username/email from server)
- "Already have an account? Sign in" link to `/login`
- Redirect to `/lobby` if already authenticated

**Files:**
- `packages/web/src/pages/RegisterPage.tsx` - NEW

---

#### Phase 3: Lobby

**Goal:** Full lobby with real-time room list, create game, join game.

##### 3.1 Enhance LobbyPage

- Header bar with logo/title, username, sign out button
- "Create Game" button opening modal
- Room table component showing available games
- Connect lobby channel for real-time updates (replace REST-only fetch)
- Loading and error states

**Files:**
- `packages/web/src/pages/LobbyPage.tsx`

##### 3.2 RoomTable component

Table-list layout:

| Column | Content |
|--------|---------|
| Name | Game name or room code |
| Status | Badge: Waiting (green), Playing (blue) |
| Players | "2/4" format |
| Open Seats | Number or position names |
| Actions | "Join" button (only on waiting rooms with free seats) |

- Sorted by creation time (newest first)
- Empty state: "No games available. Create one!"
- Filter: only show `waiting` status rooms

**Files:**
- `packages/web/src/components/lobby/RoomTable.tsx` - NEW
- `packages/web/src/components/lobby/RoomRow.tsx` - NEW

##### 3.3 CreateGameModal

Modal with:
- Game name text input (optional, defaults to "{username}'s game")
- 4 seat slots in a row:
  - Seat 1: "You" (locked, shows your username)
  - Seats 2-4: Toggle button cycling "Open" → "Bot" → "Open"
- Bot difficulty dropdown (shown when any seat is "Bot"): Random / Basic / Smart
- "Create Game" submit button
- On submit: `lobbyApi.createRoom({ name, seats, bot_difficulty })` → navigate to `/game/:code`

**Files:**
- `packages/web/src/components/lobby/CreateGameModal.tsx` - NEW
- `packages/web/src/components/ui/Modal.tsx` - NEW

##### 3.4 Join game flow

- "Join" button on RoomRow calls `lobbyApi.joinRoom(code)`
- On success: navigate to `/game/:code`
- On error: show inline error on the row (e.g., "Room is full")

---

#### Phase 4: Game Page - Waiting Room & Table Structure

**Goal:** Game page shell, waiting room, game table layout.

##### 4.1 GamePage orchestrator

The main game page component:

1. Extract `code` from URL params
2. Fetch room data: `lobbyApi.getRoom(code)`
3. Initialize game store: `useGameStore.initFromRoom({ room, youPlayerId })`
4. Connect game channel: `useGameChannel(code)`
5. Render based on game state:
   - No game / waiting: `<WaitingRoom />`
   - Active game: `<GameTable />`
   - Game over: `<GameTable />` with `<GameOverOverlay />`
6. Handle "Leave game" / "Back to lobby" navigation

**Files:**
- `packages/web/src/pages/GamePage.tsx` - NEW

##### 4.2 WaitingRoom component

Pre-game state showing:
- Room code prominently (shareable)
- 4 seat positions in a cross layout (N/W/E/S)
- Each seat shows: occupied (player name) or empty (dashed border, "Waiting...")
- Bot seats labeled with "Bot (Basic)" etc.
- "Waiting for players..." pulsing indicator when <4 players
- "Game starting..." when 4 players joined
- "Leave Room" button

**Files:**
- `packages/web/src/components/game/WaitingRoom.tsx` - NEW

##### 4.3 GameTable shell

The green felt table container:
- Dark green (`bg-emerald-800`) rounded rectangle with shadow
- Cross layout: North (top center), West (left), Center (phase-dependent), East (right), South (bottom center)
- `GameInfoBar` at bottom: trump suit, hand number, team scores
- Uses `useGameViewModel()` for relative positioning

Layout (CSS Grid or Flexbox):
```
         ┌─────────────────────────┐
         │      [North Hand]       │
         │                         │
         │ [West]  [Center]  [East]│
         │                         │
         │      [South Hand]       │
         │  [Game Info Bar]        │
         └─────────────────────────┘
```

**Files:**
- `packages/web/src/components/game/GameTable.tsx` - NEW
- `packages/web/src/components/game/GameInfoBar.tsx` - NEW

##### 4.4 Card component

Individual playing card:
- White background, rounded corners, subtle shadow
- Rank (top-left, bottom-right) + suit symbol (center, large)
- Red text for hearts/diamonds, dark text for clubs/spades
- Face-down state: dark blue back with pattern
- States: default, playable (hover lift + blue ring), selected (lifted + blue ring), trump indicator (yellow ring)
- Point badge: small yellow circle with point value (top-right)
- Size variants: `sm` (32x48), `md` (48x64), `lg` (64x96)

**Files:**
- `packages/web/src/components/game/Card.tsx` - NEW

##### 4.5 PlayerHand component

Displays a player's cards:
- Horizontal layout for North (top) and South (bottom) positions
- Vertical layout for West (left) and East (right) positions
- Player label: position name, username, dealer badge, turn indicator
- Cards shown face-up for you (south), face-down for opponents
- Playable cards highlighted when it's your turn
- Click handler on playable cards dispatches `play_card` action

**Files:**
- `packages/web/src/components/game/PlayerHand.tsx` - NEW

---

#### Phase 5: Gameplay Phases

**Goal:** All interactive game phases fully functional.

##### 5.1 BiddingPanel

Shown in the center area during `bidding` phase:
- Current bid display: amount + bidder name (or "No bids yet")
- Bid buttons: one for each legal bid amount (6-14), styled as numbered buttons
- Pass button (gray, separate from bid buttons)
- Only shown when it's your turn to bid
- When not your turn: "Waiting for {player} to bid..."
- Bid history: small text showing each player's bid/pass

**Files:**
- `packages/web/src/components/game/BiddingPanel.tsx` - NEW

##### 5.2 TrumpSelector

Shown in center during `declaring` / `declaring_trump` phase:
- "Choose Trump Suit" header
- 2x2 grid of suit buttons: large suit symbol + suit name
- Color-coded: red for hearts/diamonds, dark for clubs/spades
- Only shown for the bid winner (your turn)
- When not your turn: "Waiting for {player} to declare trump..."

**Files:**
- `packages/web/src/components/game/TrumpSelector.tsx` - NEW

##### 5.3 HandSelector (dealer rob)

Shown during `second_deal` phase when dealer has more than 6 cards:
- "Select 6 cards to keep" instruction
- Your hand displayed with all cards face-up and clickable
- Selected cards lifted/highlighted (blue ring)
- Counter: "3/6 selected"
- "Confirm" button (enabled only when exactly 6 selected)
- On confirm: `pushGameAction('select_hand', { cards: selectedCards })`

**Files:**
- `packages/web/src/components/game/HandSelector.tsx` - NEW

##### 5.4 TrickArea

Shown in center during `playing` phase:
- 3x3 grid with cards at N/W/E/S positions and empty center
- Empty slots: dashed border with position initial (N/E/S/W)
- Played cards: face-up in the slot with player label
- Leader indicator: "Led" text above their card
- Winner indicator: green ring around winning card after trick completes
- "Trick #N" header with point total

**Files:**
- `packages/web/src/components/game/TrickArea.tsx` - NEW

##### 5.5 Card play interaction

When it's your turn during `playing` phase:
- Your hand shows playable cards with hover effect (lifted + blue ring)
- Non-playable cards are slightly dimmed
- Click a playable card → `pushGameAction('play_card', { card: { rank, suit } })`
- On error (`must_follow_suit`, `card_not_in_hand`): brief shake animation on hand

##### 5.6 GameOverOverlay

Shown when phase is `complete` or `game_over`:
- Semi-transparent backdrop blur
- Centered modal card:
  - Winner team announcement (large text)
  - Final scores: "North/South: 64" vs "East/West: 38"
  - Score history table (hand-by-hand if available)
  - "Back to Lobby" button → navigate to `/lobby`
  - "Play Again" button → creates new room with same config → navigate to new `/game/:code`

**Files:**
- `packages/web/src/components/game/GameOverOverlay.tsx` - NEW

---

#### Phase 6: Polish & Edge Cases

**Goal:** Error handling, loading states, reconnection UX, overall polish.

##### 6.1 Error handling pattern

- API errors: show red text below forms (login, register, create game)
- Game action errors: brief toast-like notification at top of game table (auto-dismiss after 3s)
- WebSocket disconnection: yellow banner at top "Reconnecting..." with spinner
- WebSocket reconnected: green banner "Reconnected!" (auto-dismiss after 2s)

##### 6.2 Loading states

- App initialization: centered spinner (replace "Loading...")
- Lobby fetch: skeleton rows in room table
- Room creation: button shows spinner, disabled during request
- Game channel connecting: "Connecting to game..." overlay on game table
- Game action: brief disabled state on action buttons

##### 6.3 Player disconnect indicators

- Disconnected player hand: slightly dimmed with "Disconnected" badge
- Uses `playerMeta.isConnected` from game store
- Re-appears as normal when `player_reconnected` fires

##### 6.4 Fix realtime initialization

Replace the fragile module-level `realtimeInitialized` flag:
- Move socket connect/disconnect to auth store subscription
- Connect when token appears, disconnect when cleared
- Handle sign-out → sign-in within same session

**Files:**
- `packages/web/src/bootstrap/realtime.ts`

##### 6.5 UI components

Create shared UI primitives used across pages:

- **Button** - variants: primary (emerald), secondary (gray), danger (red), sizes: sm/md/lg, loading state
- **Modal** - backdrop + centered card, close on escape/backdrop click, title + body + footer
- **Badge** - colored pill for status indicators
- **Spinner** - animated loading indicator

**Files:**
- `packages/web/src/components/ui/Button.tsx` - NEW
- `packages/web/src/components/ui/Modal.tsx` - NEW
- `packages/web/src/components/ui/Badge.tsx` - NEW
- `packages/web/src/components/ui/Spinner.tsx` - NEW

---

## Acceptance Criteria

### Functional Requirements

- [ ] User can register with username, email, password and auto-login
- [ ] User can login and is redirected to lobby
- [ ] Authenticated user redirected away from login/register pages
- [ ] Lobby shows real-time table-list of available (waiting) rooms
- [ ] User can create a game with name, bot/open seats, and bot difficulty
- [ ] User can join a waiting room with free seats from the lobby
- [ ] Game page shows waiting room when <4 players
- [ ] Game auto-starts when 4 players join (transition to gameplay)
- [ ] Bidding phase: player can bid or pass when it's their turn
- [ ] Trump declaration: bid winner can select trump suit
- [ ] Dealer rob: dealer can select 6 cards during second deal
- [ ] Card play: player can play legal cards, see trick area update in real-time
- [ ] All 4 positions visible on the table (you at bottom)
- [ ] Game over overlay shows winner, scores, and navigation options
- [ ] "Back to Lobby" returns to lobby page
- [ ] "Play Again" creates new room and navigates to it
- [ ] Real-time state sync via WebSocket (no polling)
- [ ] Reconnection: socket auto-reconnects and game state resyncs

### Non-Functional Requirements

- [ ] Tailwind CSS used for all styling (no inline styles)
- [ ] TypeScript strict mode - no `any` types
- [ ] All game state flows through `@pidro/shared` stores
- [ ] Cards render correctly at all supported sizes
- [ ] Game table is usable at 1024px+ viewport width

---

## Dependencies & Prerequisites

### Backend Work Required (before or parallel with frontend)

1. **Add `select_hand` handler to game channel** - Required for Phase 5.3 (dealer rob)
   - File: `pidro_backend/.../channels/game_channel.ex`
   - ~20 lines of code

2. **Add bot support to room creation API** - Required for Phase 3.3 (create game with bots)
   - File: `pidro_backend/.../controllers/api/room_controller.ex`
   - Accept `seats` and `bot_difficulty` params, call `BotManager.start_bot/4` for AI seats
   - ~40 lines of code

### Frontend Dependencies

- Tailwind CSS v4 + `@tailwindcss/vite` plugin
- No other new dependencies needed (React, Phoenix, Zustand, Axios already installed)

---

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Bot API not ready when frontend needs it | Medium | High | Create game UI can default to "Open" seats only. Add bot toggle when API is ready. |
| `select_hand` not added to channel | Medium | High | During second_deal, show "Waiting for dealer..." for the dealer position. Auto-resolves if dealer is a bot. |
| GamePhase values mismatch server | Low | High | Log unknown phases and render a generic "Game in progress" state. Fix types as discovered. |
| WebSocket disconnects during gameplay | Low | Medium | Phoenix auto-reconnects with backoff. Channel rejoin resyncs full state. Show "Reconnecting..." banner. |
| Multiple browser tabs | Low | Low | Defer multi-tab support. Last active tab wins. |

---

## References & Research

### Internal References

- Brainstorm: `docs/brainstorms/2026-02-09-pidro-game-client-brainstorm.md`
- Backend game channel: `pidro_backend/.../channels/game_channel.ex`
- Backend room controller: `pidro_backend/.../controllers/api/room_controller.ex`
- Backend bot manager: `pidro_backend/.../games/bots/bot_manager.ex`
- Backend game engine: `pidro_backend/.../pidro_engine/lib/pidro/game/engine.ex`
- Shared types: `packages/shared/src/types/game.ts`
- Shared game store: `packages/shared/src/stores/game.ts`
- Shared lobby store: `packages/shared/src/stores/lobby.ts`
- Shared position utils: `packages/shared/src/utils/positions.ts`
- Mobile game channel hook: `packages/mobile/src/channels/hooks/useGameChannel.ts`
- Mobile lobby channel hook: `packages/mobile/src/channels/hooks/useLobbyChannel.ts`
- Dev game table UI: `pidro_backend/.../live/dev/game_detail_live.ex`
- Dev card components: `pidro_backend/.../components/card_components.ex`

### Existing Shared Infrastructure (ready to use)

- `useGameStore` - game state management with all setters
- `useGameViewModel()` - transforms absolute to relative positions
- `useLobbyStore` - lobby state management
- `useAuthStore` - auth state with persistence
- `lobbyApi` - REST client for rooms (list, get, create, join, leave)
- `authApi` - REST client for auth (login, register)
- `mapAbsoluteToRelative()` / `mapRelativeToAbsolute()` - position transforms
- `getRankLabel()`, `SUIT_SYMBOLS`, `SUIT_COLORS_RAW` - card display helpers
- `normalizeRoom()`, `normalizeRooms()` - API response normalization
- `WebPhoenixSocket` - platform-specific socket with visibility listener
