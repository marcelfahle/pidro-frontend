export type RoomStatus = 'waiting' | 'ready' | 'playing' | 'finished';
export type SeatType = 'open' | 'ai';
export type BotDifficulty = 'random' | 'basic' | 'smart';
export type Position = 'north' | 'east' | 'south' | 'west';
export type PositionPreference = Position | 'north_south' | 'east_west';

export interface ReadinessSnapshot {
  room_id: string;
  ready_epoch: number;
  snapshot_revision: number;
  status: RoomStatus;
  positions: Record<Position, string | null>;
  seats: Record<
    Position,
    {
      occupant_type: 'human' | 'bot' | 'vacant';
      status: string;
      user_id: string | null;
      username?: string | null;
      avatar_url?: string | null;
    }
  >;
  ready_players: Position[];
}

/**
 * How a table was set up. The server stores it on the room and sends the same
 * shape over REST and over the lobby channel.
 */
export interface RoomConfig {
  name: string | null;
  bot_difficulty: BotDifficulty;
  solo: boolean;
}

export interface Player {
  id: string;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
  is_bot?: boolean;
}

export interface Seat {
  seat_index: number;
  status: 'occupied' | 'free';
  player: Player | null;
  position?: Position;
  player_id?: string | null;
}

export interface Room {
  id?: string;
  code: string;
  /** Lifted from `config.name` by `normalizeRoom`, falling back to the room code. */
  name?: string;
  config?: RoomConfig;
  host_id?: string | null;
  locked?: boolean;
  status: RoomStatus;
  player_count?: number;
  players_count?: number;
  max_players?: number;
  created_at?: string;
  last_activity?: string;
  seats?: Seat[];
  player_ids?: string[];
  positions?: {
    north: string | null;
    east: string | null;
    south: string | null;
    west: string | null;
  };
  available_positions?: Position[];
}

export type LobbyCategoryKey =
  'my_rejoinable' | 'open_tables' | 'substitute_needed' | 'spectatable';

export interface LobbyCategories {
  my_rejoinable: Room[];
  open_tables: Room[];
  substitute_needed: Room[];
  spectatable: Room[];
}

/** Everything the server accepts when creating a room. Any other key is rejected. */
export interface CreateRoomRequest {
  name?: string;
  seats?: {
    seat_2: SeatType;
    seat_3: SeatType;
    seat_4: SeatType;
  };
}
