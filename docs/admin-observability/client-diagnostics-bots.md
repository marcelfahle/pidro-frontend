# Client diagnostics and bot catalogue — verification

Review-ready evidence, 2026-10-22. Feature branch only; not deployed.

## Contract and behavior

- Uses diagnostics contract `1cc4154d4ce5358971508ef248da7c7cc9d1e6ef` and bot
  contract `ecca6725ec361d5a4b12e752a0e1efe6a83480a9` from pidrogame/pidro-backend.
- In-memory 100-event/24-hour allowlist; owner, room and game-instance generations
  discard stale callbacks. Report capture is frozen on opening, including retries.
  No card values, coordinates, raw state, credentials or free text are retained.
- Actual input/guard instrumentation preserves legal hit targets, action timeouts
  and gameplay behavior. UUIDs correlate attempts; timed-out moves never retry.
- Existing authenticated Axios client submits exact report fields and accepts only
  201 with a UUID. Explicit user send, loading lock, selectable ID, truthful errors.
- Opaque bot IDs; optional snapshot metadata then cached catalogue then local
  built-in/neutral fallback. Built-in SVG URLs use native drawings even for new
  personas; uploaded JPEG uses Image with neutral onError fallback.
- No migrations or native dependencies. Existing server fields remain optional.
- Optional `state_received` is intentionally **not sent**. The old server supplies
  revisions but crashes the channel on this unknown event (reproduced). Integration
  server handles it but advertises no capability; cursors alone are not negotiation.

## Executed proof

- `bun run shared:build && bun run test:unit`: 615 pass, 0 fail (8.92s final run).
- Mobile `bunx tsc --noEmit`: pass. `bun run lint`: pass.
- Old-server `API_BASE_URL=http://127.0.0.1:4000
  WS_BASE_URL=ws://127.0.0.1:4000/socket MOBILE_BASE_URL=http://localhost:8082
  bun run test:e2e`: pass, 146 seconds final run, complete games, rematch,
  eleven guest reconnects and third-game start. Log `/tmp/client-game-final.log`.
- UI grammar: four built-in bot sheet checks pass at small portrait/tablet.
- Expo-web report success/failure inspected at 375x667, 667x375 and 820x1180;
  built-in, fourth persona and broken-image variants inspected at all three sizes.
- Real production Expo-web settings/report flow against unmodified backend
  integration commit `f92c01e763b1d75e506801029d4bfc8ff2079c56`, separate checkout
  `/tmp/pidro-client-integration`, disposable DB `pidro_client_integration`:
  report **39eba0ca-0db6-43a3-9f8c-90687989aa11**, room J1J8,
  instance `eEA235_j5fE0hTga`, HTTP 201. Twelve events, 1474 bytes. Actual card tap
  produced separate `tap/pending` and `blocked/invalid_phase`; SQL lookup confirms
  the exact ID/room/instance and twelve persisted events. No browser page errors.
- Real fourth bot Sisu returned by catalogue, allocated to seat and shown with its
  uploaded JPEG. JPEG GET returned 200, image/jpeg, 6199 bytes. Saga fixture uses
  Antti's local SVG drawing with no remote img element. Failed-image fixture
  renders neutral after Image.onError.
- Independent shared/socket/UI review completed. Both P2s fixed: non-card input
  scopes and reactive catalogue names. Hydrate-before-catalogue browser regression
  passes. Review did not certify native execution.
- Coordinator review P2 fixed in a separate increment: 429 cooldown is scoped to
  the captured owner; an old owner's delayed response cannot install a cooldown
  for the current owner. Two real-Axios regression cases failed before the fix and
  pass after it: A429 then switch B, and switch B before A429 arrives. Same-owner
  cooldown still blocks. Logs `/tmp/client-cooldown-before.log` and
  `/tmp/client-increment-unit.log`. Coordinator-owned `fixtures.ts` was not edited.
- Production `sendGameReport`/Axios/UI browser transport checks pass: 404, 403, 503,
  malformed 201 UUID, timeout, 429 (disabled then enabled after Retry-After), exact
  frozen body on manual retry, bearer authentication, double click sends once,
  close blocked during send, valid 201 displays ID. These failure responses were
  intercepted at the network boundary, not injected through report-dev's `send`;
  they are client transport checks, **not proof of backend error handling**.
  Successful report persistence above is real and independent. Log
  `/tmp/client-report-errors.log`. Without browser CORS exposure of Retry-After,
  the client correctly uses the conservative 60-second fallback.
- Account journey command: `CI=1 API_BASE_URL=http://127.0.0.1:4000
  MOBILE_BASE_URL=http://localhost:8082 bun run e2e:accounts
  --output /tmp/client-account-results`: 125 passed, 2 flaky, 7 failed in 13.7m.
  Four failures involved Metro temporarily refusing connections; three involved
  absent Classic reservation seed. Imported the existing CI reservation fixture
  into the disposable DB; removed only the synthetic ReservedRita user mistakenly
  created before that seed (its upgrade returned USERNAME_TAKEN instead of the
  reserved-name code). Focused single-worker rerun: 13 passed, 2 fixture failures;
  final reservation rerun: **3 passed**. Every previously failing case now passes;
  there was **not** a completely green single full-suite run. Logs:
  `/tmp/client-account-rerun.log`, `/tmp/client-account-recheck.log`,
  `/tmp/client-reserved-recheck.log`. No checks or assertions were weakened.

## Limitations

- No simulator or native runner is available. All rendered/touch evidence is Expo
  web, not iOS/Android; native-safe path selection is covered by code/unit/browser
  inspection but actual native rendering/safe areas remain unverified.
- Backend CORS-error/request-ID fixes remain upstream; no backend files modified.

Artifacts live in implementation thread
https://ampcode.com/threads/T-01a163de-4196-7705-9d0f-97db86cfb5e1 under
`.amp/in/artifacts/`: `real-report-success.png`, report `{phone,landscape,tablet}`
success/failure PNGs, bot `{phone,landscape,tablet}` built-in/dynamic/image-failure
PNGs, and inspected `report-flow.mp4`/`report-flow.loop.webp`. Artifacts are not
committed. Preview: report/table fixture routes on the thread's report-ui portal
https://t-03h3hmd7zirv9srnd0k6ad3oh-p23466.onamp.dev/ ; integration app on
https://t-03h3hmd7zirv9srnd0k6ad3oh-p25128.onamp.dev/ .
