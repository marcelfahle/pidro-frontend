# Pidro Mobile Testing

## Test accounts

These are throwaway local-development accounts already used by the mobile test scripts:

| Username    | Password     | Typical use                   |
| ----------- | ------------ | ----------------------------- |
| `mf2`       | `hallohallo` | Browser smoke test            |
| `skiatest1` | `hallohallo` | Default full-game autoplay    |
| `skiatest2` | `hallohallo` | Second multiplayer client     |
| `skiatest3` | `hallohallo` | Additional multiplayer client |

The accounts must exist on the backend selected by the test command. As of July 19, 2026, these username/password combinations are not valid in production; use an existing production account or intentionally register a dedicated production test account there.

## Daily development against production

Run the mobile UI locally while using the production API and game population:

```bash
# From the repository root
just mobile-prod

# Equivalent command from packages/mobile
bun run start:prod
```

This needs only one terminal; a local Phoenix server is not required. Manual actions still write to production, so use a dedicated production account. Do not point `test:smoke` or `autoplay-full-game.mjs` at production unless you intentionally want them to create rooms, leave rooms, and play games there.

To switch back to a local backend, run `just env-lan` from the repository root, start Phoenix with `just backend` in one terminal, and restart Metro with `just mobile` in another.

## Useful commands

From `packages/mobile`:

```bash
# Visual fixture, no login or backend required
bun run web
# Then open /table-dev?phase=bidding

# Browser/API smoke test. Defaults to mf2 against localhost:4000.
bun run test:smoke

# Full bot game. Defaults to skiatest1 against localhost:4001.
bun scripts/autoplay-full-game.mjs

# Choose another test account or backend.
API_BASE_URL=http://127.0.0.1:4000 \
WS_BASE_URL=ws://127.0.0.1:4000/socket \
bun scripts/autoplay-full-game.mjs --user skiatest2
```

## Full-game e2e (the CI gate)

`scripts/ci-game-e2e.mjs` plays two complete games against a real backend and
fails if either one doesn't reach game over:

1. **Solo protocol game** — registers a throwaway account, creates a 3-bot
   room, and plays first-legal-action to `game_over` (including the
   `progression_summary` check).
2. **Multiplayer UI game** — a second account creates a room with one open
   seat, logs in through the real UI in headless Chromium, and sits at the
   table while the autoplayer takes the open seat. The server's turn timers
   auto-play the UI seat, so a full game runs in the actual client — recorded
   as `game.webm` with milestone screenshots.

CI runs this in the `Game e2e` job (`.github/workflows/frontend-ci.yml`): it
checks out `marcelfahle/pidro-backend`, boots Phoenix against a Postgres
service with fast pacing (`LIFECYCLE_BOT_DELAY_MS=60`,
`LIFECYCLE_TURN_TIMER_BID_MS=1200`, …), starts Expo web, and uploads the video
and screenshots as the `game-e2e-artifacts` artifact.

To run it locally without touching your daily backend on :4000, boot a second
instance with CI pacing and point everything at it:

```bash
# Terminal 1, from pidro_backend
PORT=4100 \
LIFECYCLE_TURN_TIMER_BID_MS=1200 LIFECYCLE_TURN_TIMER_PLAY_MS=900 \
LIFECYCLE_BOT_DELAY_MS=60 LIFECYCLE_BOT_DELAY_VARIANCE_MS=40 \
LIFECYCLE_BOT_MIN_DELAY_MS=20 LIFECYCLE_TRICK_TRANSITION_DELAY_MS=80 \
LIFECYCLE_HAND_TRANSITION_DELAY_MS=120 mix phx.server

# Terminal 2, from packages/mobile
EXPO_NO_DOTENV=1 EXPO_PUBLIC_API_URL=http://127.0.0.1:4100 \
EXPO_PUBLIC_WS_URL=ws://127.0.0.1:4100/socket bun run web

# Terminal 3, from packages/mobile
API_BASE_URL=http://127.0.0.1:4100 WS_BASE_URL=ws://127.0.0.1:4100/socket \
node scripts/ci-game-e2e.mjs
```

Artifacts land in `screenshots/agent-game-e2e/` (override with
`E2E_ARTIFACT_DIR`). Expect roughly 35s for the solo game and 2–3 minutes for
the multiplayer UI game at CI pacing.

## Deferred invite first-install proof

Test generated native projects in a disposable worktree; `ios/` and `android/`
are intentionally not committed. Use the development app variant so the test
cannot replace a store build:

```bash
bun install --frozen-lockfile
cd packages/mobile
APP_VARIANT=development bunx expo prebuild --clean --platform android
(cd android && ./gradlew :app:assembleDebug)
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

APP_VARIANT=development bunx expo prebuild --clean --platform ios
xcodebuild -workspace ios/Pidro3Dev.xcworkspace -scheme Pidro3Dev \
  -configuration Debug -sdk iphonesimulator build
```

A fresh Android sideload should have no Play referrer. It must still reach the
normal login screen without a native-module error, and subsequent launches
must not repeat the resolver. The debug app's AsyncStorage database should
contain both `deferred-install-attempted:v1` and one stable `install-id:v1` UUID.
Also exercise **Have a code?** with the keyboard open in portrait and landscape.

The deterministic Android path requires an authenticated Google Play internal
test track. Open an invite's generated Play URL, verify its `referrer` contains
exactly `invite=<code>`, install that track build, and confirm first launch opens
the existing invite preview. A sideload cannot prove Install Referrer delivery.

For iOS, uninstall the development build from a simulator or device, tap the
matching App Store button from a fresh invite, reinstall, and open the app
within 30 minutes on the same network. Confirm either the existing invite
preview or the safe normal-login fallback, then confirm no second resolution
attempt occurs. A physical App Store/TestFlight reinstall is the meaningful
coarse-match proof; a simulator can verify native linkage and the no-match path
but cannot reproduce App Store installation matching.

Record the device/runtime, store track or sideload method, whether a referrer
was available, and which path won. Never enable production matching until the
privacy addendum is live and Phoenix is running as the documented single app
replica.
