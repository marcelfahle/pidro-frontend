<!-- Generated and maintained by Ralph. Prioritized list of items to implement. -->

# Implementation Plan — Pidro Game Client

Last updated: 2026-02-10

## Current State Summary

All 6 phases of frontend work are complete. Both backend items (1.5, 1.6) are now implemented. 96 tests pass across 16 test files. All typecheck, lint, and test validations pass.

No remaining implementation items from the original spec.

---

## Spec Notes / Inconsistencies

- **Phase naming:** Spec lists `declaring` and `declaring_trump` as separate concepts; shared types have both. The spec also references `trump_declaration` — the current `GamePhase` already has it. Confirm server uses consistent naming.
- **`complete` vs `game_over`:** Spec lists both as separate phases. Both are now in `GamePhase` type. Need to verify if server sends `complete` as a distinct phase.
- **`lobbyApi.createRoom` return type:** Returns `Promise<CreateRoomResponse['data']>` which TypeScript sees as possibly `undefined` even though the function always constructs a value. Code uses `result?.code` with null check as workaround.
- **Room controller param nesting:** The frontend sends `CreateRoomRequest` as the POST body directly (not wrapped in `"room"` key), so the backend `create/2` uses `params["room"] || params` to handle both shapes.

## Implementation Notes

- **Card component uses `<button>` for interactive cards:** Playable cards render as `<button>` elements for proper a11y, while static cards render as `<div>`. This avoids biome lint issues with aria-label on non-interactive elements.
- **`getPidroPoints()` exported from Card.tsx:** Utility function that calculates point values for Pidro scoring cards (Ace=1, Two=1, Jack=1, Five=5, Ten=10). Only applies to trump suit cards and the off-five. Can be used by other components.
- **GamePage uses early guard pattern:** `if (!code || !userId) return` in the useEffect prevents unnecessary API calls. The code/userId are narrowed to local consts to avoid non-null assertions.
- **GameTable CenterContent routing:** Phase-to-component mapping: `bidding`→BiddingPanel, `declaring`/`declaring_trump`/`trump_declaration`→TrumpSelector, `second_deal` (with >6 cards)→HandSelector, `playing`→TrickArea. Other phases show phase label text.
- **GameOverOverlay positioning:** Rendered by GamePage (not GameTable) as an absolute overlay with z-50 on top of a relative wrapper around GameTable.
- **Play Again creates new room with same config:** `deriveSeatConfig()` inspects room seats on load (checking `is_bot` on each player) and stores the config in a ref. On click, creates a new room via `lobbyApi.createRoom` with same name and seat types, defaulting to `bot_difficulty: 'basic'` when bots are present. Falls back to lobby navigation if config is unavailable, shows error toast on failure.
- **ConnectionBanner uses useRef for wasDisconnected:** Using `useState` caused the timer cleanup to fire when the state updated, canceling the auto-dismiss timeout. `useRef` avoids the circular effect dependency.
- **Lobby channel onClose clears global reference:** Added `channel.onClose()` handler to `useLobbyChannel` to clear the `globalChannel` singleton when the socket disconnects (e.g. on sign-out). This allows fresh channel creation on re-login within the same session.
- **Toast system uses custom CSS animations:** `@keyframes slide-in-top` and `slide-out-top` defined in `index.css`. Toasts auto-dismiss after 3 seconds with a 200ms exit animation.
- **Shake animation for invalid card play:** CSS `@keyframes shake` in `index.css`, applied via `animate-shake` class on the PlayerHand card container. Triggered by `handShaking` state in GamePage when `pushGameAction('play_card', ...)` is rejected.
- **Backend select_hand handler:** Added `handle_in("select_hand", %{"cards" => cards}, socket)` to `game_channel.ex`. Converts JSON card objects `%{"rank" => rank, "suit" => suit}` to engine tuples `{rank, :suit_atom}` using `String.to_existing_atom/1` for safety. Dispatches via `apply_game_action(socket, {:select_hand, card_tuples})`.
- **Backend bot support in room creation:** Extended `room_controller.ex` `create/2` to accept `seats` and `bot_difficulty` params. After room creation, for each seat configured as `"ai"`, calls `BotManager.start_bot(room.code, position, difficulty, 1000)`. BotPlayer's init auto-joins the room via `RoomManager.join_room`, and the game auto-starts when all 4 seats are filled. Position mapping: host→north (auto), seat_2→east, seat_3→south, seat_4→west.
- **BotDifficulty type added to shared:** `CreateRoomRequest` now includes optional `bot_difficulty?: BotDifficulty` where `BotDifficulty = 'random' | 'basic' | 'smart'`. LobbyPage only sends `bot_difficulty` when at least one seat is configured as AI.
- **Console statements removed from channel hooks:** Production channel hooks (useLobbyChannel, useGameChannel) no longer log to console. Only `console.error` retained in `realtime.ts` for critical init failures. `pushGameAction` now returns a rejected promise (instead of `undefined`) when no channel is active — callers already handle this via catch.
- **WebPhoenixSocket.cleanup() method added:** Removes the `visibilitychange` event listener and disconnects the socket. Prevents a memory leak from the listener persisting indefinitely.
- **GamePage tests use RTL's `waitFor` instead of `vi.waitFor`:** Using vitest's `waitFor` caused React "act()" warnings because it doesn't wrap state updates. React Testing Library's `waitFor` automatically handles act() wrapping, eliminating the warnings.
