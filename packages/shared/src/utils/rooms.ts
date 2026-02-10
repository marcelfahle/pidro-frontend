import type { Position, Room, RoomStatus, Seat } from '../types/lobby';
import { INDEX_TO_POSITION } from './positions';

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

export function normalizeRoom(raw: any): Room {
  const seats = Array.isArray(raw?.seats)
    ? raw.seats.map((seat: any, idx: number) => normalizeSeat(seat, idx))
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
