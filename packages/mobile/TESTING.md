# Pidro Mobile Testing

## Test accounts

These are throwaway local-development accounts already used by the mobile test scripts:

| Username    | Password     | Typical use                   |
| ----------- | ------------ | ----------------------------- |
| `mf2`       | `hallohallo` | Browser smoke test            |
| `skiatest1` | `hallohallo` | Default full-game autoplay    |
| `skiatest2` | `hallohallo` | Second multiplayer client     |
| `skiatest3` | `hallohallo` | Additional multiplayer client |

The accounts must exist on the backend selected by the test command. As of July 19, 2026, these username/password combinations are not valid in production; use an existing production account or intentionally register a dedicated production test account there.

## Daily development against production

Run the mobile UI locally while using the production API and game population:

```bash
# From the repository root
just mobile-prod

# Equivalent command from packages/mobile
bun run start:prod
```

This needs only one terminal; a local Phoenix server is not required. Manual actions still write to production, so use a dedicated production account. Do not point `test:smoke` or `autoplay-full-game.mjs` at production unless you intentionally want them to create rooms, leave rooms, and play games there.

To switch back to a local backend, run `just env-lan` from the repository root, start Phoenix with `just backend` in one terminal, and restart Metro with `just mobile` in another.

## Useful commands

From `packages/mobile`:

```bash
# Visual fixture, no login or backend required
bun run web
# Then open /table-dev?phase=bidding

# Browser/API smoke test. Defaults to mf2 against localhost:4000.
bun run test:smoke

# Full bot game. Defaults to skiatest1 against localhost:4001.
bun scripts/autoplay-full-game.mjs

# Choose another test account or backend.
API_BASE_URL=http://127.0.0.1:4000 \
WS_BASE_URL=ws://127.0.0.1:4000/socket \
bun scripts/autoplay-full-game.mjs --user skiatest2
```
