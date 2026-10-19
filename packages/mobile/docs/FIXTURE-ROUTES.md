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

### Bounded locale fixtures

Only `/ui-dev`, `/table-dev`, and `/auth-flow-dev` accept these development-only
overrides. Production builds redirect these routes; normal routes ignore locale
query parameters, including Settings.

| Parameter                 | Meaning                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `locale=en\|sv`           | Initial displayed copy, independent of the selected radio                                                          |
| `language=system\|en\|sv` | Initial selected language preference (ephemeral)                                                                   |
| `deviceLocale=sv-FI`      | Device-language input for System (also accepts `sv-SE`, `en-US`, etc.; unsupported languages fall back to English) |

For consistent System metadata, pair `locale=sv&language=system&deviceLocale=sv-FI`.
Explicit `locale` wins initially, allowing every selected option to be inspected
in either language. Selecting a radio immediately resumes normal resolution from
the ephemeral choice and simulated device locale. Neither mount nor selection
writes the real language preference. Foreground/settings notifications preserve
the focused fixture override; blur/unmount restores the persisted real preference
and actual device locale. The boundary has no locale key and never remounts a game.
Without params, copy starts from the real preference; fixture language selection
is still ephemeral.

Examples: `/ui-dev?state=settings&locale=sv&language=en&deviceLocale=sv-FI`,
`/table-dev?phase=declaring&locale=sv`, `/auth-flow-dev?locale=sv`.

The second deal loops at `/table-dev?deal=draw`, fed the snapshots the server
sends (trump named, then the hand ready to play, play held while the table
shows the second deal). It plays at Classic's pace: each player in turn from
the dealer's left throws their non-trumps face down in front of them, the
piles hold to be counted and clear, the dealer gives each player their cards
one at a time and takes the rest unseen. The dealer never shows a discard.
`you=deal` has you deal; `hand=still|tilt|fan` tries how hands hold their
cards. **Tune** opens live timings (each change replays); the link takes the
same keys, e.g. `&holdMs=3000&cardMs=230&throwGapMs=550`. The server's
`second_deal_transition_delay_ms` must hold play for the whole of it.

The end of a hand loops at `/table-dev?deal=hand`: the last trick, the
hand's result, and the next hand dealt once it closes (the server sends the
next hand with the one that ended; the table holds the ended hand meanwhile).
`end=they-made|we-made|we-missed|they-missed`; **Tune** changes how long the
result stays (`showMs=` in the link). The server's `hand_transition_delay_ms`
must cover the result and the deal.

PID-214 bid presentation uses `/table-dev?phase=bidding&role=player&bids=round|high&locale=sv`.
`table-bid-*` and `locale-sv-table-bid-*` check every seat's visible/spoken bid,
the high-bid tone and compact south status without changing bid event identities.

Friends locale previews use `/ui-dev?state=friends&fixture=added-you&locale=sv`
or `/ui-dev?state=friends-add&fixture=results&locale=sv`. They reuse the actual
screens and existing fixture data; `/friends` and `/friends-add` ignore locale
query parameters. `locale-sv-friends-*` checks list/empty/loading/error, add-back,
recent/search results, profile/removal and the guest-save gate alongside the
existing English Friends cases.

Friend seats use `/ui-dev?state=create&fixture=sheet-empty|sheet-friends|sheet-picked|sheet-assigned`
and `fixture=invited` for the committed draft row. `/lobby?fixture=held` and
`/table-dev?phase=waiting-host&fixture=held` show server-held seats. Invitation rows
stack at `/home?fixture=invitations` (including the Friends count badge) and
`/lobby?fixture=invitations`. The old `table-invite` fixture now shows only the
seat-bound share link, without a name or seat-preference form.

Grammar cases `locale-{en,sv}-settings-{system,en,sv}` and
`locale-{en,sv}-{waiting,bidding,trump,hand-selection,game-over,dealer,playing}`
run at 390×844, 844×390, 667×375, plus localization-only additions to the
360×640 and 768×1024 shards. They reuse containment and 44px target checks
(including radios), assert selection/System metadata and non-persisted interactive
switching, and reject clipped natural text without shrinking fonts. Long public
player names retain intentional ellipsis. Captures precede interactive switching.
No baseline refresh is implicit.

