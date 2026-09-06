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
