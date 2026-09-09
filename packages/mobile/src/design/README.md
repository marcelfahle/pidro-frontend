# Pidro Design System v2 — the constitution

Locked 2026-09-09. Everything user-facing is built from these tokens and primitives.
This document is the law; the canvas is the studio; `/ui-dev` is the enforced gallery.

## The material world

Pidro's UI is a physical place: a felt table with wood-and-gold furniture and glass
panels. Two rules follow from that and settle most decisions:

- **Buttons sit proud of the surface** — the four-layer bevel (below).
- **Inputs are carved into it** — dark-to-light wells with an inner top shadow and a
  bottom hairline glint (`Input`). Never restyle one into the other.

## The four-layer bevel

Every beveled control is the same sandwich, implemented once in
`src/components/ui/Bevel.tsx` and consumed via `BevelButton`:

1. **Rim** — gold (or glass) gradient, light falls from above.
2. **Keyline** — near-black seam (`#2A1505`, wood only) that makes the rim read as metal.
3. **Face** — material gradient + 1px top glint + bottom lip (inset `boxShadow`).
   The lip is the thickness.
4. **Gloss** — curved lens on the top 46%, never a flat band.

Materials: `wood` (primary/CTA, caramel ramp `#B57A31 → #91541C → #6C370E → #4E2509`,
Bree Serif gold `#FFD447` labels) and `glass` (secondary, translucent blues, Nunito 800
white labels). All values live in `PidroBevel` in `tokens.ts` — never inline them.

### Weights: lite and hero

- **`lite`** (default): 2px rim, 1px keyline, soft shadow — everyday controls.
- **`hero`**: 2.5px rim, 1.5px keyline, 6px lip, stronger gloss and shadow —
  **exactly one hero per screen** (PLAY on home). Juice is reserved, never sprinkled.

### Non-negotiables

- **Press physics**: the control travels 2px down, shadows tighten, lip compresses —
  90ms ease-out. No scale, no opacity flicker. (Built into `BevelPressable`.)
- **Optical lift**: labels ride 1px high (`translateY(-1)`) or their drop shadow makes
  them read low. Bree Serif needs ~1.3× line-height or descenders clip.
- **A CTA is an object, not a bar**: `fullWidth` caps at 380px and centers.
- **Touch targets ≥ 44px** (CI-enforced).
- **Proximity rhythm**: a form label sits 6px above its own field; blocks are 16px apart.
- On height-starved layouts (phone landscape, <500px tall) **decoration yields, not the
  form** — hide the logo, keep the fields comfortable.

## Motion

- **Press physics** (built into `BevelPressable`/`PressableFX`): 2px travel or 0.97
  scale, 90–140ms ease-out. Never both; never opacity flicker.
- **Tab switches**: 160ms opacity-only cross-fade on the content (`(shell)/_layout`);
  the pill never animates during navigation. Route pushes (lobby, game) stay instant —
  `animation: 'none'` for game feel.
- **Ambient motion** is rare and slow (the 80s logo glow). One orchestrated moment
  beats scattered micro-wiggles.
- **Older devices**: animate only opacity and transform (GPU-composited); never
  layout properties. Every animation honors Reduce Motion
  (`useReducedMotion` / `ReduceMotion.System`) — the app must feel complete with all
  motion off.

## Type

- **Bree Serif** (`PidroFonts.display`): CTA labels, screen/plaque titles, big numbers.
  Weight 400 only; it brings its own character.
- **Nunito** (`PidroFonts.ui`): everything else, via `PidroText` roles
  (display/title/label/body/metadata). Never invent a size/weight outside the roles.

## Gradients and shadows (New Architecture)

- Gradients: `gradientBg(css)` from `Bevel.tsx` — `experimental_backgroundImage` on
  native, CSS `backgroundImage` on react-native-web. No image assets for chrome.
- Shadows: RN `boxShadow` strings, inset entries included. Skia is for the card table,
  `react-native-svg` for one-off vector chrome (banners, `LogoGlow`).

## Primitive selection

| Need                           | Use                                                                  |
| ------------------------------ | -------------------------------------------------------------------- |
| Any action                     | `BevelButton` (wood = forward, glass = secondary, `icon` for square) |
| Custom beveled control/surface | `BevelPressable` / `BevelSurface`                                    |
| Text                           | `PidroText` roles                                                    |
| Text entry                     | `Input` (label, error, `revealPassword`, full autofill markup)       |
| Panels, cards, plaques         | `Surface`                                                            |
| Screen scaffold                | `ScreenShell` (+ `ScreenHeader` for sub-screens)                     |
| Choice with confirm/cancel     | `DecisionWindow` / `Modal`                                           |
| Home navigation                | `HomeTabBar` (bottom bar portrait, right rail landscape)             |
| Sign-in surfaces               | `AuthProviderButtons`, `AuthSheet`, `KeepProgressPrompt`             |
| Selectable custom control      | `PressableFX` (RN 0.85 drops style-function styles)                  |

Legacy: `Button` (old flat variants) is utility-only on unmigrated screens — no new
call sites. `MenuAction`, `PrimaryButton` are compatibility-only.

## How changes trickle down

1. **Explore** on the design canvas (Pidro Design System v2 artifact — System page has
   the sheets, Explorations page the screen work).
2. **Implement** by changing `tokens.ts` and/or the primitive — never a screen-local copy.
3. **Enforce**: `/ui-dev?state=components` renders the system; CI screenshots it and
   pixel-diffs against `test/ui-baselines/`. Intentional change ⇒ adopt the CI run's
   captures: `bun run ui:baselines <runId>`, review, commit.
4. **Consume**: screens use primitives and tokens only. A screen needing a new look is
   a request to extend the system, not permission to fork it.

## Known gaps (extend the system here next)

- Marquee banner (gold rim / wood band / navy panel plaque) — designed on the canvas,
  not yet a `react-native-svg` primitive.
- Rating plaque / league progress / level ring on home are screen-local until real
  progression data lands — promote to primitives then.
- Danger material for `BevelButton` (designed on the canvas Buttons sheet).
- In-game windows (bid grid, trump, hand selection) still on legacy surfaces.

## Exceptions

- The Skia card renderer owns card art, hit testing, and card motion.
- Fixed table plaques may cap font scaling to protect coordinate-bound layouts.
- Game-over celebration may go loud, but from shared tokens and primitives.
