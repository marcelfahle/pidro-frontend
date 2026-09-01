# Pidro - Multiplayer Card Game Project

## Overview

Pidro is a modern implementation of the Finnish variant of Pedro, a complex trick-taking card game for 4 players in 2 teams. The project consists of three major components: a pure functional game engine, a Phoenix-based multiplayer server, and a React Native mobile client.

## Project Architecture

### Three-Component System

```
┌─────────────────────────────────────────────────────┐
│              Mobile Client (React Native)           │
│              - iOS/Android apps                     │
│              - Expo + NativeWind                    │
└────────────────────┬────────────────────────────────┘
                     │ WebSocket (Phoenix Channels)
                     │ REST API (Room Management)
                     ▼
┌─────────────────────────────────────────────────────┐
│           Phoenix Server (Elixir/OTP)               │
│           - Multiplayer orchestration               │
│           - Authentication & room management        │
│           - Real-time game state sync               │
└────────────────────┬────────────────────────────────┘
                     │ Function calls
                     ▼
┌─────────────────────────────────────────────────────┐
│              Game Engine (Pure Elixir)              │
│              - Stateless rule validation            │
│              - Immutable state management           │
│              - Pidro Object Notation (PON)          │
└─────────────────────────────────────────────────────┘
```

## Component Details

### 1. Game Engine (`pidro_engine`)

**Purpose**: Pure functional game rules and state management

**Key Features**:

- Stateless, function-based API
- Immutable game state using Elixir structs
- Pidro Object Notation (PON) for standardized state representation
- Complex Finnish Pidro rules implementation:
  - Trump-only trick winning
  - Dealer advantage system with optimal card selection
  - Player elimination ("going cold")
  - Point-based scoring (14 points per hand, 62 to win)

**Architecture**:

- Event sourcing with replay capabilities
- Binary optimizations for performance
- Property-based testing with StreamData
- No I/O or side effects - pure game logic

**Technology**: Elixir, focused on functional programming principles

---

### 2. Multiplayer Server (`pidro_server`)

**Purpose**: Phoenix-based server handling all multiplayer aspects

**Key Features**:

- **Authentication**: JWT-based auth with bcrypt password hashing
- **Room Management**: Create, join, leave game rooms with 4-player support
- **Real-time Gameplay**: WebSocket channels for low-latency game actions
- **Presence Tracking**: Live player status in lobby and games
- **Auto Cleanup**: Rooms close automatically after game completion

**API Design**:

- REST endpoints for room CRUD and authentication
- WebSocket channels for gameplay (bid, declare_trump, play_card)
- Separate lobby channel for room list updates

**Architecture**:

- Supervision tree with DynamicSupervisor for game processes
- Each game room = isolated, supervised Elixir process
- PubSub for real-time state broadcasting
- Process-per-game isolation (crash resilience)

**Technology**: Phoenix 1.8.1, Elixir/OTP, PostgreSQL, JWT auth

**Status**: ✅ Production-ready (deployed with full test coverage)

---

### 3. Mobile Client (`pidro-mobile`)

**Purpose**: Cross-platform mobile app for iOS and Android

**Key Features**:

- Visual card table with interactive gameplay
- Real-time multiplayer via Phoenix Channels
- Lobby system for browsing/creating games
- Authentication and user profiles
- Offline-friendly with cached data

**Architecture**:

- **UI Framework**: React Native with Expo SDK 54+
- **Styling**: NativeWind v4 (Tailwind CSS for React Native)
- **Navigation**: Expo Router (file-based routing)
- **State Management**:
  - Zustand for client state (user session, UI state)
  - TanStack Query for server state (API caching)
  - Phoenix Channels for real-time game state
- **Real-time**: Phoenix.js client for WebSocket connections

**Technology Stack**:

- React Native 0.81+ (New Architecture)
- Expo SDK 54+
- TypeScript 5.7+
- NativeWind v4 (Tailwind CSS)
- Zustand, TanStack Query
- Phoenix Channels (phoenix npm package)