The bounded `iphone-insets-portrait` (402×874) and `iphone-insets-landscape`
(874×402) grammar cases cover the trump picker and Settings language group.
`safeArea=iphone-17-portrait` simulates 62/34 top/bottom, and
`safeArea=iphone-17-landscape` simulates 62pt on both sides and 21pt bottom.
Settings accepts these via `/ui-dev?state=settings`; table fixtures use `/table-dev`.
These are browser approximations only. Native review must omit `safeArea`.

```bash
NODE_OPTIONS=--max-old-space-size=4096 MOBILE_BASE_URL=http://localhost:8089 \
UI_CASES=locale-en-settings-system,locale-sv-settings-system,locale-sv-bidding \
UI_SHOT_DIR=/tmp/pidro-locales node scripts/verify-ui-grammar.mjs
```

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
| `declaring`        | You dealt: trump picker in felt   | `trump-picker`          |
| `second_deal`      | Dealer's private hand selection   | `hand-selection-window` |
| `game_over`        | Game over: win reveal or loss     | `game-over-window`      |

### Params

| Param        | Values                                                                                    | Effect                                                                                                                                                                    |
| ------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `phase`      | see above                                                                                 | which overlay                                                                                                                                                             |
| `safeArea`   | `island` (59/34) · `android`/`android-buttons` (24/48) · `android-gesture` (24/24)        | **fakes insets** — the one way to test notch clearance on web                                                                                                             |
| `role`       | `player` · `spectator`                                                                    | non-waiting phases: renders via the **real store/controller**, not the mock model                                                                                         |
| `lifecycle`  | `normal` · `reconnecting` · `bot_substitute` · `permanent_bot` · `vacant`                 | seat lifecycle badge state                                                                                                                                                |
| `feedback`   | `owner` (3 queued seat decisions) · `notice` (tap closes it) · `timed` (dedupe + success at 0.8/1.0/1.2s) | TableFeedback / TableSeatDecision; a notice stays at least `readingTimeMs` of its words |
| `notice`     | `true`                                                                                    | same as `feedback=notice`; on a waiting phase, a join notice below the toolbar                                                                                            |
| `connection` | `lost`                                                                                    | with `role=`: the channel is down, so the table shows its Reconnecting… banner                                                                                            |
| `invite`     | `true`                                                                                    | opens InviteModal (needs `phase=waiting-host`/`ready-host`)                                                                                                               |
| `names`      | `long` · `max`                                                                            | waiting: west seat → "Alexandria the Long-Named Player" (wrapping); table: Classic-length names on every seat (ThunderThor88 …); `max`: that 32-character name on every table seat |
| `dealer`     | `north` · `east` · `south` · `west`                                                       | table (mock model): who holds the dealer chip, default `south`                                                                                                            |
| `timer`      | `running`                                                                                 | table (mock model): a 20 s turn timer on the seat on turn; amber in its last quarter                                                                                      |
| `signals`    | `pidro`, `pidro-theirs`, `points`, `points-theirs`                                        | mock table, `autoplay=true`: `pidro` gold "Pidro!", "Us +6"; `pidro-theirs` coral "Them +5 · Wynn"; `points(-theirs)` a gold (coral) "+1" and the 2 of trump's            |
| `hand`       | `made` · `set` · `they-set`                                                               | table (mock model): 1.6 s after the table opens the last hand is scored: the table dims under its result and the point cards each team took (PID-236). `made`: you made 8, stamped gold; `set`: you missed 10 by 3; `they-set`: Eli missed 9 by 3 and Nora took their Pidro. It closes by itself after 3 s (2 s for `set`) |
| `ticker`     | `full`                                                                                    | table (mock model): the table opens with West's pass, and the other three bids land 0.3 s later, so the plaque's action ticker shows three lines; tap it for the hand log |
| `bids`       | `round` · `high` (with `phase=bidding&role=player`)                                       | you and three bots; the bids land one by one. `round`: West passes, North bids 7, East goes to 9, then it is your turn. `high`: you hold the high bid at 9 and West is still to bid |
| `out`        | `one` · `lone` (with `phase=playing&role=player`)                                         | you and three bots, two tricks into hand 4 after Jocke bid 6. `one`: Marcel is out of trumps (dimmed, "Out", two cards face up). `lone`: the other three are out, and your seat says the rest is yours |
| `trick`      | `bots` (with `phase=playing&role=player`)                                                 | you and three bots, hearts trump: Wynn, Nora and Eli have played 9♥, K♥ and 4♥ to the first trick, and each seat says what it played; it is your turn |
| `count`      | `on`                                                                                      | turns on "Help me keep count": the plaque’s bid line reads "Jocke bid 6 · 2 of 6" (small phones too; a name with no room beside the bid takes a row of its own), "Last trick" sits under it, and the card winning the trick glows (mock table too) |
| `playerName` | any string                                                                                | name in the first seat decision                                                                                                                                           |
| `viewer`     | `east`                                                                                    | you are east instead of south                                                                                                                                             |
| `rematch`    | `open` · `one` · `two` · `asked` · `waiting` · `missing` · `pending` (with `phase=game_over`) | the rematch row, per seat: nobody asked / Nora has / Nora and Eli have / the other three wait on you / you asked first; `missing` has no vote yet, `pending` is sending yours |
| `pass`       | `disabled`                                                                                | removes the pass action from legal actions                                                                                                                                |
| `autoplay`   | `true`                                                                                    | Skia table auto-plays (trick completion / card persistence)                                                                                                               |

