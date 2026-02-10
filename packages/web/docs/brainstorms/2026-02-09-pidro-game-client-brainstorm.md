# Pidro Game Client - Full Game Experience

**Date:** 2026-02-09
**Status:** Ready for planning

## What We're Building

A complete, ready-to-play Pidro card game client (web) that covers the full player journey: registration, login, lobby, game creation, joining games, and real-time gameplay. The client connects to the existing Elixir/Phoenix backend via REST API and Phoenix Channels (WebSocket).

### Scope

**In scope:**
- Registration page (username, email, password)
- Login page with link to registration
- Lobby screen with table-list of available games
- Game creation flow with simple seat picker (You / Bot / Open)
- Joining games from lobby (if free seats exist)
- Full gameplay: dealing, bidding, trump declaration, card play, scoring
- Game-over overlay with scores and Play Again / Back to Lobby
- Real-time state sync via Phoenix Channels
- Reconnection handling (player disconnect/reconnect)
- Presence tracking (who's online/connected)

**Out of scope (for now):**
- Spectator mode
- Chat/messaging
- Player profiles/stats page
- Sound effects / animations beyond basic transitions
- Mobile-specific optimizations (shared package handles cross-platform)
- Game settings customization (time limits, scoring variants)

## Why This Approach

### Architectural Foundation Already Exists

The shared package (`@pidro/shared`) provides ~80% of the non-UI infrastructure:
- **Zustand stores**: auth, lobby, game, settings, UI
- **Channel hooks**: `useGameChannel`, `useLobbyChannel` with full event handling
- **API clients**: auth, lobby (create/join/leave rooms)
- **Type system**: complete TypeScript types for game state, rooms, cards, actions
- **Utilities**: position mapping (absolute-to-relative), card formatting, room normalization

The web package already has:
- React + Vite + TypeScript setup
- Phoenix socket initialization with auth token injection
- Protected routing
- Basic login and lobby pages (to be enhanced)

### What We Need to Build

Primarily **UI components and pages**. The data layer is largely done. Key additions:
1. Registration page
2. Enhanced lobby with table-list display and create/join actions
3. Game creation modal/page with seat picker
4. Game table component (the main piece)
5. Card components
6. Phase-specific UI (bidding panel, trump selector)
7. Game-over overlay
8. Tailwind CSS integration

## Key Decisions

### 1. Reuse shared channel hooks
Import `useGameChannel` and `useLobbyChannel` directly from `@pidro/shared`. They're platform-agnostic and handle all WebSocket communication, state updates, presence tracking, and reconnection.

### 2. Tailwind CSS for styling
Add Tailwind CSS to the web package. Matches the dev UI's approach, fast to build with, and well-suited for the "polished minimal" visual target.

### 3. Cross-shaped table layout (you at bottom)
Follow the proven pattern from the backend dev UI:
- Your hand at bottom (south relative position)
- Partner at top (north relative)
- Opponents on left and right (west/east relative)
- Trick area in the center
- Game info bar at bottom of table

Uses the existing `mapAbsoluteToRelative()` utility to transform server positions.

### 4. Simple seat picker for game creation
When creating a game, show 4 seat slots:
- Seat 1: Always "You" (the host)
- Seats 2-4: Toggle between "Open" (for humans) and "Bot"
- Global bot difficulty selector (random/basic/smart)
- Game name field

### 5. Table-list lobby display
Rooms displayed as a table/list:
- Columns: Game name, Status, Players (e.g., "2/4"), Open Seats, Actions
- Join button on rows with free seats
- Status badges (Waiting, Playing, etc.)
- Real-time updates via lobby channel

### 6. Separate registration page
- Login page is the landing/default auth page
- "Create account" link navigates to `/register`
- Register page: username, email, password, confirm password
- On success: auto-login and redirect to lobby

### 7. Game-over overlay
Modal overlay on the game table showing:
- Winner team announcement
- Final scores for both teams
- Hand-by-hand score history
- "Play Again" and "Back to Lobby" buttons

### 8. Polished minimal visual style
- Green felt table background (like dev UI)
- Clean white card designs with suit colors (red/black)
- Trump indicators (yellow ring/star)
- Turn indicators (green pulse)
- Subtle shadows and rounded corners
- No heavy animations or effects

## Screen Flow

```
/login  ──────────►  /lobby  ──────────►  /game/:code
  │                    │  ▲                    │
  │ "Create account"   │  │ "Back to Lobby"    │
  ▼                    │  │                    │
/register ─────────►   │  └────────────────────┘
  (auto-login)         │
                       │ "Create Game"
                       ▼
                   [Create Game Modal]
                       │
                       │ (creates room, navigates to /game/:code)
                       ▼
                   /game/:code (waiting for players)
                       │
                       │ (4 players joined → game auto-starts)
                       ▼
                   /game/:code (gameplay)
                       │
                       │ (game ends)
                       ▼
                   [Game Over Overlay]
                       │
                       ├──► "Play Again" → new room
                       └──► "Back to Lobby" → /lobby
```

## Routes

| Route | Component | Auth Required | Description |
|-------|-----------|---------------|-------------|
| `/login` | LoginPage | No | Login form |
| `/register` | RegisterPage | No | Registration form |
| `/lobby` | LobbyPage | Yes | Game lobby with room list |
| `/game/:code` | GamePage | Yes | Game table (waiting + playing) |

## Component Architecture

### Pages
- **LoginPage** - Enhanced existing page with Tailwind styling
- **RegisterPage** - New registration form
- **LobbyPage** - Enhanced with table-list, create game button, real-time updates
- **GamePage** - New page orchestrating the game experience

### Game Components
- **GameTable** - Main container: green felt background, 4-position layout
- **PlayerHand** - Card row for a player position (horizontal for N/S, vertical for W/E)
- **Card** - Individual card face-up/face-down with suit, rank, trump/point indicators
- **TrickArea** - Center area showing current trick plays in cross pattern
- **BiddingPanel** - Bid buttons + pass button + current bid display
- **TrumpSelector** - 4 suit buttons for declaring trump
- **GameInfoBar** - Bottom bar: trump, hand number, scores
- **GameOverOverlay** - Modal with results and navigation
- **WaitingRoom** - Pre-game state showing seats, who's joined, waiting indicator

### Lobby Components
- **RoomTable** - Table-list of available rooms
- **RoomRow** - Individual room row with join action
- **CreateGameModal** - Modal with seat picker and game name

### Shared/Layout
- **ProtectedRoute** - Already exists, enhance with redirect
- **Layout** - Simple app shell with header (optional)

## Game Phases & UI Mapping

| Server Phase | Client UI |
|-------------|-----------|
| (no game) | WaitingRoom - show seats, who's joined |
| `dealer_selection` | Brief dealer animation/indicator |
| `dealing` | Cards being dealt (brief transition) |
| `bidding` | BiddingPanel in center - bid/pass buttons for current player |
| `declaring` / `declaring_trump` | TrumpSelector in center - suit buttons for bid winner |
| `discarding` / `second_deal` | Hand display with card selection (keep 6 cards) |
| `playing` | TrickArea in center - play cards from hand |
| `scoring` | Brief score display |
| `game_over` / `complete` | GameOverOverlay |

## Data Flow

### Lobby Flow
1. LobbyPage mounts → `useLobbyChannel()` joins "lobby" topic
2. Receives initial rooms list → `setRooms()`
3. Real-time events update rooms (`room_created`, `room_updated`, `room_closed`)
4. User clicks "Create Game" → shows CreateGameModal
5. User configures → `lobbyApi.createRoom()` → receives room code
6. Navigate to `/game/:code`

### Join Flow
1. User clicks "Join" on a room row → `lobbyApi.joinRoom(code)`
2. Receives assigned position → navigate to `/game/:code`

### Game Flow
1. GamePage mounts → `lobbyApi.getRoom(code)` to get room data
2. `useGameStore.initFromRoom({ room, youPlayerId })` initializes player metadata
3. `useGameChannel(roomCode)` joins game channel
4. Receives initial state: position, role, game state, legal actions
5. `useGameViewModel()` transforms to relative view
6. UI renders based on phase and relative positions
7. Player actions: call `pushGameAction(event, payload)`
8. Server broadcasts new state → channel hook updates store → UI re-renders

### Reconnection Flow
1. Socket disconnects (network issue, tab switch)
2. Phoenix socket auto-reconnects with backoff
3. Channel rejoin → server detects reconnection
4. Full state resync → UI catches up

## Open Questions

1. **"Play Again" behavior** - Does it create a new room with same config, or does the backend support rematch in same room?
2. **Second deal / discard phase** - Need to verify exact UX for card selection (pick 6 to keep). The shared hooks may need a `select_hand` action type.
3. **Lobby auto-refresh** - Is the lobby channel sufficient for keeping the room list fresh, or do we need periodic REST polling as fallback?
4. **Error handling UX** - Toast notifications? Inline errors? Need to decide on a pattern for API errors and game action errors.
