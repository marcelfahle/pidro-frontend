import type { SeatLifecycleSnapshot } from "../types/game";

const POSITIONS = ["north", "east", "south", "west"] as const;
const STATUSES = [
  "normal",
  "reconnecting",
  "bot_substitute",
  "permanent_bot",
  "vacant",
];
const nullableString = (value: unknown): boolean =>
  value === null || typeof value === "string";
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export function lifecycleFromReply(
  payload: unknown,
): SeatLifecycleSnapshot | null {
  if (!record(payload)) return null;
  const candidate = payload.seat_lifecycle ?? payload;
  if (
    !record(candidate) ||
    typeof candidate.room_code !== "string" ||
    typeof candidate.room_id !== "string" ||
    !Number.isSafeInteger(candidate.revision) ||
    (candidate.revision as number) < 0 ||
    !nullableString(candidate.owner_id) ||
    typeof candidate.room_status !== "string" ||
    !record(candidate.seats)
  )
    return null;

  for (const position of POSITIONS) {
    const seat = candidate.seats[position];
    if (
      !record(seat) ||
      typeof seat.status !== "string" ||
      !STATUSES.includes(seat.status) ||
      !nullableString(seat.player_id) ||
      !nullableString(seat.username) ||
      (seat.avatar_url !== undefined && !nullableString(seat.avatar_url))
    )
      return null;
    if (
      seat.decision !== null &&
      (!record(seat.decision) ||
        typeof seat.decision.id !== "string" ||
        !nullableString(seat.decision.player_name))
    )
      return null;
  }
  return candidate as unknown as SeatLifecycleSnapshot;
}