### Recipes

Game-over checks: `phase=game_over` supports `result=loss|east|spectator|tie`,
`xp=earned|level`, `rematch=open|one|two|asked|waiting|missing|pending`, and
`playerName=` for the partner's long name. The default is a win (62–29) with no
XP. Every result but the tie carries a ten-hand `hand_history` and the final
`last_hand`: level at 41 after hand 8, and the losing side's best hand is hand 7
(won 12 of 14, both Pidros). `xp=` also sends the summary's `partner`, three
wins in a row on a win. Rematch records a local fixture vote; Home navigates
home. Run `node scripts/verify-game-over.mjs` for
phone/tablet, simulated insets, outcome, voting, and reduced-motion checks.
These browser checks do not certify native safe-area measurement.

The table's header is one row: the score plaque left, the menu right
(`TABLE_HEADER` in `TableChrome.tsx`). Portrait reserves it above the north seat;
landscape seats North inside it. Notices and the Reconnecting… banner share one
slot (`useTableReserves().noticeSlot`): the dock under the hand in portrait, the
felt below the header in landscape, below the toolbar in the waiting room. The
grammar fails when the header, a notice or a protected window covers the north
seat or its cards.

Top-bar checks: `scores=history` seeds two observed score changes (including a negative total)
in the mock table. `safeArea=island-left` / `island-right` simulate landscape side cutouts.
Run `MOBILE_BASE_URL=http://localhost:8081 node scripts/verify-table-chrome.mjs` for
five-size score/history/settings checks. Sound is marked Coming soon; the haptics switch
controls the native gameplay feedback.

For waiting-screen failure feedback, append `readyResult=error` to a ready fixture.
The normal ready fixtures delay confirmation briefly to expose the pending state.

