---
title: "feat: Dealer Selection Card Reveal Animation & Dealer Chip"
type: feat
status: active
date: 2026-03-23
origin: docs/brainstorms/2026-03-23-dealer-selection-animation-brainstorm.md
---

# feat: Dealer Selection Card Reveal Animation & Dealer Chip

## Overview

Two improvements to the dealer experience: (1) an animated card reveal sequence during `dealer_selection` phase showing drawn cards one by one with a highlighted winner, and (2) a permanent casino-style dealer chip on the current dealer's avatar.

## Proposed Solution

### Task 1: Dealer Selection Card Reveal

**New component:** `DealerSelectionReveal.tsx` in `packages/web/src/components/game/`

The component receives `serverState.current_trick` (drawn cards as `{ player, card }[]`) and `serverState.dealer` (winner position). It orchestrates a client-side staggered animation sequence:

1. Cards appear one by one (~500ms apart) in a horizontal row in the center area
2. Each card shows the player name/position label above it
3. After all 4 cards visible (~2s in), the winning card gets a gold highlight ring + scale bump
4. Hold highlight for ~1.5s
5. Fade out all cards together
6. Total: ~4-5 seconds

**Data flow:**
- `serverState.current_trick` contains all 4 drawn cards at once (server sends complete state)
- `serverState.dealer` indicates the winner (may arrive in same or subsequent state update)
- All timing/stagger is client-side via `useState` + `useEffect` + `setTimeout`

**Integration point:** `CenterContent` in `GameTable.tsx` — add a new early-return branch before the `phaseLabels` fallthrough:

```tsx
// GameTable.tsx CenterContent, before phaseLabels fallthrough
if (phase === "dealer_selection") {
  return (
    <DealerSelectionReveal
      currentTrick={serverState.current_trick ?? []}
      dealer={serverState.dealer ?? null}
      viewerPosition={viewModel.viewerPositionAbsolute}
    />
  );
}
```

**Animation approach:**
- Use `useState` to track `visibleCount` (0 → 4) and `highlightWinner` (boolean)
- `useEffect` with chained `setTimeout` to increment `visibleCount` every 500ms
- Once all visible + `dealer` is set, trigger `highlightWinner` after a short pause
- Each card uses existing `Card` component with `size="md"`
- Winner card gets a custom className: `ring-2 ring-amber-400 scale-110 transition-all`
- Cards that haven't appeared yet render as invisible placeholders (fixed-width) to prevent layout shift
- Fade-out: after highlight hold, apply `opacity-0 transition-opacity duration-500` to the container

**New CSS keyframe** (add to `index.css`):

```css
@keyframes dealer-card-appear {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.8);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.animate-dealer-card-appear {
  animation: dealer-card-appear 0.35s ease-out forwards;
}
```

### Task 2: Dealer Chip on Avatar

**Modify:** `GamePlayerCard.tsx` — render a casino-style chip when `isDealer` is true.

The avatar `<div>` needs to be wrapped in a `relative` container. The chip is an `absolute`-positioned element at the top-right corner:

```tsx
// Inside GamePlayerCard, wrap the avatar:
<div className="relative">
  {avatar}
  {isDealer && (
    <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-amber-300/80 bg-amber-500 text-[8px] font-black text-white shadow-sm">
      D
    </div>
  )}
</div>
```

**Wire isDealer in GameTable.tsx:**

Add to `avatarProps()` helper (line ~58):
```tsx
isDealer: viewModel.dealerAbsolute === player.absolutePosition,
```

Same expression already used in `handProps()` at line 103 — consistent pattern.

**Wire isDealer in GamePlayerCard.tsx:**

Add `isDealer = false` to the destructured props (currently declared in interface but not destructured).

## Acceptance Criteria

- [ ] During `dealer_selection`, drawn cards appear one by one in the center with ~500ms stagger
- [ ] Player position label shown above each drawn card
- [ ] Highest card (dealer winner) gets gold highlight after all cards are visible
- [ ] Cards fade out after ~1.5s highlight hold
- [ ] Total animation sequence is ~4-5 seconds
- [ ] No layout shift during the reveal (fixed-width placeholders)
- [ ] Casino-style "D" chip shown on dealer's avatar at all times when dealer is set
- [ ] Dealer chip visible for all 4 positions (N/E/S/W) — whoever is dealer
- [ ] Chip uses amber/gold color scheme consistent with existing game theme
- [ ] `isDealer` wired through `avatarProps()` in GameTable

## Files to Modify

| File | Change |
|------|--------|
| `packages/web/src/components/game/DealerSelectionReveal.tsx` | **NEW** — card reveal animation component |
| `packages/web/src/components/game/GameTable.tsx` | Add `dealer_selection` branch in `CenterContent`, add `isDealer` to `avatarProps()` |
| `packages/web/src/components/game/GamePlayerCard.tsx` | Destructure `isDealer`, render dealer chip badge on avatar |
| `packages/web/src/index.css` | Add `dealer-card-appear` keyframe animation |

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-03-23-dealer-selection-animation-brainstorm.md](../brainstorms/2026-03-23-dealer-selection-animation-brainstorm.md) — client-side stagger, relaxed timing, casino chip style
- Existing animation patterns: `packages/web/src/index.css:567-625` (card-enter-*, trick-win-flash)
- CenterContent phase routing: `packages/web/src/components/game/GameTable.tsx:329-420`
- GamePlayerCard isDealer prop: `packages/web/src/components/game/GamePlayerCard.tsx:9`
- avatarProps helper: `packages/web/src/components/game/GameTable.tsx:58-72`
- ServerGameState type: `packages/shared/src/types/game.ts:44-76`
