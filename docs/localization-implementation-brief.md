Implement the complete English/Swedish app experience in the attached contract.
Work in `marcelfahle/pidro-frontend`, branch `feat/english-swedish-localization`.
Do the implementation, tests, review fixes and PR; do not stop after a plan.

Read packages/mobile/AGENTS.md, packages/mobile/src/design/README.md,
packages/mobile/docs/design/README.md, packages/mobile/docs/FIXTURE-ROUTES.md,
packages/mobile/TESTING.md and the existing test scripts before editing.
The branch contains docs/reference/unity-localization/{English,Swedish}.txt:
these are the real original catalogs, already audited for a few known issues.
Use them as the language reference and document provenance/corrections.

Design first, using v2:
- Produce a small design/spec board using the existing docs/design source/boards
  workflow and existing primitives. Show settings in English and Swedish in
  portrait/landscape, language selection, and representative long Swedish game
  labels. Keep artifacts in the PR, then implement the reviewed-by-you result.
- Language is one row/group inside the existing Settings window, labelled
  Language / Språk, with System language / Enhetens språk, English, Svenska.
  Use the existing v2 selectable-control pattern (inspect RuleSetSelector and
  settings controls): glass/inset surface, visible selected state plus accessible
  radio/selected semantics. All three choices must fit or wrap/stack naturally.
  No flags, native segmented styling, extra hero CTA or save/restart step.
- Apply immediately; when system is selected show its resolved language as quiet
  metadata. Display English and Svenska as autonyms in both locales. Match the
  existing ScreenShell/ScreenHeader/Surface/PidroText/PressableFX primitives,
  type roles/tokens, safe areas and tab clearances. No raw styles/colors to invent
  a new look. Never shrink Swedish text merely to preserve an English width.
- Include reachable fixtures for each language and selection state; render
  deterministic locale overrides only in development fixture routes, not normal
  user navigation. Extend UI grammar checks and intentional baselines.

Implement the entire current app journey, not just existing translation keys:
auth/guest/Classic recovery, home/lobby/create/join, invites/share, friends,
waiting table, bidding/trump/card/dealer selection, status/canvas/notices/results,
rematch, profile/settings/account/update notices, rules/help and accessibility.
Audit shared helpers, module-level constants, errors, date/number formatting,
visible switch On/Off labels, and Skia text measurements. Keep English meaning
and current behavior. Full sentence interpolation and real plural forms.
Do not blindly copy outdated Unity tutorial rules or old account flows.

Add minimal typed translation keys, reactive locale subscriptions and shared
catalogs without component remounts or a dependency overhaul. Locale changes must
also update memoized view models and current notices. Keep event identities/data
stable, translate at presentation boundaries. Avoid stale module-scope t() calls.
Ensure server-derived data rather than client calculations still drive the game.

Error contract integration: use gh to read docs/contracts/localization-errors.json
from marcelfahle/pidro-backend at feat/localized-error-contract once available.
Work independently on UI first; then align error coverage with the real manifest,
not guessed codes. Backend orb is working in parallel. Commit tests for old/new
server compatibility and translate legacy uncoded failures via safe fallbacks.

Native localization: expo-localization is already installed. Inspect app config;
add en/sv supported locale and relevant permission-copy declarations if absent,
without new native dependencies. Document clearly if these declarations require
an upcoming native build and what works over OTA. Do not run a release build.

Validation from root: bun install as needed; bun run shared:build;
bun run test:unit; in packages/mobile bunx tsc --noEmit and bun run lint.
Also run packages/web build to protect shared consumers. Run focused behavior
and UI grammar tests, current Frontend CI and affected game/account e2e paths.
Use Expo web without CI=1 and enough heap as documented in existing scripts.
Baseline refresh must retain only intentionally changed screenshots.
Put English/Swedish screenshots, design artifact paths, checks, source-translation
mapping, outstanding language-review terms and native checks in the PR.
Keep the PR draft until implementation/checks are complete, then leave it open
for Marcel's review. Do not merge/deploy/OTA. Keep rebased per contract.