```
/table-dev?phase=bidding
/table-dev?phase=playing&safeArea=island          # notch clearance
/table-dev?phase=waiting-host&invite=true         # invite modal
/table-dev?lifecycle=permanent_bot&feedback=owner&notice=true    # decision + notice together
/table-dev?phase=waiting&names=long               # long-name wrapping
/table-dev?phase=bidding&role=player&pass=disabled   # real store, no pass
/table-dev?phase=bidding&role=player&bids=round   # who bid what, against bots (PID-214)
/table-dev?phase=playing&role=player&trick=bots  # bots say what they played (PID-214)
/table-dev?phase=playing&role=player&out=one&count=on # out of trumps, the count meter, Last trick (PID-220)
/table-dev?phase=bidding&role=player&deal=true&dealer=north # clockwise packets, unsorted hand → sort → bid
/table-dev?phase=bidding&role=player&deal=cold      # reconnect: already-dealt hand, no replay
/table-dev?phase=second_deal&role=player&dealer=south # dealer sees the authoritative pool and keeps six
/table-dev?phase=second_deal&role=player&dealer=north # public symbolic pack; dealer count stays concealed
/table-dev?phase=auto_rob&role=player&dealer=south # automatic dealer-only combined pool
/table-dev?phase=auto_rob&role=player&dealer=south&clear=true # reveal, then rebuild the sorted six-card hand
/table-dev?phase=ready-host&role=spectator        # spectator sees no controls
/table-dev?phase=playing&autoplay=true            # played-card persistence
```

---

## `/ui-dev` — DS v2 gallery

