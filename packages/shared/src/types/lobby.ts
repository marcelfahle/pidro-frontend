export type RoomStatus = 'waiting' | 'ready' | 'playing' | 'finished';
export type SeatType = 'open' | 'private' | 'ai';
export type BotDifficulty = 'random' | 'basic' | 'smart';
export type Position = 'north' | 'east' | 'south' | 'west';
export type PositionPreference = Position | 'north_south' | 'east_west';

export interface RoomSettings {
  min_games: number;
  time_limit: number;
  private: boolean;
}

export interface Player {
  id: string;
  username: string;
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
  name?: string;
  metadata?: {
    name?: string;
    [key: string]: unknown;
  };
  host_id?: string | null;
  status: RoomStatus;
  player_count?: number;
  players_count?: number;
  max_players?: number;
  created_at?: string;
  last_activity?: string;
  settings?: RoomSettings;
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

export interface CreateRoomRequest {
  name: string;
  settings: RoomSettings & { password?: string };
  seats: {
    seat_2: SeatType;
    seat_3: SeatType;
    seat_4: SeatType;
  };
  bot_difficulty?: BotDifficulty;
}
