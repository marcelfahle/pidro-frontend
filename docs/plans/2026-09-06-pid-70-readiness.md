# PID-70: authoritative pregame readiness

## Ownership and plan

The server room lifecycle owns readiness, not the game engine. Filling a fourth
seat must not create the game process/dealer-selection state. The clients only
send authenticated readiness intents and render server snapshots.

1. Gate the existing RoomManager start path on confirmations from every current
   human, live game-channel registration, four occupied seats, and no held seat.
2. Make last-channel removal and readiness invalidation atomic, including monitor
   cleanup. Record bot occupants through the trusted server bot-seating path.
3. Hydrate full readiness snapshots on channel join, updates, and acknowledgments.
   Render a central primary action on native mobile and web only after joining
   and hydrating a full table. Do not enqueue ready pushes during reconnect.
4. Exercise duplicate/stale intents, roster changes, reconnects, spectators,
   staggered confirmations, bot practice, and existing gameplay regressions.
5. Open paired server/client PRs, inspect CI and reviews, and address regressions.
   No engine edits, deployments, or merges are part of this change.

## Policy and wire contract

- Readiness approves the current seating arrangement. An actual roster/seat
  change or the last human game-channel connection closing clears all human
  confirmations. Another open channel for that human preserves readiness.
- Reclaiming a disconnected seat does not confirm readiness. Humans tap again.
- Bots are automatically ready; clients cannot declare themselves bots.
- The server returns `readiness` on game-channel join and ready acknowledgments.
  `readiness_updated` carries the complete snapshot directly.
- Snapshots contain `room_id`, `ready_epoch`, `snapshot_revision`, `status`,
  `positions`, position-keyed `seats`, and `ready_players` (absolute positions,
  including bots). Seat names are display metadata, not identity.
- A ready intent carries `{room_id, ready_epoch}` captured from the rendered
  snapshot. The authenticated actor and channel determine identity, never a
  client-supplied position. A stale response hydrates the current snapshot and
  requires another explicit click; there is no silent retry.
- The epoch advances on invalidation, not each confirmation, so simultaneous
  humans can confirm the same roster. Snapshot revisions order all updates.
  Clients replace snapshots, ignore old revisions, and prevent unversioned
  HTTP/lobby data from restoring an old pregame roster.

Oracle consultation identified the delayed-intent-after-roster-reset race and
the previous unregister/disconnect interleaving. Epoch fencing and atomic
last-channel cleanup address those distinct problems without engine changes.

## Verification and rollout

- Shared store tests cover hydration, revision ordering, replacement/reset,
  reconnect pending state, bot flags, and preservation of in-game seat metadata.
- Channel tests cover snapshot hydration, stale errors without retry, and
  refusing transport-buffered ready pushes. WaitingRoom tests cover pending,
  confirmed, incomplete, and reconnect-disabled actions.
- The mobile `/table-dev?phase=ready` and `ready-host` fixtures are exercised by
  UI grammar checks in portrait, landscape, and compact landscape. Checks cover
  touch targets, panel/seat separation, and the disabled confirmed action.
- Physical iOS/Android slower-device and battery-related behavior still needs
  device QA; browser rendering and deterministic server tests do not establish
  that physical-device result.
- Coordinate the client release with the server PR. Older clients have no usable
  explicit-ready UI and cannot participate in new readiness-gated games. Shipping
  the client first preserves the old server's existing auto-start behavior until
  the server rollout; there is deliberately no legacy readiness bypass.

Manual QA: join four clients (delay the last client's load), verify no dealer
selection before any tap, confirm three in a staggered order, then confirm the
fourth. Repeat after disconnect/reconnect and replacing a ready occupant; old
confirmations must be cleared. Check one-human/three-bot practice separately.