| URL                                                                     | Shows                                                                                                                                                                                       |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/ui-dev?state=components`                                              | Type scale, BevelButton (wood/glass × sm/md/lg/hero/icon, loading, disabled), Input wells, AuthProviderButtons, bevel swatches, legacy Button, DecisionWindow, friend rows, info cards and notices (`ui-friend-rows-panel`, `ui-friend-notices-panel`). testID `ui-foundation-panel` |
| `/ui-dev?state=create`                                                  | CreateRoomModal over the gallery. testID `create-room-window`                                                                                                                               |
| `/ui-dev?state=create&fixture=default\|open\|requirement\|bots\|friend` | Inline creation: defaults, Open question, 100+ picked, all bots, Friend selected. testID `create-room-window`; editable rows `create-seat_3`, `create-seat_2`, `create-seat_4`.             |
| `/ui-dev?state=progression`                                             | Progression HUD primitives: PlayerAvatar (sizes, no photo), RatingPlaque, LeagueProgress, CtaBadge. testID `ui-progression-panel`                                                           |
| `/ui-dev?state=avatars`                                                 | PlayerAvatar: rings, pins, sizes 104–24, every seat state from the Seat-States board, label below/right/left. testID `ui-avatars-panel`                                                     |
| `/ui-dev?state=seat-rows&fixture=setup\|setup-open\|opened\|opened-more` | New table seat rows (PID-243): every state before and after the table opens, four seats at a time; landscape puts the teams side by side. testID `ui-seat-rows-panel` |

This route is the pixel-diff baseline source. Change a token or primitive → it drifts →
refresh with `bun run ui:baselines <runId>`.

`/ui-dev?state=seat-picker&fixture=choices|friends|many|empty` previews PID-244's
`ChoiceList`, `FriendPicker` and `SeatPickerContainer`. The container chooses a
portrait sheet, landscape full screen or centered tablet panel; `many` supplies
30 friends, and `locale=sv` previews owned Swedish copy. The `ui-seat-picker-*`
grammar cases cover 390×844, 375×667, 844×390, 768×1024 and 1024×768, including
keyboard selection, unavailable rows, search, one-tap invite/close and internal
list scrolling. Browser checks do not certify native keyboard or safe areas.

Callers pass choice sections (including optional short subtitles), a selected ID,
and friends whose section and availability have already been mapped from server
state. `groupPickerFriends` only groups and name-filters those entries. Neither
list fetches or reads server presence. The container calls the selection callback
then `onClose`; a deeper row opens the full-height friend page on portrait phones.
Use that row's subtitle for the chosen friend's name, and remount the container
for a new presentation. Existing creation and invitation screens are unchanged.

`/ui-dev?state=lobby-seats` shows lobby seat requirement samples using the same
seat payload as the live lobby.
`node scripts/verify-lobby.mjs` checks the real lobby with mocked API responses at
four phone sizes, including direct seat joins, search, create, error states, the
empty Tables screen (start a table, join with a code, the quick game Home also starts)
and the badge gallery. Captures go to `/tmp/pidro-lobby` (or `UI_SHOT_DIR`).

`node scripts/verify-create-room.mjs` checks creation at the same four phone sizes:
the default table name, the seat sheet (open, bot, invite a friend), partner-to-south
mapping, an invite seat sent as an open seat, reset on dismissal, keyboard Done,
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

## Shell friend notices

`/home?fixture=friend-request|friend-accepted|friend-seat|friend-queue` shows the
real shell notice and Friends badge without a backend. Accepted stays visible in
the fixture for capture; live notices disappear after four seconds. The queue
fixture starts with a seat, then a request, then accepted. Not now closes only the
prompt, keeping the badge. These fixtures also work on other shell tabs. Grammar
cases `friend-notice-*` check containment, touch targets, tab clearance and queue
order at 390×844, 375×667, 844×390 and 768×1024. Browser sizes do not certify
native safe-area measurement.

## Shell update notice — "A new version is ready"

`/home?fixture=update-notice` forces the shell's update notice on. It works on any
shell tab (`/settings?fixture=update-notice` too), because the notice lives in the
shell layout, not in a screen; the gallery cannot show it in place. Restart only shows its busy state here; nothing reloads. Dismiss hides it.
Add `safeArea=island` (or any `/table-dev` preset) to fake insets for the whole shell.
testID `update-notice`.

The notice floats over the screen just above the tab pill (above the bottom safe area
beside the landscape rail or for guests) and never covers a control. Scrolling screens
learn how far up it reaches through `usePillClearance` (or `useNoticeInset` when they
already clear the pill or safe area: guest Friends, Home's invitations) and scroll their
last row clear of it. Home's play tiles reach the bottom and Home does not scroll, so
Home places it itself with `UpdateNoticeSlot`: at the top of the logo stage, under the
header, where no control reaches. Nothing moves when it shows or goes.

The UI-grammar case `update-notice` opens `/home?fixture=update-notice&safeArea=island`
in every viewport (375×667 included) and checks that no control sits under the notice,
that it is clear of the tab pill, has 44pt Restart and Dismiss targets, that Restart goes
busy and cannot be tapped twice, and that dismissing it moves nothing on Home. It then
opens `/settings?fixture=update-notice&safeArea=island` and checks the notice floats
above the bottom inset, the last row scrolls clear of it and no control sits under it.
`update-notice-friends-guest` does the same for a guest on Friends, and
`update-notice-home-guest` for a guest on Home.

Every Home case (including 667×375 for `home`, `home-guest` and the notice cases)
hit-tests the header's controls and both play tiles: each must take its own taps. In
landscape a guest's column (tiles, Classic plaque, Sign in) is taller than the space
beside the logo once there are insets, so it scrolls there instead of covering the header.

In a release build the notice shows by itself once Expo has downloaded an update, and
never on the game screen. The real path (check on foreground, download, reload) needs a
release build on a device; Expo Go and web have OTA updates disabled.

## `/auth-flow-dev` — guest-first auth

Accepts the bounded locale parameters above. Includes gates that open `AuthSheet` (`multiplayer`, `friends`, invite link)
and the post-game `KeepProgressPrompt`. Deliberately outside the auth guard. testID
`auth-flow-dev`.

## `/claim-classic?fixture=<state>` — Classic claim

The real claim screen with deterministic presentation states and no backend mutation. States:
`method`, `preview`, `login`, `rename`, and `already-claimed` (signed out it offers sign-in and names how the owner signed in; signed in it only offers Back). Use an authenticated fixture for an existing
guest/account preview; without one, `preview` also shows the fresh-account fields. `login` is a
password claim whose server offered the Classic username and email (`new_account`): signed out
or as a guest they show read-only and only a new password is asked. For Swedish use
`/ui-dev?state=claim-classic&fixture=login&locale=sv`. testID `claim-classic-screen`.

## Account flow — sign in, create account, Classic recovery

Real screens with deterministic states; `?fixture=` is read in development only and
never calls the backend. All sit on the `AuthFlow` scaffold, so each one has a phone,
a phone-landscape and a tablet layout.

| URL                                       | Shows                                                     | testID                  |
| ----------------------------------------- | --------------------------------------------------------- | ----------------------- |
| `/login?fixture=providers`                | Sign in with Apple and Facebook forced on                 | `auth-window`           |
| `/login?email=a@b.co&known=1`             | Sign in after Create account hit an address in use        | `auth-window`           |
| `/register?fixture=providers`             | Pidro account: providers and the email step               | `auth-window`           |
| `/register?fixture=password`              | Create a password                                         | `auth-window`           |
| `/register?fixture=name`                  | Pick your name                                            | `auth-window`           |
| `/register?fixture=email-taken`           | Create account email step: address already has an account | `auth-window`           |
| `/register?fixture=name-taken`            | Pick your name: taken, with the Classic claim plaque      | `auth-window`           |
| `/classic-forgot`                         | Forgot Classic password                                   | `classic-forgot-window` |
| `/classic-forgot?fixture=sent`            | Sign-in link sent                                         | `classic-link-sent`     |
| `/classic-forgot?fixture=unavailable`     | Link service down; points to help                         | `classic-forgot-window` |
| `/classic-forgot?fixture=not-found`       | No Classic account matched                                | `classic-forgot-window` |
| `/classic-help`                           | Ask support to find a Classic account                     | `classic-help-window`   |
| `/classic-help?fixture=filled`            | …with the form filled in                                  | `classic-help-window`   |
| `/classic-help?fixture=sent` / `=mail`    | Sent, or handed to the mail app                           | `classic-help-sent`     |
| `/reset-password?token=x&fixture=refused` | Reset link the server refused, offering a new one         | `auth-window`           |
| `/forgot-password?fixture=sent`           | Password reset requested                                  | `auth-window`           |

Use a guest auth fixture to see the guest wording ("Your guest games come with you").
On a simulator these open through the dev deep-link allowlist in `app/+native-intent.tsx`
(`exp://127.0.0.1:8081/--/classic-forgot?fixture=sent`). A fixture is read when the
route mounts, so switching between two fixtures of the same route needs an app restart.

