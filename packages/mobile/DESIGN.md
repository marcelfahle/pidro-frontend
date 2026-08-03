# Pidro Mobile Design System

Pidro should feel familiar to players of the legacy landscape game while making portrait play comfortable with one hand. The table, cards, gold score cues, and cyan status cues carry that familiarity. Cleaner hierarchy, quieter navigation, and responsive decision windows make it feel current.

## Source of truth

- React Native UI: `src/design/tokens.ts`
- Skia aliases: `src/game/canvas/tokens.ts` (mapped from the React Native tokens)
- Shared UI primitives: `src/components/ui/`
- Deterministic visual fixtures: `/ui-dev` and `/table-dev` in development only

## Color roles

- Blue felt is the environment, not an action color.
- Gold is reserved for the primary action, the active turn, the winning state, and decisive score emphasis.
- Cyan marks focus, selection, connectivity, and secondary actions.
- Neutral blue surfaces organize content without competing with the cards.
- Red is reserved for destructive actions and errors. Reconnecting uses a compact warning treatment rather than a destructive alarm.

## Typography

Use Nunito through the five roles in `PidroText`: display, title, label, body, and metadata. Its rounded forms retain the legacy game's friendly, compact character while remaining legible on phones.

- Display and title establish outcome or screen hierarchy.
- Display, title, and control labels use the family's heavier weights for the confident legacy game feel; body copy stays calmer.
- Labels name controls and groups.
- Body text explains decisions in complete sentences.
- Metadata carries room codes, counts, statuses, and secondary details.
- Uppercase is limited to short, familiar score/status labels such as `US`, `THEM`, and `GAME OVER`.
- General text supports platform scaling. Bounded table labels may cap scaling to preserve the Skia coordinate layout.

## Components

- `Button` owns primary, secondary, outline/quiet, destructive, loading, and disabled action states. Every action has at least a 44-point target.
- `Surface` owns panel, card, plaque, window, and subtle surface roles.
- `ScreenShell` owns the background, safe areas, content width, and optional scrolling for production routes.
- `ScreenHeader` provides consistent back navigation and quiet trailing actions.
- `DecisionWindow` keeps context, content, and a persistent action footer in the same order.
- `Input` uses the table palette, scalable body text, an accessible label, and a clear error state.

`PrimaryButton` remains a migration adapter around `Button`; new code should use `Button` directly.

## Motion

- High-frequency screens such as Home and Lobby do not replay entrance choreography. Navigation uses the familiar native push direction so forward and back remain spatially clear.
- `PressableFX` owns shared press feedback: 110 milliseconds down, 140 milliseconds up, and a restrained 0.97 scale. Components may change color while pressed, but should not add a second transform.
- Menu pushes, modal fades, and press feedback all follow the system Reduce Motion setting. Reduced motion keeps state changes and tap feedback immediate without transitional movement.
- Routine interface motion stays on transform and opacity. Continuous or celebratory animation is reserved for game-state feedback, not navigation decoration.

## Responsive layout

The required phone references are 390 × 844 portrait and 844 × 390 landscape.

- Portrait stacks tasks, uses the available vertical canvas, and keeps frequent actions near the bottom of the task. The game table is the exception: it reserves one compact utility dock below the hand for chat, an adaptive ad, or table details. Those modes reuse the same slot instead of stacking.
- Landscape uses compact headers, two-column forms where that reduces vertical pressure, and shallow one-row game decisions.
- Orientation changes recompute layout from `useWindowDimensions`; form and selection state remains in the mounted component so rotation does not reset progress.
- Create table uses a stacked portrait form and a two-column landscape form. Its Cancel/Create footer is outside the scrollable content.
- Bid, trump, and hand-selection windows preserve the player’s relevant table and card context. Bidding follows the legacy centered 3-by-3 grid with PASS beneath it, scaled and positioned so the local hand remains fully visible in both orientations. Hand selection scrolls horizontally instead of overlapping targets.

## Table rules

- Landscape retains the legacy full-felt composition with floating score and Leave controls.
- Portrait seating uses a centered north/south spine with the raised player hand leaving the south plaque unobstructed beneath it and above the utility dock. East and west plaques sit symmetrically above their card stacks. Landscape keeps the opponent triangle, but aligns the south plaque to the scoreboard divider rail beside the low hand to preserve scarce vertical space. Portrait uses the narrower plaque treatment because horizontal space is constrained.
- Portrait has a compact translucent HUD reserve and a single 72-point bottom utility reserve. Multiplayer chat, an anchored adaptive ad, and table details are mutually exclusive dock modes; landscape does not reserve the dock.
- Played-card piles use the trick circle as their ruler in both orientations: each pile is centered on its north, east, south, or west cardinal point and grows along the tangent. Landscape reduces hand and trick-card scale, keeps the hand close to the bottom edge, and mirrors the north/south identity plaques to the right/left of their hands. The 667 × 375 iPhone SE viewport is the compact-landscape baseline.
- Player plaques attach identity and status to opponent hands. Gold marks the active turn; cyan and green identify the player and teammate without turning every plaque into an accent.
- Card textures, card backs, deal/play motion, and the legal-card bright/lift/dim behavior are protected visual anchors.
- Game over is the celebratory exception, but it still uses the shared type, surfaces, and action hierarchy. Winner and final score are each stated once.

## Verification

Run `bun run test:ui` while Expo web is available at `MOBILE_BASE_URL` (default `http://localhost:8081`). It captures both target orientations, checks viewport containment and 44-point controls, and verifies that decision windows do not overlap the north player plaque.

Web evidence does not replace native checks for safe areas, keyboard behavior, text scaling, rotation, and Skia input. `/ui-dev` and `/table-dev` must redirect without exposing fixture content in production builds.
