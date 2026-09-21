# Pidro fixture routes — cheatsheet

Dev-only routes (`__DEV__` guarded; they redirect to `/home` in release). No login,
no backend, no playing a game to reach a state. Print and tape.

## Open one

```bash
# Simulator (Metro already running via `just ios` / `just mobile`)
xcrun simctl openurl booted "exp://127.0.0.1:8081/--/table-dev?phase=bidding"
just table-sim "iPhone 17 Pro" bidding     # boots one sim, shuts the others down

# Expo web
bun run web        # then http://localhost:8081/table-dev?phase=bidding
```

Deep-link form is `exp://127.0.0.1:$METRO_PORT/--/<route>?<params>`. Note the `/--/`.

---

## `/table-dev` — the table

### `phase=` (default `playing`)

| Value              | Shows                             | testID                  |
| ------------------ | --------------------------------- | ----------------------- |
| `waiting`          | WaitingTable, 3 seated + 1 free   | `waiting-table`         |
| `waiting-host`     | …with host controls (Manage/Lock) | `waiting-table`         |
| `ready`            | Full table, ready-up flow         | `waiting-table`         |
| `ready-host`       | Full table + host controls        | `waiting-table`         |
| `ready-solo`       | You + three ready bots            | `waiting-table`         |
| `dealer_selection` | Skia table, dealer cut cards      | `seat-north`            |
| `playing`          | Skia table + trick overlay        | `seat-north`            |
| `bidding`          | Bidding window                    | `bidding-window`        |
| `declaring`        | Trump declaration                 | `trump-window`          |
| `second_deal`      | Hand-selection window             | `hand-selection-window` |
| `game_over`        | Game-over summary                 | `game-over-window`      |

### Params

| Param        | Values                                                                                    | Effect                                                                                    |
| ------------ | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `phase`      | see above                                                                                 | which overlay                                                                             |
| `safeArea`   | `island` (59/34) · `android`/`android-buttons` (24/48) · `android-gesture` (24/24)        | **fakes insets** — the one way to test notch clearance on web                             |
| `role`       | `player` · `spectator`                                                                    | non-waiting phases: renders via the **real store/controller**, not the mock model         |
| `lifecycle`  | `normal` · `reconnecting` · `bot_substitute` · `permanent_bot` · `vacant`                 | seat lifecycle badge state                                                                |
| `feedback`   | `owner` (3 queued seat decisions) · `notice` · `timed` (dedupe + success at 0.8/1.0/1.2s) | TableFeedback / TableSeatDecision                                                         |
| `notice`     | `true`                                                                                    | same as `feedback=notice`                                                                 |
| `invite`     | `true`                                                                                    | opens InviteModal (needs `phase=waiting-host`/`ready-host`)                               |
| `names`      | `long`                                                                                    | west seat → "Alexandria the Long-Named Player" (wrapping)                                 |
| `playerName` | any string                                                                                | name in the first seat decision                                                           |
| `viewer`     | `east`                                                                                    | you are east instead of south                                                             |
| `rematch`    | `waiting`, `asked` (with `phase=game_over`)                                               | the rematch vote in the game-over window: you asked first / the others are waiting on you |
| `pass`       | `disabled`                                                                                | removes the pass action from legal actions                                                |
| `autoplay`   | `true`                                                                                    | Skia table auto-plays (trick completion / card persistence)                               |

### Recipes

Game-over checks: `phase=game_over` supports `result=loss|east|spectator|tie`,
`xp=earned|level`, `rematch=waiting|asked|missing|pending`, and `playerName=` for
the partner's long name. The default is a win with no XP. Rematch records a local
fixture vote; Home navigates home. Run `node scripts/verify-game-over.mjs` for
phone/tablet, simulated insets, outcome, voting, and reduced-motion checks.
These browser checks do not certify native safe-area measurement.

Top-bar checks: `scores=history` seeds two observed score changes (including a negative total)
in the mock table. `safeArea=island-left` / `island-right` simulate landscape side cutouts.
Run `MOBILE_BASE_URL=http://localhost:8081 node scripts/verify-table-chrome.mjs` for
five-size score/history/settings checks. Sound and haptics are marked Coming soon until
their feedback implementations exist.

For waiting-screen failure feedback, append `readyResult=error` to a ready fixture.
The normal ready fixtures delay confirmation briefly to expose the pending state.

```
/table-dev?phase=bidding
/table-dev?phase=playing&safeArea=island          # notch clearance
/table-dev?phase=waiting-host&invite=true         # invite modal
/table-dev?lifecycle=permanent_bot&feedback=owner&notice=true    # decision + notice together
/table-dev?phase=waiting&names=long               # long-name wrapping
/table-dev?phase=bidding&role=player&pass=disabled   # real store, no pass
/table-dev?phase=bidding&role=player&deal=true&dealer=north # clockwise packets, unsorted hand → sort → bid
/table-dev?phase=bidding&role=player&deal=cold      # reconnect: already-dealt hand, no replay
/table-dev?phase=ready-host&role=spectator        # spectator sees no controls
/table-dev?phase=playing&autoplay=true            # played-card persistence
```

---

## `/ui-dev` — DS v2 gallery