## `/age?fixture=<state>` — age gate

`unanswered` (no range chosen, Continue disabled), `selected` (18 or older chosen,
Continue enabled), `under13` (the stop screen). testID `age-screen`, or
`age-stop-screen` for `under13`.

## `/home?fixture=table-unknown`

Home after Quick game was refused as "already in a room" and the lobby that would
say which table could not be loaded: nothing was left, and the player can tap again.
testID `home-screen`.

## `/game/<code>?fixture=away`

The away screen that replaces the table after the server removed the player for
missed turns: a bot is taking the seat, I'm back joins again. testID `game-away-window`.

## `/join/<code>?fixture=open`

Renders the invite preview with no backend.
Canonical: `/join/7KQ4M2XB?source=copy&fixture=open` — testID `join-invite-window`.

## `/lobby?fixture=<state>` — player-first table rows

Development-only, backend-free fixtures; use an authenticated auth fixture.
`list` shows all categories: MY has Rejoin; OPEN1 has Claas and three open seats;
OPEN2 has Yaya, a bot and two open seats; SUB has Anna/Pekka/Liisa and one Sit in;
WATCH1 and the other playing rows have Watch. Table names, codes and levels are
not displayed. `rejoin`, `open`, `substitute`, and `watch` isolate each row kind.
`empty` shows the empty Tables screen. `search-empty` starts with an unmatched
player query and offers Clear search. Search is labelled **Find a player** and
matches human player names, not table names, codes or bots.

`badges` shows open tables with 100+ and 1000+ chairs for a 1500-game player.
`locked` shows the same tables for a 40-game player; tap a dimmed chair for the
five-second inline reason. `watch` includes “Hand 4 · 34 to 21” and older-payload
“Playing” rows; `substitute` shows “Jussi left in hand 3” using the current hand.

