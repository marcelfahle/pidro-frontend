# Brainstorm: Dealer Selection Animation & Dealer Chip

**Date:** 2026-03-23
**Status:** Ready for planning

## What We're Building

Two improvements to the dealer experience:

### 1. Dealer Selection Card Reveal

During the `dealer_selection` phase, four cards are drawn (one per player) to determine who deals. Currently this shows static text ("Selecting dealer...") with status labels on avatars. Instead:

- Show all 4 drawn cards in the center of the table, appearing **one by one** with ~500ms stagger
- Cards appear in player order (N, E, S, W or however server orders them in `current_trick`)
- After all cards are visible (~2s in), **highlight the highest card** (glow/scale/ring)
- Hold the highlight for ~1.5s so the player registers who won
- Fade out all cards together
- Total sequence: ~4-5 seconds, relaxed pace

**Data source:** `serverState.current_trick` contains all drawn cards as `{ player, card }[]` during this phase. `serverState.dealer` is set once the winner is determined. All data arrives at once from the server; animation timing is purely client-side.

### 2. Dealer Chip on Avatar

A small casino-style poker chip indicator next to the dealer's avatar, shown at all times during all phases (not just during dealer selection).

- Small circular chip with "D" or a dealer icon
- Positioned at a corner of the avatar (e.g. top-right or bottom-right)
- Visible for all 4 player positions (N/E/S/W) — whoever is dealer gets it
- Uses `viewModel.dealerAbsolute` to determine which player is dealer

**Existing code:** `isDealer` prop already exists on `GamePlayerCard` interface but renders nothing. We just need to wire it up and add the visual.

## Why This Approach

- **Client-side stagger** is the standard pattern for card games — server delivers state, client handles presentation timing. Keeps concerns separated.
- **Relaxed pacing (4-5s)** matches the social/casual feel of Pidro. Too fast feels robotic; too slow feels sluggish.
- **Casino chip** is universally recognized as a dealer indicator. Players from any card game background will understand it instantly.

## Key Decisions

1. **Animation is client-only** — server sends all cards at once, we stagger reveal with `setTimeout`/CSS delays
2. **Cards show in center area** — reuse the center content area where "Selecting dealer..." currently appears
3. **Relaxed timing** — ~500ms between cards, ~1.5s highlight, ~4-5s total
4. **Casino-style dealer chip** — small "D" chip on avatar corner, always visible when dealer is set
5. **`isDealer` prop already exists** — just needs to be passed in `avatarProps()` and rendered in `GamePlayerCard`

## Scope

### In Scope
- New `DealerSelectionReveal` component for the card animation sequence
- Dealer chip badge in `GamePlayerCard`
- Wire `isDealer` through `avatarProps()` in GameTable

### Out of Scope
- Server-side timing changes
- Sound effects
- Card flip animations (cards appear face-up, not flipped)
