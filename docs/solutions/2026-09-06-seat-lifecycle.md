# PID-72 / PID-74: authoritative seat feedback

## Findings and implementation

- Mobile dropped `seatStatus` at the canvas adapter and used native alerts for routine events and owner decisions.
- Web kept ownership in a REST-derived ref, dismissed decisions by position indefinitely, and removed failed Open Seat actions before they succeeded.
- Game-channel joins omitted lifecycle state. Existing events lacked a decision generation; explicit leave clears `disconnected_at`, so timestamps cannot reliably identify decisions.
- After tracing both repositories and consulting the oracle, the implementation uses one versioned four-seat snapshot rather than reconstructing authoritative state from presence, REST, and unversioned events.

The backend sends `seat_lifecycle` on join/rejoin and lifecycle changes. Snapshots carry room instance, revision, current actionable owner, seat status/identity, and stable decision IDs. A temporary bot retains the reserved human's identity; a permanent bot has no human occupant. The decision separately identifies the departed human. Grace periods, explicit-leave policy, and gameplay rules are unchanged.

Both clients hydrate shared state atomically and ignore stale revisions and legacy lifecycle updates once a snapshot has arrived. Initial hydration is silent. Live takeover/reclaim notifications are deduplicated, including action replies that arrive before their broadcasts. Mobile renders lifecycle labels and bot/open-seat avatars; feedback reserves space rather than covering the north seat.

The shared owner queue retains the displayed decision while others arrive, hides actions during the owner's turn or connection loss, and invalidates them when the seat/owner/room changes. Keep Bot is a local dismissal for that room instance, viewer, and decision generation; it survives channel reconnects, not a fresh application session. Open Seat includes the decision ID, dismisses only on success, and reconciles uncertain outcomes. Failures stay inline and retryable. Neither UI creates modal backdrops.

## Rollout

Deploy the backend contract before publishing the clients. Legacy seat events remain for older clients, but the new owner queue requires `seat_lifecycle`; it deliberately does not infer ownership or decision generations on an older backend. Changes are prepared in both `pidro-frontend` and `pidro-backend`; neither has been deployed by this work.

## Verification and remaining device QA

- Frontend: `bun run test:unit`; `bun run test` in `packages/web`; mobile TypeScript and targeted ESLint; web production build and targeted Biome checks.
- Backend: game-channel, disconnect-cascade, ownership-promotion, substitute-seat, and seat suites. Includes simultaneous observers, cold join during temporary takeover, reclaim identity, explicit leave, promotion, stale Open Seat rejection, and revision recovery.
- Rendered the real mobile table/feedback components at phone portrait and iPad portrait/landscape sizes, including reconnecting, temporary/permanent bots, open seats, queued decisions, and inline failure. Rendered the real web table with the shared queue against a three-departure fixture. These are browser-rendered fixtures, not a claim of native device or deployed multiplayer QA.
- Mobile visual reproduction: `/table-dev?lifecycle=bot_substitute&feedback=notice`, `/table-dev?lifecycle=permanent_bot&feedback=owner`, `/table-dev?lifecycle=reconnecting`, `/table-dev?lifecycle=vacant`. Dev-only route; Open Seat in this fixture deliberately shows an error.

Before release, repeat on native iOS phone, iPad, Android, and web connected to the same updated backend: disconnect three humans near-simultaneously, leave the first decision unresolved, promote the remaining owner, reconnect during grace, then open/fill a substitute seat. Confirm identical seat states, one owner prompt, a usable game while prompts wait, and restoration after background/foreground and channel rejoin. Record app/backend versions and event timestamps; the original screenshots did not establish them.
