import type {
  LobbyCategories,
  LobbyCategoryKey,
  Position,
  Room,
  RoomStatus,
  Seat,
} from '../types/lobby';
import { INDEX_TO_POSITION, POSITION_TO_INDEX } from './positions';

function normalizeSeat(raw: any, fallbackIndex: number): Seat {
  const seatIndex =
    typeof raw?.seat_index === 'number' && Number.isFinite(raw.seat_index)
      ? raw.seat_index
      : fallbackIndex;

  const position: Position | undefined = raw?.position ?? INDEX_TO_POSITION[seatIndex] ?? undefined;

  const player =
    raw?.player ??
    (raw?.player_id
      ? {
          id: String(raw.player_id),
          username: String(raw.player_username ?? raw.player_id),
          display_name: raw.player_display_name ?? null,
          is_bot: raw.player_is_bot ?? false,
          avatar_url: raw.player_avatar_url ?? null,
        }
      : null);

  const status: 'occupied' | 'free' = raw?.status === 'occupied' || player ? 'occupied' : 'free';

  return {
    seat_index: seatIndex,
    position,
    status,
    player: player ?? null,
    player_id: raw?.player_id ?? player?.id ?? null,
  };
}

export function buildPositionsFromSeats(
  seats?: Seat[]
): Record<Position, string | null> | undefined {
  if (!seats?.length) return undefined;

  const positions: Record<Position, string | null> = {
    north: null,
    east: null,
    south: null,
    west: null,
  };

  seats.forEach((seat) => {
    if (!seat.position) return;
    positions[seat.position] = seat.player?.id ?? seat.player_id ?? null;
  });

  return positions;
}

/**
 * The REST room payload (`GET /rooms/:code`) keys seats by position
 * (`{north: {user_id, substitute, ...}}`) instead of the array shape the
 * lobby channel sends. Bots are detectable only by the `bot_*` user id —
 * `substitute: true` also marks HUMANS who filled an open seat, and
 * `occupant_type` is unreliable in this payload.
 */
function seatsFromPositionMap(rawSeats: Record<string, any>): any[] {
  return Object.entries(rawSeats).map(([key, value]) => {
    const position = (value?.position ?? key) as Position;
    const userId = value?.user_id ?? value?.player_id ?? null;
    // Bot-substituted seats carry occupant_type: 'bot' with a null user_id,
    // so check both signals.
    const isBot =
      value?.occupant_type === 'bot' ||
      (typeof userId === 'string' && userId.startsWith('bot_'));
    const username = value?.username ?? value?.player_username ?? null;
    const displayName = value?.display_name ?? value?.player_display_name ?? null;
    const playerId = userId ?? (isBot ? `bot_${String(position)}` : null);

    return {
      seat_index: POSITION_TO_INDEX[position],
      position,
      status: playerId ? 'occupied' : 'free',
      player:
        playerId && (isBot || username || displayName)
          ? {
              id: String(playerId),
              username: username ?? displayName ?? 'Bot',
              display_name: displayName,
              is_bot: isBot,
            }
          : null,
      // Only expose player_id when we can render a useful identity —
      // normalizeSeat falls back to showing the raw id otherwise.
      player_id: isBot || username || displayName ? playerId : null,
    };
  });
}

export function normalizeRoom(raw: any): Room {
  const rawSeats =
    raw?.seats && !Array.isArray(raw.seats) && typeof raw.seats === 'object'
      ? seatsFromPositionMap(raw.seats)
      : raw?.seats;

  const seats = Array.isArray(rawSeats)
    ? rawSeats.map((seat: any, idx: number) => normalizeSeat(seat, idx))
    : [];

  const positions = raw?.positions ?? buildPositionsFromSeats(seats);

  const availablePositions: Position[] =
    raw?.available_positions ??
    seats
      .filter((seat: Seat) => seat.position && seat.status !== 'occupied')
      .map((seat: Seat) => seat.position!) ??
    [];

  const occupiedCount = seats.filter((seat: Seat) => seat.status === 'occupied' || !!seat.player).length;

  const playerCount =
    raw?.player_count ??
    raw?.players_count ??
    (Array.isArray(raw?.player_ids) ? raw.player_ids.length : occupiedCount);

  const status: RoomStatus = (raw?.status as RoomStatus | undefined) ?? 'waiting';

  const name = raw?.name ?? raw?.metadata?.name ?? raw?.code ?? 'Game Room';

  return {
    ...raw,
    id: raw?.id ?? raw?.room_id ?? undefined,
    code: raw?.code ?? raw?.room_code ?? raw?.id ?? '',
    name,
    metadata: raw?.metadata,
    host_id: raw?.host_id ?? raw?.hostId ?? raw?.host?.id ?? null,
    locked: raw?.locked ?? false,
    status,
    player_count: playerCount,
    players_count: playerCount,
    max_players: raw?.max_players ?? raw?.maxPlayers ?? 4,
    created_at: raw?.created_at ?? raw?.inserted_at ?? raw?.createdAt,
    last_activity: raw?.last_activity ?? raw?.updated_at ?? raw?.updatedAt,
    seats,
    positions,
    available_positions: availablePositions,
  };
}

export function normalizeRooms(rawRooms: any): Room[] {
  if (!Array.isArray(rawRooms)) return [];
  return rawRooms.map((room) => normalizeRoom(room));
}

export const lobbyCategoryKeys: LobbyCategoryKey[] = [
  'my_rejoinable',
  'open_tables',
  'substitute_needed',
  'spectatable',
];

export function emptyLobbyCategories(): LobbyCategories {
  return {
    my_rejoinable: [],
    open_tables: [],
    substitute_needed: [],
    spectatable: [],
  };
}

export function normalizeLobbyCategories(rawLobby: any): LobbyCategories {
  const normalized = emptyLobbyCategories();
  lobbyCategoryKeys.forEach((key) => {
    normalized[key] = normalizeRooms(rawLobby?.[key]);
  });
  return normalized;
}

export function flattenLobbyCategories(lobby: LobbyCategories): Room[] {
  const seen = new Set<string>();
  const rooms: Room[] = [];

  lobbyCategoryKeys.forEach((key) => {
    lobby[key].forEach((room) => {
      if (!room.code || seen.has(room.code)) return;
      seen.add(room.code);
      rooms.push(room);
    });
  });

  return rooms;
}

export function hasLobbyCategories(rawLobby: any): boolean {
  return lobbyCategoryKeys.some((key) => Array.isArray(rawLobby?.[key]));
}
