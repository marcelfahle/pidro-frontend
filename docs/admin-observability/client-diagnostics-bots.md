# Client diagnostics and bot catalogue — verification

WIP review checkpoint, 2026-10-22. Feature branch only; not deployed.

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

## Executed proof at this checkpoint

- `bun run shared:build && bun run test:unit`: 613 pass, 0 fail.
- Mobile `bunx tsc --noEmit`: pass. `bun run lint`: pass.
- Old-server `bun run test:e2e`: pass, 228 seconds, complete games, rematch and
  reconnect. Log `/tmp/client-game-journey.log` in implementation orb.
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

## Outstanding verification / limitations

- Full Account journey rerun still running. First run invalidated by Metro watching
  deleted Playwright artifact directories; current output is outside the repository.
  Three Classic reservation cases lacked CI's reservation seed; seed imported into
  disposable DB and those cases will be rerun. Do not claim full Account green yet.
- Production Axios failure/429/duplicate-submit browser checks still in progress;
  fixture failures are not server integration evidence.
- No simulator or native runner is available. All rendered/touch evidence is Expo
  web, not iOS/Android; native-safe path selection is covered by code/unit/browser
  inspection but actual native rendering/safe areas remain unverified.
- Backend CORS-error/request-ID fixes remain upstream; no backend files modified.

Artifacts live in implementation thread
https://ampcode.com/threads/T-01a163de-4196-7705-9d0f-97db86cfb5e1 under
`.amp/in/artifacts/`: `real-report-success.png`, report `{phone,landscape,tablet}`
success/failure PNGs, bot `{phone,landscape,tablet}` built-in/dynamic/image-failure
PNGs. Artifacts are not committed. Preview: report/table fixture routes on the
thread's report-ui portal; real integration app on client-integration-ui portal.
