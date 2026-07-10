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

## Responsive layout

The required phone references are 390 × 844 portrait and 844 × 390 landscape.

- Portrait stacks tasks, uses the available vertical canvas, and keeps frequent actions near the bottom of the task. It does not reserve empty space for future ads or navigation.
- Landscape uses compact headers, two-column forms where that reduces vertical pressure, and shallow one-row game decisions.
- Orientation changes recompute layout from `useWindowDimensions`; form and selection state remains in the mounted component so rotation does not reset progress.
- Create table uses a stacked portrait form and a two-column landscape form. Its Cancel/Create footer is outside the scrollable content.
- Bid, trump, and hand-selection windows preserve the player’s relevant table and card context. Landscape bidding uses one row of bids; hand selection scrolls horizontally instead of overlapping targets.

## Table rules

- Landscape retains the legacy full-felt composition with floating score and Leave controls.
- Portrait has a compact translucent HUD reserve and no empty bottom utility/ad band.
- Player plaques attach identity and status to opponent hands. Gold marks the active turn; cyan and green identify the player and teammate without turning every plaque into an accent.
- Card textures, card backs, deal/play motion, and the legal-card bright/lift/dim behavior are protected visual anchors.
- Game over is the celebratory exception, but it still uses the shared type, surfaces, and action hierarchy. Winner and final score are each stated once.

## Verification

Run `bun run test:ui` while Expo web is available at `MOBILE_BASE_URL` (default `http://localhost:8081`). It captures both target orientations, checks viewport containment and 44-point controls, and verifies that decision windows do not overlap the north player plaque.

Web evidence does not replace native checks for safe areas, keyboard behavior, text scaling, rotation, and Skia input. `/ui-dev` and `/table-dev` must redirect without exposing fixture content in production builds.