`password` adds Bertil's table, whose south chair is a password seat with the gold
lock (PID-259); tap it for the keypad. `password-keypad`, `password-typed` (48 typed),
`password-wrong` and `password-wait` open the keypad in that state. A fixture keypad
answers every password wrong, so typing four digits walks through the shake.
`&safeArea=island-left` or `island-right` fakes the landscape insets inside the panel.
Grammar cases: `lobby-password`, `lobby-password-keypad`, `lobby-password-typed`,
`lobby-password-wrong`, `lobby-password-wait` (phone, small phone, landscape,
667×375 and iPad portrait) and `lobby-password-island-left|right` (landscape).

Grammar cases: `lobby-list`, `lobby-empty`, `lobby-rejoin`, `lobby-open`,
`lobby-badges`, `lobby-locked`, `lobby-substitute`, `lobby-watch`, `lobby-search-empty`. They cover the phone
viewports plus lobby-specific 834×1194 and 1194×834 tablet sizes. The existing
`home-tablet-portrait` and `tablet-landscape` CI shards apply those sizes only to
lobby cases; other screens keep their existing dimensions.

## `/friends?fixture=<state>` and `/friends-add?fixture=<state>`

Use an authenticated fixture. Friends has `empty`, `list` (all three presences),
`added-you`, `loading`, `error`, and `classic` (seven Classic friends not here yet).
`all` shows all five sections, with Join, Play and no-action online rows, incoming
and sent requests, last played and Classic. Ignore/Undo, Accept and cancel work
locally in this fixture. `friends-all` checks it at 390×844, 375×667, 844×390 and
768×1024, including toast dismissal. Long lists scroll clear of the tab pill.
Tap a row in `list` for the real profile sheet
with a fixture identity; Remove friend opens its confirmation without a backend
write. Add a friend has `recent` and `results` (all four server relation labels).
The guest route opens the account sheet and continues on Friends after saving.

Grammar cases: `friends-empty`, `friends-list`, `friends-added-you`,
`friends-loading`, `friends-error`, `friends-profile`, `friends-remove`,
`friends-block`, `friends-recent`, `friends-results`, `friends-guest`, and
`friends-classic`. The Classic case checks the count below the list and the app-share
payload, including share failure and retry; it never opens a real share sheet.

## `/blocked-players?fixture=<state>`

Authenticated fixtures: `empty`, `filled`, `loading`, `error`. The filled list
has no presence labels; Unblock is inert in fixtures. Grammar cases are
`blocked-empty`, `blocked-filled`, `blocked-loading`, and `blocked-error`.
`friends-block` opens the confirmation from a friend profile. The
`block-profile-playing`, `block-profile-waiting`, and `block-profile-game_over`
cases open a human profile through `/table-dev?phase=<phase>&role=player`, mocking
only the profile response. `block-profile-guest` checks that guests see no Block
action in the post-game sheet.

## Rule-set fixtures

Development-only, no backend needed (except the real manual-code path, mocked by
the grammar script). Invite routes
show a guest name-entry preview without auth, or the same table's confirmation
with an authenticated fixture.

| URL                                                            | Shows                                                            |
| -------------------------------------------------------------- | ---------------------------------------------------------------- |
| `/ui-dev?state=create&fixture=finnish` / `fixture=louisiana`   | Selected creation rules and description                          |
| `/ui-dev?state=settings&fixture=finnish` / `fixture=louisiana` | Preferred rules selector                                         |
| `/join/7KQ4M2XB?fixture=finnish` / `fixture=louisiana`         | Rules badge in guest preview or authenticated confirmation       |
| `/join/7KQ4M2XB?source=typed&fixture=louisiana`                | Manual-code arrival at the same confirmation                     |
| `/table-dev?fixture=louisiana`                                 | Playing table badge; Table settings → Table rules                |
| `/table-dev?fixture=louisiana-bidding`                         | Server minimum bid 7; badge clear of the bid grid                |
| `/table-dev?fixture=louisiana-explainer`                       | First-encounter rules explainer, four facts, feedback and Got it |
| `/table-dev?fixture=louisiana-game-over`                       | Game-over rules badge                                            |
| `/table-dev?fixture=louisiana-waiting`                         | Waiting rules badge and Table rules action                       |
| `/table-dev?fixture=louisiana-waiting-explainer`               | Waiting first-encounter explainer; dismiss and reopen            |

