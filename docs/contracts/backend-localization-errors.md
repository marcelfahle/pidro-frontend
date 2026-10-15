# Backend error snapshot and frontend adapter

`backend-localization-errors.json` is an unmodified backend v1 manifest fetched
via `gh api repos/marcelfahle/pidro-backend/contents/docs/contracts/localization-errors.json?ref=6900a3270254c1d034f3a3c13d76a85efcc33c4e`
on 2026-10-15, after backend PR #94 merged to main. It is byte-identical to the
previous feature-branch snapshot at `95109262735cf97dba27665ad7669eb17f137d35`.
SHA-256 of the decoded JSON:
`70be059d98ab860cdadad36d848bc3f3a592e062109ada971b7d15b68704321b`.

Coverage: all **119 codes** in English and Swedish, including all five
parameterized codes (six required integer parameters). Contract tests compare
the exact catalog key set and placeholder names to the snapshot.

This snapshot includes PID-225's block routes (`GET /api/v1/blocks`,
`PUT /api/v1/blocks/:user_id`, `DELETE /api/v1/blocks/:user_id`),
`cannot_block_self`, `player_not_in_room`, `seat_not_controlled`, and
`invalid_locked`. `profile_unavailable` describes eligibility checks, including
auth, not only completed-game counts. The exact Classic code is
`invalid_claim_ticket` / legacy `INVALID_CLAIM_TICKET`; the never-shipped
`claim_ticket_invalid` spelling is deliberately not an alias.

Shared `localizedError(error, fallback = 'error.request_failed')` accepts Axios
errors, plain channel replies, and Error wrappers with the original payload in
`cause`. Structured `error_code` wins; unknown codes and invalid/missing params
use the caller's translated context fallback. `code`/`params`, explicit stable
legacy uppercase identifiers and exact known snake_case identifiers support old
servers. No English sentence matching or slugification is used. Only required,
nonnegative safe integers reach interpolation; extra params are discarded.
`localizedFieldErrors` reads the manifest's parallel field array and preserves
legacy field-map identities with a translated generic validation message.

Mobile re-exports both helpers. `apiErrorInfo` retains legacy code casing,
action, detail and seat requirement behavior for control flow; `detail` is not a
localized presentation API. Existing REST rejections and channel action
`reject(error)` already preserve entire payloads, so no wrapping changes were
needed. Any future Error wrapper must retain the payload in `cause` rather than
constructing an Error from its reason string alone.

Translation provenance: new error sentences follow the manifest's meanings,
not its internal implementation descriptions. Unity reference files under
`docs/reference/unity-localization` supply **bud** (bidding), **färg** (suit),
and **givare** (dealer). Do not copy Unity's mixed-English score-error strings,
its inconsistent “sort” for suit, or Finnish-contaminated labels. Human Swedish
review remains necessary, especially trump-killing, bot and rematch terminology.

Limitations: no UI surface changes here; callers must adopt the helpers and
subscribe to locale changes. Old uncoded English errors cannot be translated
specifically without guessing, so deliberately receive generic translated copy.
Socket rejection/empty avatar 404 and other backend gaps remain as documented
in the snapshot. No native/device or live-backend end-to-end checks are claimed.

Checks: `bun test packages/shared/test/error-contract.test.ts
packages/mobile/test/channels/apiErrors.test.mjs`, `bun run shared:build`.
