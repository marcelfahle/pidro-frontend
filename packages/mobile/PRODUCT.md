# Pidro Mobile — Product Context

## Register

product

## What it is

The native (React Native / Expo + Skia) client for Pidro, a four-player partnership trick-taking card game popular in Finland/Ostrobothnia. This app replaces a legacy Unity app whose look is the beloved reference: `screenshots/pidro_web/*.png` at the repo root is the visual target the team matches deliberately.

## Users

Existing Pidro players migrating from the legacy app (broad age range, many older casual players) plus new mobile players. They play in short sessions, often one-handed in portrait or two-handed in landscape. Familiarity with the old table matters more than novelty: returning players should feel "this is my Pidro, but nicer."

## Tone & brand

Warm casino-lite: deep blue felt, gold/brass plaques, glassy cyan accents, white playing cards. Celebration moments (game over, level-ups) go "party, think UNO": chunky solid colors, pills, confetti energy. Everything else stays calm so cards stay the hero.

## Anti-references

- Generic flat SaaS styling; gray-on-gray minimalism.
- Glassmorphism as a default surface treatment (user explicitly rejected "too glassy").
- Neon cyberpunk / poker-app noir.
- Decorative outlines as affordances (rejected: yellow outlines around playable cards).

## Strategic principles

1. Parity first: when in doubt, match the original screenshots (landscape reference).
2. The table is a stage: chrome disappears in landscape; cards and felt carry the scene.
3. Affordances are physical: playable cards lift and stay bright; unplayable cards fall into shadow.
4. Both orientations are first-class (844x390 and 390x844 are the check sizes).
