# Skia Game Table — Implementation Plan

Status: **Skia canvas table is now the MAIN table** — `USE_SKIA_TABLE = true` (2026-06-26). Legacy `GameTable` kept as backup (flip flag `false` to revert instantly). M0–M5 + DS seat furniture + original-aesthetic match done & web-verified on `/table-dev`. **Still NOT tested against a live Phoenix game or on-device** — that's the remaining gate. · Target: `packages/mobile`

Rebuild the in-game table as a **react-native-skia** canvas driven by **Reanimated**, replacing the static React Native `<View>`/`<Image>` table in `src/components/game/`. One component renders on **iOS, Android, and Web** (Expo Web via CanvasKit). The completed canvas now carries forward the interaction and animation work proven in the original throwaway spike.

## 0. Decisions (locked)

- **Native-primary**, web later via Expo Web (config flip, not a second renderer). One table, all platforms.
- **Game screen supports both orientations** and tweens between them; lobby/menus stay portrait.
- **Clean redesign**, not a legacy-layout echo. Keep brand colors / some elements (design system), but it should feel like a new game. Visual tweaking is deferred.
- **Canvas = the table surface only.** Buttons/text/modals stay as RN overlays floating above the canvas.
- **Skia layer is pure presentation.** Server (Phoenix) stays authoritative; the canvas renders `game_state` and calls the existing `pushGameAction`. It decides nothing.
- **This app is greenfield** (pre-release, solo); real production is a separate Unity app being replaced. The existing RN `GameTable.tsx` is a _working reference to compare feel against_, not a production fallback — so the controller is shared by both and the new table is built properly from scratch, not bent to preserve legacy.

## 1. Principles

1. Don't touch game logic or the channel layer. Reuse `useGameStore`, `useGameViewModel()`, `useGameChannel`/`pushGameAction` unchanged.
2. Build beside the old table behind a feature flag; keep `GameTable.tsx` working until parity.
3. Layout is a pure function of `(width, height, insets, profile)` → element coordinates. Recompute on resize/rotate; tween to new slots.
4. Keep HUD text and interactive controls as RN (no Skia fonts/inputs in v1). Canvas draws images + shapes only.
5. Verify each milestone on Web via CanvasKit screenshot (our only headless-checkable surface) + manual native check.

## 2. Architecture

```
app/game/[code].tsx
  └─ <GameScreen>                       (RN container, owns orientation + safe area)
       ├─ <GameCanvas/>                 (Skia <Canvas>: felt, seats, hand, trick, trump, particles)
       └─ RN overlays (above canvas):
            GameInfoBar · TrumpSelectionModal · BiddingActions ·
            HandSelector · GameOverOverlay · ConnectionBanner · top/bottom bars
```

**Data flow (unchanged, canvas is a new consumer):**

```
Phoenix game:${roomCode}  --game_state-->  useGameStore (zustand)
                                              └─ useGameViewModel()  ──► useTableModel() ──► <GameCanvas>
UI gesture (play) ──► handlePlayCard(card) ──► pushGameAction('play_card', { card })
```

`useGameViewModel()` already returns each player's **`relativePosition`** (N/E/S/W _from your seat_ — server rotates the world so you're at the bottom). So the canvas never computes seat ownership; it maps `relativePosition → seat anchor`.

**New files (kept separate from old `src/components/game/`):**

