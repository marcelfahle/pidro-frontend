# Pidro Mobile - Lobby & Game Creation Feature Specification

**Last Updated**: November 23, 2025
**Status**: Planning Phase
**Dependencies**: Authentication (✅ Complete), Phoenix Server (✅ Complete)
**Target**: Phase 2 of Mobile MVP (Week 2)

---

## Table of Contents

1. [Feature Overview](#feature-overview)
2. [User Flows](#user-flows)
3. [API & WebSocket Integration](#api--websocket-integration)
4. [UI/UX Specification](#uiux-specification)
5. [State Management](#state-management)
6. [Technical Implementation](#technical-implementation)
7. [Phase Breakdown](#phase-breakdown)
8. [Testing Strategy](#testing-strategy)
9. [Future Enhancements](#future-enhancements)

---

## Feature Overview

### Purpose

The lobby system allows players to:

- Browse available game rooms
- Create new game rooms with customizable settings
- Join existing rooms
- See live updates of room status
- View online player statistics

### Key Components

1. **Lobby Screen** - Main view showing available rooms
2. **Create Room Modal** - Interface for creating new games
3. **Room Card** - Component displaying individual room info
4. **Stats Bar** - Shows online players and active games
5. **Room Settings** - Configuration for player seats

### Important Notes

**Guest Play**: This specification assumes authenticated users (JWT from Phase 1 login). The ability to play as a guest without registration is a planned future enhancement. The architecture described here will support guest users with minimal changes - guest tokens would simply be generated server-side and stored locally, using the same WebSocket/API patterns.

**Implementation Flexibility**: This document focuses on requirements, user flows, API contracts, and UI patterns rather than prescriptive React Native code. Your actual navigation structure (stack vs tabs), component hierarchy, and state management approach should fit your existing codebase. Code examples are illustrative only.

---

## User Flows

### Flow 1: Viewing the Lobby

```
Home Screen
    ↓ [Tap "Multiplayer"]
Lobby Screen
    ├─ Header: Stats (Online Players, Active Games)
    ├─ Room List (scrollable, real-time updates)
    │   ├─ Room Card 1 (2/4 players)
    │   ├─ Room Card 2 (3/4 players)
    │   └─ Room Card 3 (1/4 players)
    └─ Create Button (floating action button)
```

**Data Flow**:

1. User navigates to lobby
2. App connects to `lobby` WebSocket channel
3. Server sends initial room list
4. User sees rooms with live updates
5. Stats update in real-time via Presence

---

### Flow 2: Creating a Game

```
Lobby Screen
    ↓ [Tap "Create Game" button]
Create Room Modal
    ├─ Room Name (optional, default: "Player's Game")
    ├─ Seat Configuration for 3 other seats:
    │   ├─ Seat 2: [Open | Private | AI]
    │   ├─ Seat 3: [Open | Private | AI]
    │   └─ Seat 4: [Open | Private | AI]
    ├─ Advanced Settings (collapsible):
    │   ├─ Minimum Games Played (0, 10, 100, 1000)
    │   ├─ Time Limit per Turn (30s, 60s, 90s, No Limit)
    │   └─ Private Room (password protected)
    └─ [Cancel] [Create]
        ↓ [Tap "Create"]
    API Call: POST /api/v1/rooms
        ↓ [Success]
    Waiting Room Screen (room created, waiting for players)
```

**Data Flow**:

1. User taps "Create Game"
2. Modal appears with settings
3. User configures seats and options
4. User taps "Create"
5. API call to create room
6. On success, user enters "Waiting Room" state
7. Other players see new room in lobby via WebSocket broadcast

---

### Flow 3: Joining a Game

```
Lobby Screen
    ↓ [Tap on Room Card]
Room Preview Modal (optional)
    ├─ Room Name
    ├─ Host: PlayerName
    ├─ Players: 2/4
    ├─ Settings: Min Games 100, Time 60s
    └─ [Cancel] [Join]
        ↓ [Tap "Join"]
    API Call: POST /api/v1/rooms/:code/join
        ↓ [Success]
    Waiting Room Screen (joined room, waiting for more players)
```

**Alternative**: Direct join (no preview modal for MVP)

**Data Flow**:

1. User taps room card
2. API call to join room
3. On success, user enters "Waiting Room"
4. WebSocket updates all players in room
5. Lobby updates room player count

---

### Flow 4: Waiting Room (Pre-Game)

```
Waiting Room Screen
    ├─ Room Code: "A3F9"
    ├─ Players:
    │   ├─ Seat 1: You ✓
    │   ├─ Seat 2: Alice ✓
    │   ├─ Seat 3: [Waiting...]
    │   └─ Seat 4: [Waiting...]
    ├─ [Ready] button (toggle)
    └─ [Leave Room] button
        ↓ [4 players joined, all ready]
    Game Screen (game starts automatically)
```

**Data Flow**:

1. User in waiting room
2. Connected to `game:{room_code}` channel
3. Receives `player_joined` events
4. Receives `player_left` events
5. Can toggle ready status
6. When 4 players + all ready → game starts
7. Navigate to Game Screen

---

### Flow 5: Leaving a Room

```
Waiting Room Screen
    ↓ [Tap "Leave Room"]
Confirmation Modal (optional for MVP)
    ├─ "Are you sure you want to leave?"
    └─ [Cancel] [Leave]
        ↓ [Tap "Leave"]
    API Call: DELETE /api/v1/rooms/:code/leave
        ↓ [Success]
    Lobby Screen (back to lobby)
```

**Data Flow**:

1. User taps "Leave"
2. API call to leave room
3. WebSocket notifies remaining players
4. User returns to lobby
5. Room updates player count (or closes if host left)

---

## API & WebSocket Integration

### REST API Endpoints (Already Implemented)

From `pidro_server_specification.md`:

```
GET    /api/v1/rooms                # List available rooms
POST   /api/v1/rooms                # Create room
GET    /api/v1/rooms/:code          # Room details
POST   /api/v1/rooms/:code/join     # Join room
DELETE /api/v1/rooms/:code/leave    # Leave room
```

### Request/Response Formats

#### Create Room

**Request**:

```json
POST /api/v1/rooms
Authorization: Bearer {jwt}
Content-Type: application/json

{
  "name": "Marcel's Game",
  "settings": {
    "min_games": 100,
    "time_limit": 60,
    "private": false,
    "password": null
  },
  "seats": {
    "seat_2": "open",
    "seat_3": "open",
    "seat_4": "ai"
  }
}
```

**Response**:

```json
{
  "data": {
    "id": "uuid",
    "code": "A3F9",
    "name": "Marcel's Game",
    "host": {
      "id": "uuid",
      "username": "marcel"
    },
    "players": [
      {
        "id": "uuid",
        "username": "marcel",
        "position": "north"
      }
    ],
    "status": "waiting",
    "settings": {
      "min_games": 100,
      "time_limit": 60,
      "private": false
    },
    "created_at": "2025-11-23T10:00:00Z"
  }
}
```

#### List Rooms

**Request**:

```
GET /api/v1/rooms?status=waiting
Authorization: Bearer {jwt}
```

**Response**:

```json
{
  "data": [
    {
      "code": "A3F9",
      "name": "Marcel's Game",
      "host": "marcel",
      "players_count": 2,
      "max_players": 4,
      "status": "waiting",
      "settings": {
        "min_games": 100,
        "time_limit": 60
      },
      "created_at": "2025-11-23T10:00:00Z"
    },
    {
      "code": "B7K2",
      "name": "Quick Game",
      "host": "alice",
      "players_count": 3,
      "max_players": 4,
      "status": "waiting",
      "settings": {
        "min_games": 0,
        "time_limit": 30
      },
      "created_at": "2025-11-23T10:05:00Z"
    }
  ],
  "meta": {
    "total_rooms": 2,
    "online_players": 15,
    "active_games": 8
  }
}
```

#### Join Room

**Request**:

```
POST /api/v1/rooms/A3F9/join
Authorization: Bearer {jwt}
```

**Response**:

```json
{
  "data": {
    "code": "A3F9",
    "position": "south",
    "players": [
      { "id": "uuid1", "username": "marcel", "position": "north" },
      { "id": "uuid2", "username": "alice", "position": "south" }
    ],
    "status": "waiting"
  }
}
```

---

### WebSocket Channels

#### Lobby Channel

**Topic**: `"lobby"`

**Outgoing Events** (Server → Client):

```javascript
// Room created
channel.on('room_created', (payload) => {
  // payload: { room: RoomData }
  // Add room to lobby list
});

// Room updated (player count changed)
channel.on('room_updated', (payload) => {
  // payload: { room: RoomData }
  // Update room in lobby list
});

// Room closed (game started or room deleted)
channel.on('room_closed', (payload) => {
  // payload: { room_code: "A3F9" }
  // Remove room from lobby list
});

// Presence updates (online player count)
channel.on('presence_state', (state) => {
  // Calculate online players
});

channel.on('presence_diff', (diff) => {
  // Update online player count
});
```

**Incoming Events** (Client → Server):

```javascript
// None for MVP - lobby is read-only via channel
// All mutations happen via REST API
```

#### Game Channel (Waiting Room)

**Topic**: `"game:{room_code}"`

**Outgoing Events** (Server → Client):

```javascript
// Player joined room
channel.on('player_joined', (payload) => {
  // payload: { player: PlayerData, position: "south" }
  // Update player list in waiting room
});

// Player left room
channel.on('player_left', (payload) => {
  // payload: { player_id: "uuid", position: "south" }
  // Remove player from waiting room
});

// Player ready status changed
channel.on('player_ready', (payload) => {
  // payload: { player_id: "uuid", ready: true }
  // Update ready indicator
});

// Game starting
channel.on('game_starting', (payload) => {
  // payload: { countdown: 3 }
  // Show countdown, then navigate to game
});

// Game started
channel.on('game_state', (payload) => {
  // payload: { state: GameState, position: "north" }
  // Navigate to game screen
});
```

**Incoming Events** (Client → Server):

```javascript
// Toggle ready status
channel.push('ready', {});
```

---

## UI/UX Specification

### Lobby Screen

**Layout**:

```
┌────────────────────────────────────┐
│  ← Back         LOBBY         🔔   │ ← Header
├────────────────────────────────────┤
│  👥 15 Online  |  🎮 8 Games       │ ← Stats Bar
├────────────────────────────────────┤
│  ┌──────────────────────────────┐ │
│  │ 🏠 Marcel's Game        2/4  │ │ ← Room Card
│  │ Host: marcel                 │ │
│  │ ⚙️  Min: 100 games  ⏱  60s   │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ 🏠 Quick Game           3/4  │ │
│  │ Host: alice                  │ │
│  │ ⚙️  Min: 0 games  ⏱  30s     │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │ 🏠 Pro Players Only     1/4  │ │
│  │ Host: bob                    │ │
│  │ ⚙️  Min: 1000 games  ⏱  90s  │ │
│  └──────────────────────────────┘ │
│                                    │
│              [Empty State]         │ ← If no rooms
│         "No games available"       │
│       Tap + to create one!         │
│                                    │
└────────────────────────────────────┘
           │
           ▼
       ┌─────┐
       │  +  │ ← Floating Action Button
       └─────┘
```

**Components**:

1. **Stats Bar**:
   - Online players count (from Presence)
   - Active games count (from API meta)
   - Updates live

2. **Room Card**:
   - Room name
   - Host username
   - Player count (e.g., "2/4")
   - Settings preview (min games, time limit)
   - Status indicator (waiting/ready)
   - Tap to join

3. **Empty State**:
   - Shown when no rooms available
   - Friendly message
   - Encourages creating game

4. **Floating Action Button**:
   - Fixed position (bottom right)
   - "+" icon
   - Opens Create Room Modal

**Styling** (NativeWind):

```jsx
// Stats Bar
<View className="flex-row justify-around bg-gray-100 py-3 px-4">
  <View className="flex-row items-center">
    <Text className="text-lg mr-2">👥</Text>
    <Text className="font-semibold">{onlinePlayers} Online</Text>
  </View>
  <View className="flex-row items-center">
    <Text className="text-lg mr-2">🎮</Text>
    <Text className="font-semibold">{activeGames} Games</Text>
  </View>
</View>

// Room Card
<Pressable
  className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-200 active:bg-gray-50"
  onPress={() => handleJoinRoom(room.code)}
>
  <View className="flex-row justify-between items-center mb-2">
    <Text className="text-lg font-bold">{room.name}</Text>
    <Text className="text-gray-600 font-semibold">
      {room.players_count}/{room.max_players}
    </Text>
  </View>
  <Text className="text-gray-500 text-sm mb-2">
    Host: {room.host}
  </Text>
  <View className="flex-row gap-3">
    <Text className="text-xs text-gray-600">
      ⚙️ Min: {room.settings.min_games} games
    </Text>
    <Text className="text-xs text-gray-600">
      ⏱ {room.settings.time_limit}s
    </Text>
  </View>
</Pressable>

// Floating Action Button
<Pressable
  className="absolute bottom-6 right-6 bg-primary-600 w-16 h-16 rounded-full items-center justify-center shadow-lg active:bg-primary-700"
  onPress={() => setCreateModalVisible(true)}
>
  <Text className="text-white text-3xl">+</Text>
</Pressable>
```

---

### Create Room Modal

**Layout**:

```
┌────────────────────────────────────┐
│         Create New Game        ✕   │ ← Header
├────────────────────────────────────┤
│                                    │
│  Room Name (optional)              │
│  ┌──────────────────────────────┐ │
│  │ Marcel's Game                │ │
│  └──────────────────────────────┘ │
│                                    │
│  Seat Configuration                │
│  ┌──────────────────────────────┐ │
│  │ Seat 2: [Open ▼]             │ │
│  └──────────────────────────────┘ │
│  ┌──────────────────────────────┐ │
│  │ Seat 3: [Open ▼]             │ │
│  └──────────────────────────────┘ │
│  ┌──────────────────────────────┐ │
│  │ Seat 4: [AI ▼]               │ │
│  └──────────────────────────────┘ │
│                                    │
│  ▶ Advanced Settings               │ ← Collapsible
│                                    │
│  ┌────────────┐  ┌──────────────┐ │
│  │  Cancel    │  │   Create     │ │
│  └────────────┘  └──────────────┘ │
└────────────────────────────────────┘
```

**Expanded Advanced Settings**:

```
│  ▼ Advanced Settings               │
│                                    │
│  Minimum Games Played              │
│  ┌──────────────────────────────┐ │
│  │ [0] [10] [100] [1000]        │ │ ← Segmented Control
│  └──────────────────────────────┘ │
│                                    │
│  Time Limit per Turn               │
│  ┌──────────────────────────────┐ │
│  │ [30s] [60s] [90s] [None]     │ │
│  └──────────────────────────────┘ │
│                                    │
│  🔒 Private Room                   │
│  ┌──────────────────────────────┐ │
│  │ Password: ●●●●●●●●           │ │
│  └──────────────────────────────┘ │
```

**Seat Options**:

- **Open**: Anyone can join
- **Private**: Invite link only (not MVP)
- **AI**: Bot player (not MVP, but show disabled)

**Validation**:

- Room name max 50 characters
- At least one seat must be "Open" (can't create game with no open seats)
- Cannot create if already in a room

---

### Waiting Room Screen

**Layout**:

```
┌────────────────────────────────────┐
│  ← Leave       Room: A3F9      ⋯   │ ← Header
├────────────────────────────────────┤
│  Waiting for players...            │ ← Status
│                                    │
│  ┌──────────────────────────────┐ │
│  │      North                   │ │
│  │    [Waiting...]              │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────┐      ┌────────────┐ │
│  │  West    │      │   East     │ │
│  │  Alice ✓ │      │ [Waiting...│ │
│  └──────────┘      └────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │      South (You)             │ │
│  │      Marcel ✓                │ │
│  └──────────────────────────────┘ │
│                                    │
│  Game Settings:                    │
│  • Min Games: 100                  │
│  • Time Limit: 60s per turn        │
│                                    │
│  ┌──────────────────────────────┐ │
│  │         I'm Ready!           │ │ ← Ready Button
│  └──────────────────────────────┘ │
│                                    │
└────────────────────────────────────┘
```

**When All Ready**:

```
│  Game starting in 3...             │ ← Countdown
│                                    │
│  ┌──────────────────────────────┐ │
│  │  All players ready!          │ │
│  │  Starting game...            │ │
│  └──────────────────────────────┘ │
```

**Components**:

1. **Player Seat**:
   - Position label (North, South, East, West)
   - Player name or "[Waiting...]"
   - Ready indicator (✓)
   - Avatar (optional, future)

2. **Ready Button**:
   - Toggle state (Ready / Not Ready)
   - Disabled until you join
   - Green when ready

3. **Settings Display**:
   - Read-only view of room settings
   - Shows what was configured

**Player States**:

- **Empty**: "[Waiting...]" - gray
- **Joined**: "PlayerName" - white/light
- **Ready**: "PlayerName ✓" - green

---

## State Management Architecture

### Required State

#### Lobby State

The lobby needs to track:

- **rooms**: Array of available rooms
- **onlinePlayers**: Count from Presence
- **activeGames**: Count from API meta
- **isLoading**: Loading indicator
- **error**: Error messages

**Operations**:

- Set initial room list
- Add new room (WebSocket event)
- Update existing room (player count changes)
- Remove room (game started/closed)
- Update stats (Presence changes)

#### Current Room State

When in a waiting room:

- **room**: Current room details
- **myPosition**: Which seat you occupy (north/south/east/west)
- **players**: Array of players in room
- **readyStatus**: Map of player_id → boolean

**Operations**:

- Set room on join
- Add player when someone joins
- Remove player when someone leaves
- Update ready status
- Clear on leave

### API Client Functions

You'll need API functions for:

```typescript
// Fetch all waiting rooms
fetchRooms(): Promise<{ rooms: Room[], meta: Stats }>

// Create new room
createRoom(config: CreateRoomInput): Promise<Room>

// Join existing room
joinRoom(roomCode: string): Promise<JoinResponse>

// Leave room
leaveRoom(roomCode: string): Promise<void>
```

### WebSocket Event Handlers

#### Lobby Channel

```typescript
// Listen for:
"room_created" → Add to lobby list
"room_updated" → Update player count
"room_closed" → Remove from list
"presence_state" → Calculate online count
"presence_diff" → Update online count
```

#### Game Channel (Waiting Room)

```typescript
// Listen for:
"player_joined" → Add to player list
"player_left" → Remove from list
"player_ready" → Update ready status
"game_starting" → Show countdown
"game_state" → Navigate to game

// Send:
"ready" → Toggle ready status
```

---

## Technical Implementation

### Screen Requirements

You'll need three main screens:

1. **Lobby Screen**
   - Shows list of available rooms
   - Stats bar (online players, active games)
   - Pull-to-refresh support
   - Create button (floating or header)
   - Empty state when no rooms

2. **Waiting Room Screen**
   - 4 player seats (compass layout)
   - Ready toggle button
   - Leave room button
   - Game settings display
   - Countdown when all ready

3. **Create Room Modal**
   - Room name input (optional)
   - Basic settings initially
   - Advanced settings (collapsible, optional for MVP)
   - Create/Cancel buttons

### Component Hierarchy

```
Lobby Screen
  ├─ Header (Back, Title)
  ├─ Stats Bar
  ├─ Room List (scrollable)
  │   └─ Room Card (repeating)
  ├─ Empty State (conditional)
  └─ Create Button

Waiting Room Screen
  ├─ Header (Leave, Room Code)
  ├─ Status Message
  ├─ Player Seats (4x)
  │   ├─ North
  │   ├─ West & East (side by side)
  │   └─ South (You)
  ├─ Settings Display
  └─ Ready Button

Create Room Modal
  ├─ Modal Header
  ├─ Room Name Input
  ├─ Advanced Settings (collapsible)
  └─ Action Buttons
```

### Key UI Requirements

**Room Card**:

- Show room name or "{host}'s Game"
- Player count (e.g., "2/4")
- Host username
- Settings preview (min games, time limit)
- Status indicator (color coding)
- Tap to join

**Player Seat**:

- Position label (North/South/East/West)
- Player name or "[Waiting...]"
- Ready indicator (✓ checkmark)
- Different styling for: empty, joined, ready
- "You" indicator for current player

**Stats Bar**:

- Online players count
- Active games count
- Connection status indicator

### Navigation Flow

```
Home Screen
    ↓ [Navigate to Lobby]
Lobby Screen
    ├→ [Tap Create] → Create Modal → [Success] → Waiting Room
    └→ [Tap Room Card] → API Call → [Success] → Waiting Room

Waiting Room
    ├→ [Leave] → Confirmation → API Call → Lobby Screen
    └→ [Game Starts] → Game Screen
```

### Real-time Updates

**Lobby Screen**:

- Connect to `lobby` channel on mount
- Update room list on `room_created`, `room_updated`, `room_closed`
- Update stats on Presence events
- Disconnect on unmount

**Waiting Room**:

- Connect to `game:{code}` channel on mount
- Update players on `player_joined`, `player_left`
- Update ready status on `player_ready`
- Navigate to game on `game_state`
- Disconnect on unmount or navigation

---

## Phase Breakdown

### Phase 2A: Lobby View (Week 2, Days 1-2)

**Goal**: View and browse available rooms

**Tasks**:

- [ ] Create lobby store (Zustand)
- [ ] Implement `useRooms` hook (TanStack Query)
- [ ] Create lobby screen layout
- [ ] Build RoomCard component
- [ ] Build StatsBar component
- [ ] Build EmptyState component
- [ ] Integrate lobby WebSocket channel
- [ ] Handle room updates in real-time
- [ ] Add pull-to-refresh

**Acceptance Criteria**:

- Can see list of available rooms
- Room list updates live when others create rooms
- Stats show online players and active games
- Pull to refresh works

---

### Phase 2B: Create Room (Week 2, Days 2-3)

**Goal**: Create new game rooms

**Tasks**:

- [ ] Build CreateRoomModal component
- [ ] Implement form validation
- [ ] Add advanced settings (collapsible)
- [ ] Implement `useCreateRoom` mutation
- [ ] Wire up create button
- [ ] Navigate to waiting room on success
- [ ] Handle errors gracefully

**Acceptance Criteria**:

- Can create room with default settings
- Can configure advanced settings
- Room appears in lobby after creation
- Error messages show for failed creation
- Successfully navigate to waiting room

---

### Phase 2C: Waiting Room (Week 2, Days 3-4)

**Goal**: Wait for players and start game

**Tasks**:

- [ ] Create current room store (Zustand)
- [ ] Build waiting room screen layout
- [ ] Build PlayerSeat component
- [ ] Build ReadyButton component
- [ ] Implement ready toggle
- [ ] Handle player join/leave events
- [ ] Implement game start transition
- [ ] Add countdown animation

**Acceptance Criteria**:

- See all 4 player seats
- Players update in real-time when joining
- Can toggle ready status
- Game starts when all ready
- Smooth transition to game screen

---

### Phase 2D: Join & Leave (Week 2, Day 4)

**Goal**: Join rooms and leave rooms

**Tasks**:

- [ ] Implement `useJoinRoom` mutation
- [ ] Implement `useLeaveRoom` mutation
- [ ] Add join logic to room card tap
- [ ] Add leave button to waiting room
- [ ] Add confirmation dialog for leave
- [ ] Handle host leaving (room closes)
- [ ] Handle player kick (future)

**Acceptance Criteria**:

- Can tap room card to join
- Successfully join and enter waiting room
- Can leave room and return to lobby
- Confirmation dialog prevents accidental leave
- Room updates for remaining players

---

### Phase 2E: Polish & Testing (Week 2, Day 5)

**Goal**: Smooth UX and bug fixes

**Tasks**:

- [ ] Add loading states everywhere
- [ ] Add error handling for all API calls
- [ ] Add reconnection logic for WebSocket
- [ ] Test with 4 real devices
- [ ] Test with network interruptions
- [ ] Add accessibility labels
- [ ] Performance optimization

**Acceptance Criteria**:

- No crashes or freezes
- Clear error messages
- Graceful handling of disconnections
- Works smoothly with 4 players
- Accessible to screen readers

---

## Testing Strategy

### Unit Tests

```typescript
// __tests__/unit/stores/lobby.test.ts
import { useLobbyStore } from '@/stores/lobby';

describe('Lobby Store', () => {
  beforeEach(() => {
    useLobbyStore.getState().reset();
  });

  it('should add room to list', () => {
    const room = {
      code: 'TEST',
      name: 'Test Room',
      host: 'alice',
      players_count: 1,
      max_players: 4,
      status: 'waiting',
      settings: {},
    };

    useLobbyStore.getState().addRoom(room);
    expect(useLobbyStore.getState().rooms).toHaveLength(1);
  });

  it('should update existing room', () => {
    const room = {
      code: 'TEST',
      name: 'Test Room',
      host: 'alice',
      players_count: 1,
      max_players: 4,
      status: 'waiting',
      settings: {},
    };

    useLobbyStore.getState().addRoom(room);
    useLobbyStore.getState().updateRoom({
      ...room,
      players_count: 2,
    });

    expect(useLobbyStore.getState().rooms[0].players_count).toBe(2);
  });

  it('should remove room', () => {
    const room = {
      code: 'TEST',
      name: 'Test Room',
      host: 'alice',
      players_count: 1,
      max_players: 4,
      status: 'waiting',
      settings: {},
    };

    useLobbyStore.getState().addRoom(room);
    useLobbyStore.getState().removeRoom('TEST');
    expect(useLobbyStore.getState().rooms).toHaveLength(0);
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/lobby.test.tsx
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/api/query-client';
import LobbyScreen from '@/app/lobby';

// Mock API
jest.mock('@/api/rooms', () => ({
  fetchRooms: jest.fn(() =>
    Promise.resolve({
      rooms: [
        {
          code: 'A3F9',
          name: "Test Room",
          host: 'alice',
          players_count: 2,
          max_players: 4,
          status: 'waiting',
          settings: {},
        },
      ],
      meta: {
        total_rooms: 1,
        online_players: 5,
        active_games: 2,
      },
    })
  ),
}));

describe('Lobby Screen', () => {
  it('should display rooms', async () => {
    const { getByText } = render(
      <QueryClientProvider client={queryClient}>
        <LobbyScreen />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(getByText('Test Room')).toBeTruthy();
      expect(getByText('2/4')).toBeTruthy();
    });
  });

  it('should open create modal', async () => {
    const { getByText, getByTestId } = render(
      <QueryClientProvider client={queryClient}>
        <LobbyScreen />
      </QueryClientProvider>
    );

    const createButton = getByTestId('create-room-button');
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(getByText('Create New Game')).toBeTruthy();
    });
  });
});
```

### E2E Test Scenarios

**Scenario 1: Create and Join**

1. User A creates room
2. Room appears in lobby
3. User B sees room in their lobby
4. User B joins room
5. Both users in waiting room
6. Player count updates

**Scenario 2: Full Room Flow**

1. User A creates room
2. Users B, C, D join
3. All 4 players in waiting room
4. All toggle ready
5. Game starts automatically
6. Navigate to game screen

**Scenario 3: Leave Room**

1. User A creates room
2. User B joins
3. User B leaves
4. User A still in room
5. Player count updates

---

## Future Enhancements

### Post-MVP Features

1. **Private Rooms**:
   - Password protection
   - Invite link generation
   - Share via native share sheet

2. **Player Filtering**:
   - Enforce minimum games requirement
   - Block/unblock players
   - Friend-only rooms

3. **Room Templates**:
   - Save favorite settings
   - Quick create buttons
   - Variant presets (Finnish, Louisiana)

4. **Enhanced Lobby**:
   - Search/filter rooms
   - Sort by players, time created
   - Favorite rooms

5. **Waiting Room Features**:
   - Chat before game starts
   - Player profiles preview
   - Kick player (host only)
   - Change settings before start

6. **Notifications**:
   - Push notification when room fills
   - Push when game about to start
   - Friend joins your room

7. **Analytics**:
   - Track most popular settings
   - Peak hours for matchmaking
   - Average wait time

---

## API Contract Validation

### Server Endpoints Status

From `MASTERPLAN-server.md`:

✅ **Implemented**:

- POST /api/v1/rooms - Create room
- GET /api/v1/rooms - List rooms
- POST /api/v1/rooms/:code/join - Join room
- DELETE /api/v1/rooms/:code/leave - Leave room
- GET /api/v1/rooms/:code - Room details

✅ **WebSocket Channels**:

- Lobby channel - room_created, room_updated, room_closed
- Game channel - player_joined, player_left, game_state

### Missing Features (Server Side)

⚠️ **Optional Settings** (not blocking MVP):

- Seat configuration (open/private/ai) - Default: all open
- Minimum games filter - Can add later
- Time limit enforcement - Can add later
- Private rooms/passwords - Can add later

**Decision**: Implement basic room creation first, add advanced settings in Phase 3+

---

## Success Criteria

### Technical

- ✅ Lobby loads rooms in <2s
- ✅ WebSocket updates within 500ms
- ✅ No memory leaks in room list
- ✅ Graceful WebSocket reconnection
- ✅ Offline handling with cached data

### User Experience

- ✅ Clear feedback on all actions
- ✅ Smooth animations and transitions
- ✅ Intuitive room creation flow
- ✅ No confusing states or errors
- ✅ Works reliably with 4 players

### Coverage

- ✅ Unit tests for stores (80%+)
- ✅ Integration tests for key flows
- ✅ Manual testing with 4 devices
- ✅ Network interruption testing

---

## Dependencies

### Must Complete Before Phase 2

✅ **Phase 1: Authentication**

- User can register/login
- JWT token stored securely
- API client configured

✅ **Server Ready**

- Room endpoints deployed
- WebSocket channels working
- Presence tracking enabled

### Blocks Phase 3 (Game Screen)

⏳ **Phase 2 Completion**

- Can create and join rooms
- Can navigate to waiting room
- Game starts when ready

---

## Notes

- Focus on core functionality first (create, join, leave)
- Advanced settings can come later
- WebSocket is critical for good UX
- Test with real network conditions
- Consider rate limiting on create room
- Handle edge cases (host disconnect, etc.)

---

**Next Steps**: Start Phase 2A - Lobby View implementation

**Target**: Complete Phase 2 by end of Week 2 of mobile development

---

## Appendix: Type Definitions

```typescript
// src/types/game.ts

export interface Room {
  code: string;
  name?: string;
  host: string; // username
  host_id: string;
  players: Player[];
  players_count: number;
  max_players: number;
  status: 'waiting' | 'ready' | 'playing' | 'finished' | 'closed';
  settings: RoomSettings;
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  username: string;
  position?: 'north' | 'south' | 'east' | 'west';
  ready?: boolean;
}

export interface RoomSettings {
  min_games?: number;
  time_limit?: number; // seconds
  private?: boolean;
  password?: string;
  variant?: 'finnish' | 'louisiana' | 'california';
}

export interface CreateRoomInput {
  name?: string;
  settings?: Partial<RoomSettings>;
  seats?: {
    seat_2?: 'open' | 'private' | 'ai';
    seat_3?: 'open' | 'private' | 'ai';
    seat_4?: 'open' | 'private' | 'ai';
  };
}
```

---

**End of Specification**