**Status**: In development (following 6-week MVP roadmap)

---

## Game Rules Summary

**Pidro** is a trick-taking game with unique mechanics:

- **Players**: 4 players in 2 teams (North/South vs East/West)
- **Objective**: First team to 62 points wins
- **Phases**: Bidding → Trump Declaration → Playing → Scoring
- **Key Mechanic**: Only trump cards can win tricks
- **Point Cards**: A (1pt), J (1pt), 10 (1pt), Right 5 (5pts), Left 5 (5pts), 2 (1pt) = 14 total
- **Special Rules**:
  - Dealer selects 6 best cards from remaining deck
  - Players "go cold" when out of trump
  - Losing bid = negative points (risk/reward)

The Finnish variant has more complex dealer mechanics and scoring compared to standard Pedro.

---

## Pidro Object Notation (PON)

**Standardized game state format** used across all components:

```elixir
%{
  phase: :bidding | :declaring_trump | :playing | :finished,
  dealer: :north | :south | :east | :west,
  current_turn: player_position,
  trump_suit: :hearts | :diamonds | :clubs | :spades | nil,
  bids: %{north: 8, south: :pass, east: 7, west: :pass},
  players: %{
    north: %{hand: [...], cold: false, points_taken: 0},
    # ... other positions
  },
  current_trick: [...],
  cumulative_scores: %{north_south: 15, east_west: 8},
  # ... other state fields
}
```

This notation enables:

- Serialization for network transport
- Event sourcing and replay
- State validation and testing
- Cross-component communication

---

## Communication Patterns

### Server ↔ Engine

- Direct function calls (in-process)
- GameAdapter wraps Pidro.Server GenServer
- Stateless validation via `get_legal_actions/2`
- State updates via `apply_action/3`

### Client ↔ Server

- **REST API**: Room management, authentication
- **WebSocket**: Real-time gameplay
  - `game:{room_code}` channel for game actions
  - `lobby` channel for room list updates
- **Format**: JSON over HTTP/WebSocket
- **Auth**: JWT Bearer tokens

---

## Development Philosophy

1. **Boundary Separation**: Phoenix handles delivery, engine handles rules
2. **Process Isolation**: One game = one supervised process
3. **Stateless Where Possible**: API stateless, state in game processes
4. **Real-time First**: WebSocket for gameplay, REST for setup
5. **Mobile-Native**: API designed for React Native clients
6. **Fail Independently**: Game crash ≠ server crash

---

## Key Technologies Summary

| Component         | Primary Tech               | Key Libraries                       |
| ----------------- | -------------------------- | ----------------------------------- |
| **Engine**        | Elixir                     | StreamData (testing)                |
| **Server**        | Phoenix 1.8.1, Elixir/OTP  | Ecto, PubSub, JWT                   |
| **Client**        | React Native, Expo SDK 54+ | NativeWind, Zustand, TanStack Query |
| **Communication** | Phoenix Channels, REST     | WebSocket, JWT auth                 |
| **Database**      | PostgreSQL                 | Ecto (users, stats)                 |

---

## Project Status

- ✅ **Engine**: Complete - All Finnish Pidro rules implemented
- ✅ **Server**: Production-ready - Full multiplayer stack deployed
- 🚧 **Mobile**: In development - Following 6-week MVP plan
- 🚧 **Dev UI**: Phase 3 complete - Visual card table for testing

---

## Use Cases

This overview is designed to provide context for:

- LLM-based coding assistants
- New developer onboarding
- Architecture discussions
- Integration planning
- Documentation generation

**For detailed specifications**, refer to:

- `pidro_server_specification.md` - Server architecture
- `PIDRO_MOBILE_SETUP_PLAN.md` - Mobile client roadmap
- `MASTERPLAN-server.md` - Server implementation status
- Game rules documents for Pidro mechanics