| File                                                                   | Responsibility                                                                                    |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/game/useGameTableController.ts`                                   | Presentation-neutral controller shared by legacy RN table and Skia table                          |
| `src/game/canvas/GameCanvasTable.tsx`                                  | RN screen container: orientation, safe area, `<GameCanvas>` + overlays                            |
| `src/game/canvas/GameCanvas.tsx`                                       | The Skia `<Canvas>` scene root                                                                    |
| `src/game/canvas/layout.ts`                                            | `pickProfile()`, `computeLayout()` → `TableLayout`                                                |
| `src/game/canvas/useTableModel.ts`                                     | Adapt viewModel+serverState → render model (sorted hand, trick→seat slots, opp counts, legal set) |
| `src/game/canvas/scene/{Hand,Trick,Seat,TrumpIndicator,Particles}.tsx` | Skia sub-scenes                                                                                   |
| `src/game/canvas/cardTextures.ts`                                      | Cross-platform Skia image loading for 52 cards + back                                             |
| `src/game/canvas/tokens.ts`                                            | Colors/sizes sourced from the design system                                                       |

**Reused as-is:** `src/utils/cardImages.ts`, `useGameStore`, `useGameViewModel`, `useGameChannel`, and all overlay components. Extract `AdBanner`, `TurnIndicator`, and `BiddingActions` from `GameTable.tsx` only as needed so the legacy and Skia screens do not fork behavior.

## 3. Layout system

Two layers — discrete profile selection + fluid scaling within a profile.

```ts
type Profile = 'phone-portrait' | 'phone-landscape' | 'tablet-portrait' | 'tablet-landscape';

// shortest side >= 600 → tablet/web class; width > height → landscape
function pickProfile(w, h, insets): Profile;

type Seat = { x: number; y: number; rot: number; handAnchor: { x; y } };
type TableLayout = {
  felt: { gradientCenter: { x; y } };
  trickZone: { cx: number; cy: number; r: number }; // central drop zone (= play ring)
  seats: Record<RelativePosition, Seat>; // south=you(bottom)
  hand: { cx: number; cy: number; maxWidth: number; cardW: number; cardH: number; arc: number };
  cardW: number;
  cardH: number; // clamped base card size
};

function computeLayout(profile, w, h, insets): TableLayout;
const cardSize = (shortest) => clamp(shortest * 0.13, 54, 104); // CSS clamp(), in JS
```

- **Anchor** regions to edges/center + safe-area insets; **clamp** card size; positions are relative to regions (not absolute px). This is the spike's `computeLayout()` generalized.
- **Seats:** south = you (bottom, hand fanned), north = top, east = right (rot ±90°), west = left.
- **Orientation:** set `app.json` `"orientation": "default"` / all supported orientations, then keep non-game routes portrait with route-level options where possible. Add `expo-screen-orientation` only if native testing proves route-level options insufficient. On rotate, `useWindowDimensions` updates → recompute → tween all elements to new slots (the "wow" transition).
- **Web/tablet** is just the tablet profile re-evaluated on browser resize.

## 4. Design tokens

`src/game/canvas/tokens.ts` centralizes felt color, card frame, seat/avatar colors, turn-highlight, trump tint — sourced from the existing design system (`packages/web` DS + current mobile components) so the canvas matches brand. Treated as a single file to retheme later (user wants tweaking deferred).

## 5. Implementation contracts

These contracts remove the remaining implementation choices before coding. The Skia work should follow them unless the codebase proves one impossible.

### 5.1 Controller and overlay ownership

Create one presentation-neutral controller hook, `src/game/useGameTableController.ts`, and make both `GameTable.tsx` and `GameCanvasTable.tsx` consume it during the migration.

The controller owns:

- Store reads from `useGameStore()` and `useGameViewModel()`.
- Derived game state: `roomTitle`, `phase`, `trumpSuit`, `players`, current turn, `yourHand`, `yourCardCount`, normalized `currentTrick`, `isYourTurn`, `isPlayingTurn`, `isSecondDeal`, `isGameOver`, `showTrumpSelection`, and connection state.
- Submission state and action handlers: `handleDeclareTrump`, `handlePlayCard`, `handleSelectHand`, and shared error presentation.
- The rule that outbound game actions send only server intent payloads, for example `{ card: { rank, suit } }`, never render-model objects.

The controller does **not** own:

- Canvas layout, hit-testing, or animation shared values.
- RN visual composition.
- Any game-rule computation beyond reading `legalActions` supplied by the server.

`GameCanvasTable.tsx` owns the screen composition: top bar, connection banner, `GameInfoBar`, ad/bottom bar, `GameOverOverlay`, `TrumpSelectionModal`, `BiddingActions`, `HandSelector` during second deal, and the `GameCanvas` layer. `GameCanvas.tsx` receives a render model and callbacks; it does not read stores or channels directly.

### 5.2 Render model

`useTableModel()` adapts controller state into a canvas-friendly render model. It should be pure and deterministic for a given state snapshot.

```ts
type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;
type CardKey = `${Suit}_${Rank}`;

