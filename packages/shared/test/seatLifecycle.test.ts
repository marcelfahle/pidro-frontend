import { afterEach, describe, expect, test } from "bun:test";
import { lifecycleFromReply } from "../src/utils/seatLifecycle";
import { useGameStore } from "../src/stores/game";
import type { SeatLifecycleSnapshot } from "../src/types/game";

function snapshot(roomId = "room-1", revision = 1): SeatLifecycleSnapshot {
  const vacant = {
    status: "vacant" as const,
    player_id: null,
    username: null,
    decision: null,
  };
  return {
    room_id: roomId,
    room_code: "ABCD",
    revision,
    owner_id: null,
    room_status: "playing",
    seats: {
      north: { ...vacant },
      east: { ...vacant },
      south: { ...vacant },
      west: { ...vacant },
    },
  };
}

afterEach(() => useGameStore.getState().reset());

describe("seat lifecycle boundary", () => {
  test('moves avatars with their player and clears them when another player takes the seat', () => {
    useGameStore.setState({ roomCode: 'ABCD' });
    const first = snapshot();
    first.seats.north = { status: 'normal', player_id: 'anna', username: 'Anna', decision: null };
    useGameStore.getState().applySeatLifecycle(first);
    useGameStore.getState().refreshPlayerIdentities({
      code: 'ABCD', status: 'playing',
      seats: [{ seat_index: 0, status: 'occupied', player: { id: 'anna', username: 'Anna', avatar_url: 'anna.jpg' } }],
    });
    const moved = snapshot('room-1', 2);
    moved.seats.east = first.seats.north;
    useGameStore.getState().applySeatLifecycle(moved);
    expect(useGameStore.getState().playerMeta.east.avatar_url).toBe('anna.jpg');
    expect(useGameStore.getState().playerMeta.north.avatar_url).toBeNull();
    const replaced = snapshot('room-1', 3);
    replaced.seats.east = { status: 'normal', player_id: 'bob', username: 'Bob', decision: null };
    useGameStore.getState().applySeatLifecycle(replaced);
    expect(useGameStore.getState().playerMeta.east.avatar_url).toBeNull();
  });

  test("accepts complete events and replies, rejecting incomplete or invalid seats", () => {
    const valid = snapshot();
    expect(lifecycleFromReply(valid)).toBe(valid);
    expect(lifecycleFromReply({ seat_lifecycle: valid })).toBe(valid);
    for (const position of ["north", "east", "south", "west"] as const) {
      expect(
        lifecycleFromReply({
          ...valid,
          seats: { ...valid.seats, [position]: undefined },
        }),
      ).toBeNull();
      for (const invalid of [
        { status: "unknown" },
        { player_id: 1 },
        { username: [] },
        { decision: {} },
      ]) {
        expect(
          lifecycleFromReply({
            ...valid,
            seats: {
              ...valid.seats,
              [position]: { ...valid.seats[position], ...invalid },
            },
          }),
        ).toBeNull();
      }
    }
    expect(lifecycleFromReply({ ...valid, revision: NaN })).toBeNull();
    expect(lifecycleFromReply({ ...valid, revision: -1 })).toBeNull();
  });

  test("rejects another room instance and old revisions until the session resets", () => {
    useGameStore.setState({ roomCode: "ABCD" });
    const accepted = snapshot("current", 3);
    useGameStore.getState().applySeatLifecycle(accepted);
    useGameStore.getState().applySeatLifecycle(snapshot("old", 99));
    useGameStore.getState().applySeatLifecycle(snapshot("current", 2));
    expect(useGameStore.getState().lifecycle).toBe(accepted);
    const next = snapshot("current", 4);
    useGameStore.getState().applySeatLifecycle(next);
    expect(useGameStore.getState().lifecycle).toBe(next);
    useGameStore.getState().reset();
    useGameStore.setState({ roomCode: "ABCD" });
    const recreated = snapshot("new");
    useGameStore.getState().applySeatLifecycle(recreated);
    expect(useGameStore.getState().lifecycle).toBe(recreated);
  });
});