The actual `/join-code` form routes to `/join/7KQ4M2XB?source=typed`;
`manual` is **not** a valid arrival source. It ends at the same authenticated
confirmation as an invite link, not a separate manual-code confirmation screen.
`join-code-louisiana-confirm` exercises that form with a mocked Louisiana preview.

Grammar cases: `create-table-finnish`, `create-table-louisiana`,
`settings-finnish`, `settings-louisiana`,
`join-finnish-preview`, `join-finnish-confirm`, `join-louisiana-preview`,
`join-louisiana-confirm`, `join-louisiana-manual-confirm`, `join-code-louisiana-confirm`,
`table-finnish`, `table-louisiana`, `table-louisiana-bidding`, `table-louisiana-explainer`, `table-louisiana-game-over`,
`table-louisiana-waiting`, `table-louisiana-waiting-explainer`.
All run at 390×844, 844×390 and 667×375. Finnish playing, waiting and
game-over cases also check badges; playing/waiting reopen the rules from the menu
and capture an additional `-rules-reopened.png` screenshot.

---

## Scripted checks (Playwright against Expo web)

Needs Expo web running (`bun run web`) and, once per machine,
`bunx playwright install chromium`.

```bash
bun run test:ui            # full viewport matrix, touch targets, containment
UI_CASES=table-bidding,home bun run test:ui      # just these
UI_SHOT_DIR=/tmp/shots bun run test:ui           # where screenshots land
UI_PARTITION=1/5 UI_REPORT_PATH=/tmp/ui-report.json bun run test:ui  # one CI-sized batch
node scripts/verify-ui-grammar.mjs --list        # selected viewport/case IDs, no browser
MOBILE_BASE_URL=http://localhost:8081 node scripts/verify-seat-decisions.mjs
node scripts/verify-waiting-seats.mjs   # 6 viewports incl. safeArea variants
node scripts/verify-profile.mjs
node scripts/verify-dealing.mjs  # four dealers, 3/6/9 receive order, sort/bidding timing, reconnect, reduced motion
```

`bun run test:ui:diff` (pixel diff) is **CI-only** — baselines are Linux Chromium
renders, so Mac captures flag font/antialiasing noise. Adopt intentional drift with
`bun run ui:baselines <runId>`.

CI balances the full matrix across five jobs using Linux case durations in
`scripts/ui-case-costs.json` (initial calibration: Actions run `38744981024`).
New cases use the median recorded duration and are still included.
Refresh the weights from a successful run's `ui-report-*`
artifacts (each record's `id` maps to its `ms`); local Mac timings are not comparable.
The aggregate checks that every case completed exactly once and its capture
exists, then compares all committed baselines. Its job summary lists the slowest
cases so future tuning can use measured costs.

`UI_CASES` names: `home` `home-guest` `home-table-unknown` `game-away` `profile` `profile-guest` `profile-badges` `settings` `league` `lobby-list` `lobby-empty` `lobby-rejoin` `lobby-open` `lobby-substitute` `lobby-watch` `lobby-search-empty` `login` `register` `register-password`
`register-name` `classic-forgot` `classic-link-sent` `classic-help` `join-code` `join-invite`
`ui-components` `create-table` `create-table-open` `create-table-requirement` `create-table-bots` `create-table-friend` `table-waiting` `table-ready` `table-ready-host`
`table-host-controls` `table-invite` `table-waiting-notice` `table-playing` `table-notice`
`table-reconnecting-banner` `table-dealer-selection`
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