type TableCard = {
  key: CardKey;
  card: Card;
  isTrump: boolean;
  isLegalPlay: boolean;
};

type TableSeat = {
  absolutePosition: Position;
  relativePosition: RelativePosition;
  username: string | null;
  isYou: boolean;
  isTeammate: boolean;
  isOpponent: boolean;
  isConnected: boolean;
  isCurrentTurn: boolean;
  cardCount: number | null;
  lastPlayedCard: TableCard | null;
};

type TableModel = {
  phase: GamePhase;
  trumpSuit: Suit | null;
  seats: Record<RelativePosition, TableSeat | null>;
  yourHand: TableCard[];
  yourCardCount: number | null;
  currentTrick: Partial<Record<RelativePosition, TableCard>>;
  currentTurnRelative: RelativePosition | null;
  legalPlayKeys: Set<CardKey>;
  canPlay: boolean;
};
```

Normalization rules:

- `cardKey(card)` is `${card.suit}_${card.rank}` and matches the legacy PNG file names.
- Sort `yourHand` exactly like `PlayerHand`: trump first, then spades/hearts/diamonds/clubs, rank descending.
- Treat `serverState.players[position].hand` as either `Card[]` or a masked count; fall back to `card_count` when present.
- Accept `current_trick` as either an array of plays or an object with `plays`; accept both `player` and `position` on each play because the backend serializer emits both and the current RN table already tolerates both shapes.
- Map absolute play positions to relative slots through `viewModel.players`; never compute seat ownership in canvas code.
- Missing, empty, or malformed state renders empty slots rather than throwing.

### 5.3 Legal play gating

Card legality comes only from server-provided `legalActions`.

- Build `legalPlayKeys` from actions where `action.type === 'play_card'`.
- A hand card is playable only when `phase === 'playing'`, it is your turn, submission is not already in flight, and its key is in `legalPlayKeys`.
- Non-playable cards remain visible but are dimmed and ignored by tap/drag hit-testing.
- The canvas may show local lift/drag feedback before release, but the final played-card movement is reconciled from the next `game_state`.
- If `pushGameAction('play_card', ...)` rejects, the controller shows the same action error path as the legacy table and the card snaps back.

### 5.4 Card texture source

Use the existing legacy PNG assets as the only card art source. The repo already has all 52 face images at `assets/images/cards/{suit}_{rank}.png` plus `assets/images/cardback.png`.

`cardTextures.ts` should expose a static map keyed by `CardKey`:

- Native: load via static `require()` paths, like `src/utils/cardImages.ts`.
- Web: Skia cannot resolve Metro asset modules (proven by the spike — `require()` returns a numeric id that loads `/undefined`). A public mirror is therefore **required, not conditional**: a prebuild/script step copies `assets/images/cards/*` + `cardback.png` → `public/cards/` so all 52 stay in sync automatically (no hand-copying). Source of truth stays `assets/images/cards`; never draw replacement cards or introduce alternate art.
- The canvas must render a visible fallback card frame if a texture has not loaded yet, so layout can still be verified.

### 5.5 Orientation

The app currently starts portrait-only. The game-table migration must make orientation explicit:

- Set app-level orientation to allow game landscape (`"default"` / all supported orientations).
- Keep lobby/auth/menu routes portrait through Expo Router screen `orientation` options where possible.
- Prefer Expo Router / native-stack per-screen orientation first, because `react-native-screens` is already installed. Add `expo-screen-orientation` only if route-level orientation is insufficient in native testing.
- On game-screen exit, portrait routes must return to portrait without requiring a full app reload.

### 5.6 Animation triggers

Animation triggers are based on server-state diffs, not predicted game rules:

| Trigger             | Diff source                                                      | Behavior                                                 |
| ------------------- | ---------------------------------------------------------------- | -------------------------------------------------------- |
| Deal / second deal  | Your hand changes from empty or count changes upward             | Stagger cards from deck/seat origin into hand slots      |
| Own play confirmed  | `yourHand` loses a card and `current_trick` gains your play      | Fly the card from previous hand slot to south trick slot |
| Opponent play       | `current_trick` gains a non-south play                           | Fly a card back from that seat to its trick slot         |
| Trick collect       | `tricks.length` grows or `current_trick` clears after four plays | Sweep visible trick cards toward winner seat, then clear |
| Trump declared      | `trumpSuit` changes from null to a suit                          | Brief trump indicator flourish                           |
| Turn changes        | `currentTurnRelative` changes                                    | Move/pulse active-seat highlight                         |
| Orientation changes | `computeLayout()` output changes                                 | Tween existing elements to new layout slots              |

**Cold-load / resync rule:** the first settled model after mount — and any full resync after reconnect — renders elements in final positions with **no animation**; only diffs _after_ the first settled model animate (otherwise every join/reconnect would replay a full deal + trick fly-in). The scene/animation layer holds the previous model in a ref to compute diffs; `useTableModel` itself stays pure.

## 6. Milestones

### M0 — Layout foundation + canvas shell

- Add `@shopify/react-native-skia` (already installed by spike), confirm web CanvasKit setup (already done: `public/canvaskit.wasm`).
- `app.json`: `"orientation": "default"` / all supported orientations; lock lobby/auth/menu routes to portrait through Expo Router options where possible.
- `layout.ts`: `pickProfile` + `computeLayout` for all 4 profiles (static, no data).
- `GameCanvas.tsx`: draw felt gradient, 4 seat markers, central trick ring from `computeLayout`. No real data yet.
- **Accept:** route renders the empty table in all 4 profiles; rotating the device re-lays-out (web: resize window; native: rotate sim). Web screenshot in portrait + landscape.

### M1 — Render real state (read-only) ← the spike you asked for

- `cardTextures.ts`: load all 52 legacy PNG faces + back into Skia images, cross-platform (native `require`; web served from the same assets or a generated/static public mirror; replace the `public/spike` hack).
- `useTableModel.ts`: from `useGameViewModel()`+`serverState` produce: your sorted hand (trump-first, [♠♥♦♣], rank desc — match `PlayerHand`), opponents' `card_count` → backs, `current_trick` plays mapped to relative-seat slots, trump suit, current-turn seat.
- `scene/Hand`, `scene/Seat`, `scene/Trick`, `scene/TrumpIndicator`: draw them.
- Wire `GameCanvasTable` into `app/game/[code].tsx` behind a feature flag (default off), beside old `GameTable`.
- **Accept:** with a live game, the canvas mirrors the current table read-only — your real hand, opponents' backs, the live trick, trump, whose turn. Verified against the old table side-by-side.

### M2 — Interaction (play a card)

- Canvas gesture: tap a legal hand card **or** drag it into the trick ring → `handlePlayCard(card)` → `pushGameAction('play_card', { card })` (existing path).
- Gate by `legalActions` (`type:'play_card'` set): illegal cards dimmed/non-draggable.
- On the resulting `game_state`, animate the played card from its hand/seat slot into its trick slot (diff old vs new `current_trick`). Optional optimistic lift-on-release with reconciliation when the server confirms.
- **Accept:** you can play through a hand entirely from the canvas; only legal cards play; opponents' plays animate into the trick as state arrives.

### M3 — The juice

- Deal-in (staggered overshoot) at deal / `second_deal`.
- Trick-collect: when a trick completes (`tricks` grows / `current_trick` clears), sweep the 4 cards to the winner's seat + particle pop (spike's `Particle` system).
- Turn pulse on the active seat; trump-declared flourish.
- Orientation-change tween (cards flow to new slots on rotate).
- **Accept:** a full hand feels like the spike — every state change is animated, no popping.

### M4 — Re-attach overlays

- Render existing RN overlays above `<GameCanvas>`: `GameInfoBar`, `BiddingActions`, `TrumpSelectionModal`, `GameOverOverlay`, `ConnectionBanner`, top/bottom bars — unchanged.
- `HandSelector` (pick 6): keep as RN overlay first; canvas version optional later.
- **Accept:** full game loop (bid → declare trump → second deal/select → play → game over) works on the canvas table with overlays.

### M5 — Parity, flag flip, web

- Parity checklist vs old `GameTable`; fix gaps.
- Flip the feature flag default to the canvas table; keep old table one release as fallback, then delete `src/components/game/` table pieces it replaces.
- Confirm tablet profile on Expo Web; note the 4 web-readiness gaps from the spike (see `spec` / memory) — `expo-secure-store` web fallback is the one real blocker for shipping web.
- **Accept:** canvas table is the default on native; web renders the tablet profile.

**M5 parity checklist (must clear before flipping `USE_SKIA_TABLE` on):**

- [x] Web CanvasKit loader for the live game screen — `SkiaGameTable` in `app/game/[code].tsx` does `LoadSkiaWeb()` → dynamic `import(GameCanvasTable)` on web, dynamic import on native. Skia is never evaluated at app boot.
- [x] Top-HUD / north-seat overlap fixed — `computeLayout(..., topReserve)`; `GameCanvasTable` passes `HUD_RESERVE=84`, `GameCanvasDev` passes `80` so `/table-dev` reflects it.
- [ ] Bottom ad-banner placement on the canvas table (skipped in M4 — canvas owns full height; decide placement).
- [ ] Overlay restyle to sit on the blue felt (slate bidding modal, purple info-bar) → DS cyan/gold/glass.
- [ ] Legacy `GameTable` controller-retrofit (the `// TODO(controller-retrofit)`) — optional (greenfield): do for single-source parity, or skip and delete legacy.
- [ ] Phase coverage audit — dealer_selection / discarding / scoring / hand_complete render sensibly (M1–M4 covered bidding/declaring/second_deal/playing/game_over).
- [ ] Reconnection/resync renders with NO animation — cold-load rule lives in the sprite engine (prev-model ref); confirm a full mid-game resync snaps rather than replaying deal/fly.
- [ ] 9 pre-existing unrelated `tsc` errors (home/lobby/useGameChannel/PlayerAvatar) — clean up separately.
- [ ] **On-device (iOS/Android) + live-Phoenix test** — the big one; everything to date is dev-route/mock-verified only. Flip the flag only after this.

## 7. Animation inventory (Reanimated-driven Skia props)

deal-in · flip · drag + snap-to-trick · played-card fly-to-slot · trick-collect sweep · particle pop · turn pulse · orientation reflow tween.

## 8. Risks & open questions

- **No optimistic state today** → decide M2: pure server-confirmed (simplest) vs optimistic lift + reconcile (snappier). Recommend server-confirmed first, add optimism if it feels laggy.
- **Hit-testing rotated/overlapping cards** → approximate bbox from topmost (spike approach); revisit if mis-taps.
- **Skia text** → avoided in v1 by keeping HUD/labels as RN overlays. If scores move onto canvas later, load a font via Skia.
- **Web asset resolution** → replace the `public/spike` hack with the legacy-PNG strategy in `cardTextures.ts` (M1).
- **`expo-secure-store` has no web impl** → auth store throws on web; needed before web ship, not before native.
- **Eager Skia import poisons web (M1 learning)** → never statically import a Skia-using module from a route file / `_layout`; Expo Router evaluates it at boot before `LoadSkiaWeb`, binding `Skia` to undefined CanvasKit → every canvas throws `PictureRecorder` undefined. Load Skia modules only via dynamic import / `WithSkiaWeb` / lazy `require()`. It's a boot-order bug: a page reload won't clear it — restart Metro to rebuild the entry bundle.

## 9. Out of scope (later)

Pidro point badges on cards, avatar art/ranks polish, sound design, haptics, spectator view, reduced-motion accessibility pass, retheme.
