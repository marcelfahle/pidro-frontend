# Native UI Grammar

Build production screens from semantic roles rather than copying colors or one-off panel styles.

## Tokens

- `PidroColors`: felt, surfaces, borders, text, gold/cyan actions, and status tones
- `PidroRadii`: tight card/control radii and bounded window radii
- `PidroFonts` and `PidroType`: Nunito plus display, title, label, body, and metadata roles
- `PidroSpacing`: the shared 4/8/12/16/24/32/40 spacing rhythm
- `PidroLayout`: touch target, content widths, and responsive thresholds

Skia code uses `src/game/canvas/tokens.ts`, which maps canvas-friendly names back to these roles.

## Primitive selection

- Use `PidroText` instead of creating a new font size/weight combination.
- Use `Button` for every user action. Gold/default is the primary forward action; secondary is cyan; outline/ghost is quiet; destructive is red.
- Use `Surface` for panels, cards, plaques, windows, and subtle rows.
- Use `ScreenShell` and `ScreenHeader` for production routes.
- Use `DecisionWindow` when the player must read context, make a choice, and confirm or cancel.
- Use `Input` for labeled fields and errors.
- Keep `PressableFX` for custom selectable controls because React Native 0.85 can drop style-function styles on native.

## Interaction rules

- All targets are at least 44 points.
- Keep primary and destructive actions visually distinct.
- State choices with accessible selected/disabled/busy state.
- Keep form or selection state above orientation-specific layout branches.
- Let long names truncate or wrap intentionally; never let them displace a required action.
- Use sentence case and complete instructional sentences. Reserve uppercase for very short score/status labels.

## Exceptions

- The Skia card renderer owns card art, hit testing, legal-card lift/dim feedback, and motion.
- Fixed table plaques may cap font scaling to protect coordinate-bound layouts.
- Game over may use celebration, but it reuses the shared surfaces, type roles, and buttons.
- `PrimaryButton` is compatibility-only. Do not add new call sites.
