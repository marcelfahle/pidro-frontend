# English / Swedish delivery

The current Expo app uses one shared, typed catalog composition in
`packages/shared/src/i18n`. Language is a device preference, independent of rules,
account and table. Existing installations default to System. Ordered preferred
languages resolve to English or Swedish (`sv-SE` and `sv-FI` both resolve to `sv`),
otherwise English. Persisted settings resolve before the first player-facing copy.

Mounted consumers subscribe without replacing navigation, socket or game state.
Memoized presentation includes locale; queued notices and ticker entries retain
their event identity and translate at presentation. Missing player names stay
missing in transport/state; only presentation supplies a localized fallback.
Usernames, room names, invite codes, suits/positions on the wire and server-owned
scores/legal actions are not translated or recalculated.

## Design and fixtures

- Spec: `packages/mobile/docs/design/source/Localization.html`
- Reviewed board: `packages/mobile/docs/design/boards/Localization.png`
- Runtime: Settings uses existing ScreenShell/ScreenHeader/Surface/PidroText and
  PressableFX, with 48px glass radio choices, checked state and keyboard support.
- Fixtures: `packages/mobile/docs/FIXTURE-ROUTES.md`, bounded locale overrides on
  `/ui-dev`, `/table-dev`, `/auth-flow-dev` only. Real navigation ignores them.
- Grammar covers EN/SV settings selections and seven gameplay phases at 390×844,
  844×390, 667×375, 360×640 and 768×1024. These are browser dimensions, not devices.
- The compact portrait trump window reserves North and the player's hand and
  yields decorative suit-image size, never Swedish text size.

## Source translation mapping

Authoritative terminology reference: committed original
`docs/reference/unity-localization/{English,Swedish}.txt`. The originals remain
unchanged. Current English copy and backend behavior govern the new sentences.
Catalog sections place English and Swedish side by side for review.

| Current catalog | Unity source | Treatment |
| --- | --- | --- |
| `shell`: settings language/sound/on/off | `TID_Language`, `TID_Sound`, `TID_On`, `TID_Off`, `TID_SettingsCaps` | Språk, Ljud, På, Av; sentence case |
| `auth`: sign-in/form/actions | `TID_SignIn`, `TID_UserName`, `TID_Password`, `TID_EmailAddress`, `TID_Cancel`, `TID_Continue` | Reuse vocabulary; current full sentences |
| `social`: friends/home/lobby | `TID_Friends`, `TID_Host`, `TID_QuickJoin`, `TID_Multiplayer`, `TID_VS` | Vänner, värd, Snabbspel, Spela online, mot |
| `social`: profile statistics | `TID_PlayedGames`, `TID_Wins`, `TID_Loses`, `TID_WinningPercentage` | Spelade spel, vinster, förluster; locale number formatting |
| `game`: bids/suits/turns | `TID_Bet`, `TID_Pass`, `TID_Passed`, `TID_ChooseASuit`, `TID_DealerChip` | Bud, passa/passade, färg, givare; complete interpolated sentences |
| `core`: original invite/rules keys | `TID_Invite`, `TID_Loading`, `TID_Cancel`, `TID_Host` | Existing English preserved; modern invite and rules sentences newly translated |
| `errors` | Backend manifest meanings, Unity bud/färg/givare vocabulary | 119 explicit codes, safe typed params; no raw exception text |
| New account/guest/Classic recovery, updates, accessibility | No matching current Unity flow | Newly translated from current app meaning |

Corrections/exclusions: `TID_Select` uses imperative **Välj**, not Unity's **Välja**;
English/Svenska are autonyms (not **Engelska**). Unity's Finnish deletion strings,
mixed-English score failures, inconsistent sort/färg, trailing-space XP key and
fragmented sentence patterns are not imported. Do not import old OTP/password
emailing, subscription-gated rematches or tutorial rules into current flows.
Louisiana explanations remain based on the current app/server contract.

Swedish review remains requested for **medspelare**, **returmatch**, **bot/botar**,
**koppla** (Classic claim), **offentligt namn**, **gästspel**, **solobord**,
**Spelstyrka**, **Testare från starten**, **Stöttepelare**, **Gesäll/Stormästare**,
and trump-killing terminology. No native-speaker approval is claimed.

## Backend rollout

Companion: https://github.com/marcelfahle/pidro-backend/pull/94.
`docs/contracts/backend-localization-errors.json` is the exact fetched manifest;
its sibling Markdown records source commit/hash and adapter behavior. Structured
codes win over old fields. Known stable legacy identifiers still work; uncoded
failures get translated context fallbacks. Parallel `field_errors` retain field
identity and server length parameters, including across live language changes.
The frontend works before the backend contract is deployed.

## Native and OTA boundary

`expo-localization` was already installed; no new native dependency. App config
declares en/sv support and localized iOS photo-library permission copy. Camera and
microphone permission requests remain disabled. These generated native resources
require a future native build; JavaScript catalogs, settings and live switching
can work over OTA on the current compatible runtime. No OTA or native release
build was run. OS permission dialogs and Apple's native sign-in button follow OS
localization, not a JavaScript-only override.

This Linux orb cannot certify native safe-area measurement, screen-reader
pronunciation, large native font scaling or OS locale change behavior on a device.
Before a native release, check both languages in iOS/Android system settings,
foreground after OS language changes, explicit preference precedence, photo
permission prompts, VoiceOver/TalkBack, notch/system bars and both rotations.
Synthetic browser inset checks do not replace those checks.

## Validation commands

`bun run shared:build`; `bun run test:unit`; in `packages/mobile`,
`bunx tsc --noEmit` and `bun run lint`; `bun run web:build` from root.
Focused contract/reactivity tests live alongside existing unit suites. Real
settings persistence, focus and document language are tested by
`e2e/specs/settings-language.spec.ts`. Full Frontend CI additionally covers UI
grammar, production export, real backend games and account journeys. The PR
records exact final run/results and only intentionally refreshed baselines.
