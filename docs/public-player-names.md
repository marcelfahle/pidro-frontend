# Public player names (PID-96)

The canonical public name is **username**, on every platform and surface.
`display_name` remains stored profile metadata; it is not a public-name fallback.
This includes guest accounts: they display their generated `guest_…` username.

- User IDs identify accounts and own seats, profiles and reconnect rights. Never
  use a name as an identity key or show a raw ID as a missing-name fallback.
- Wire `username` means the account username. Wire `display_name` means the
  stored display name, including null. Do not copy either field into the other.
- Lifecycle decision `player_name` and invite-preview host labels use username.
- `invite_redeemed` includes both `username` and `display_name`; notifications use
  username. Old events without username trigger a refresh without a named toast.
- Shared `publicPlayerName` supplies a neutral missing-name label, never a
  display name. Existing bot labels remain `Bot`.
- Lifecycle seats also carry authoritative `avatar_url` (including explicit
  null). Observers must restore it from the event after leave/rejoin rather than
  depending on a lobby/REST refresh or a previous occupant's cached picture.
  Clients retain ID-matched cached avatars only for older payloads that omit the
  field. Repeated leave/rejoin cycles and explicit avatar removal are covered.

Ship the backend contract fix with the clients. Old servers that put display
names into `username` cannot be corrected reliably by a client without inventing
identity. No migration, user rename or stored-value cleanup is required.

## Investigation and regression coverage

The reported `mfios1`/`iOS 1`, `mfand1`/`Android 1`, `mfios2`/`iOS 2` and
`mfweb1`/`Web 1` mismatch is reproduced as distinct fields in shared fixtures.
Coverage crosses REST/lobby normalization, readiness, lifecycle, spectator/player
hydration, disconnect, bot takeover, reconnect, replacement and stale refreshes.
Null/blank, edited, Unicode and matching display names must not affect usernames
or IDs. Profiles and waiting-room event consumers have focused tests too.

Backend seed/script and full repository-history searches found no `mfios1` or
`mfand1` creation records. Frontend occurrences are regression fixtures, not
account provisioning. Registration and guest creation accept display names,
but that alone does not establish the origin of these particular stored values.
Their actual creation/import origin remains unconfirmed; no account data was
changed as a workaround.