| URL                         | Shows                                                                                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/ui-dev?state=components`  | Type scale, BevelButton (wood/glass × sm/md/lg/hero/icon, loading, disabled), Input wells, AuthProviderButtons, bevel swatches, legacy Button, DecisionWindow. testID `ui-foundation-panel` |
| `/ui-dev?state=create`      | CreateRoomModal over the gallery. testID `create-room-window`                                                                                                                               |
| `/ui-dev?state=progression` | Progression HUD primitives: LevelRing (sizes, no photo), RatingPlaque, LeagueProgress, CtaBadge. testID `ui-progression-panel`                                                              |

This route is the pixel-diff baseline source. Change a token or primitive → it drifts →
refresh with `bun run ui:baselines <runId>`.

`/ui-dev?state=lobby-seats` shows equal-height lobby rows with no requirement, `100`,
and `1000` badges plus long names. These are presentation samples, not live seat
restrictions: the server does not yet supply or enforce minimum games.
`node scripts/verify-lobby.mjs` checks the real lobby with mocked API responses at
four phone sizes, including direct seat joins, search, create, empty/error states,
and the badge gallery. Captures go to `/tmp/pidro-lobby` (or `UI_SHOT_DIR`).

`node scripts/verify-create-room.mjs` checks creation at the same four phone sizes:
partner-to-south mapping, public/bot defaults, shared difficulty, invitation notice,
discarded password/minimum-games previews, reset on dismissal, keyboard Done,
touch targets and horizontal containment. API responses are mocked; captures go
to `/tmp/pidro-create` (or `UI_SHOT_DIR`). These browser checks do not verify native
keyboard avoidance or safe-area behavior. `/ui-dev?state=create` is interactive,
but its Create and Back callbacks intentionally do nothing.

`/ui-dev?state=create-safe-area&safeArea=island` tests the real creation form with
synthetic **browser-only** insets. Presets: `island`, `island-left`, `island-right`,
`legacy`, `android-buttons`, `android-right`, `android-gesture`. The creation script
checks all of these plus a reduced-height input-entry case. These numbers are test
inputs, not a device database or production padding. Native opens the real modal
without overrides. The unit test `create-modal-safe-area.test.mjs` separately guards
provider placement inside that native modal; neither test replaces device testing.

## `/auth-flow-dev` — guest-first auth

No params. In-page toggles: platform (**iOS** Apple-first / **Android** Google-first),
gates that open `AuthSheet` (`multiplayer`, `friends`, invite link), and the post-game
`KeepProgressPrompt`. Deliberately outside the auth guard. testID `auth-flow-dev`.

## `/join/<code>?fixture=open`

Renders the invite preview with no backend.
Canonical: `/join/7KQ4M2XB?source=copy&fixture=open` — testID `join-invite-window`.

---

## Scripted checks (Playwright against Expo web)

Needs Expo web running (`bun run web`) and, once per machine,
`bunx playwright install chromium`.

```bash
bun run test:ui            # verify-ui-grammar: 3 viewports, touch targets, containment
UI_CASES=table-bidding,home bun run test:ui      # just these
UI_SHOT_DIR=/tmp/shots bun run test:ui           # where screenshots land
MOBILE_BASE_URL=http://localhost:8081 node scripts/verify-seat-decisions.mjs
node scripts/verify-waiting-seats.mjs   # 6 viewports incl. safeArea variants
node scripts/verify-profile.mjs
node scripts/verify-dealing.mjs  # four dealers, 3/6/9 receive order, sort/bidding timing, reconnect, reduced motion
```

`bun run test:ui:diff` (pixel diff) is **CI-only** — baselines are Linux Chromium
renders, so Mac captures flag font/antialiasing noise. Adopt intentional drift with
`bun run ui:baselines <runId>`.

`UI_CASES` names: `home` `lobby` `login` `register` `join-code` `join-invite`
`ui-components` `create-table` `table-waiting` `table-ready` `table-ready-host`
`table-host-controls` `table-invite` `table-playing` `table-dealer-selection`
`table-completed-trick` `table-bidding` `table-trump` `table-hand-selection`
`table-game-over`

Grammar viewports: portrait 390×844 · landscape 844×390 · compact-landscape 667×375.

---

## Simulator

```bash
just table-sim "iPhone 17 Pro" bidding   # one sim, deep-linked
just table-matrix bidding                # iPhone 16e, 17 Pro Max, iPad mini, iPad Pro 13 (heavy)
just table-shots [outdir]                # screenshot every booted sim → screenshots/matrix/
xcrun simctl io booted screenshot out.png
bash scripts/table-matrix.sh rotate left bidding   # rotate + remount so layout follows
```

Rotation needs the remount — Expo Go keeps `useWindowDimensions` stale otherwise.
`simctl io screenshot` always captures device-native orientation, so a landscape
capture comes out portrait-shaped; rotate the PNG.

> **Web has zero safe-area insets.** `safeArea=` fakes them so a browser can approximate
> a device. On a simulator `/table-dev` uses the REAL insets — never pass `safeArea=`
> there, it would hide the clearance you are checking. Overlay clearance, gestures and
> rotation are only proven on a device.
