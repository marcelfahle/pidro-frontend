# Profile editing (PID-76 / PID-77)

Web and Expo use the shared `createProfileApi` contract. Profile edits are available to authenticated registered players and invite-created guests; guest upgrades keep the same account and fields.

## Photos

- Choose, preview the centered square/circular framing, then explicitly save. Cancel leaves the saved photo untouched. A failed upload keeps the draft for retry. Remove returns to the existing fallback.
- Browser uploads accept JPEG/PNG up to 5 MiB. Native photo-picker output is converted to JPEG and resized to at most 1024 pixels on the longer edge before upload, including device-supported HEIC inputs. The server independently decodes, applies orientation, strips metadata, crops and re-encodes a 256×256 JPEG (maximum 64 KiB). Native picker changes require a new app binary, not just an OTA update.
- The backend stores one normalized thumbnail per account in PostgreSQL, with atomic replacement and deletion cascades. No object-store credentials or persistent upload directory are required. See backend `docs/avatars.md` for limits and cache semantics.
- Save/remove updates local account state immediately. The backend republishes existing lobby `room_updated` snapshots after commit. Both game clients retain the lobby subscription and merge identity fields by player ID without resetting game state, seat status, turn rings, or timers. Explicit `null` removes the photo. REST snapshots and profile reads recover from missed events; mobile home/profile refresh on focus and web profile/home fetch on entry.

## About me

- Bios are plain text, at most 280 Unicode scalar values, not UTF-16 units or grapheme clusters. Some emoji count as multiple characters. No rich text, linkification, or HTML rendering.
- Normalize CRLF/CR to LF, then trim only U+0009–000D, U+0020, U+00A0, U+1680, U+2000–200A, U+2028–2029, U+202F, U+205F, U+3000, and U+FEFF at either edge. Preserve internal whitespace/newlines and normalization forms. U+0085 and U+200B are not trimmed. NUL and malformed Unicode are rejected.
- Count the normalized draft without modifying it while typing. Empty save clears to `null`. Cancel discards the edit; network errors preserve it. Successful saves update the profile/account cache.
- Clicking a human avatar in a web lobby/table, or a human identity in a mobile lobby/waiting table, opens a read-only profile without leaving the game. The authenticated public-profile response is exactly `user_id`, `username`, `display_name`, `avatar_url`, and `bio`; it never contains email or account credentials. Profiles are fetched each time the viewer opens them, not live-broadcast while a bio is being written.

## Mobile editing experience

- Uses the native home-screen grammar: shared header, semantic surfaces and text, quiet editing/account actions, and gold Save buttons. Technical guidance appears only where needed.
- At the shared 640-point width breakpoint, identity/photo and bio form top-aligned columns within the 880-point content limit; account actions sit below identity. Narrow iPad split views return to the phone stack. Larger system text raises the column breakpoint. Short windows use a smaller avatar and three-line bio editor, without shrinking touch targets or resetting drafts.
- One inline editor is active at a time. Switching or navigating back with changes asks before discarding; explicit Cancel discards immediately. Navigation and account actions cannot interrupt an in-flight operation. Photo removal and sign-out have explicit confirmations.
- Errors and saved feedback belong to the edited section. Bio edits clear stale server errors, unchanged drafts cannot be submitted, and rotation keeps draft state above the keyboard-aware shell. Changing accounts resets the editor.
- Drafts are transient; app termination or reload does not preserve them.

## Verification

- From `packages/mobile`, `MOBILE_BASE_URL=<Expo URL> node scripts/verify-profile.mjs` exercises the actual Expo profile route with stubbed API responses: phone portrait/landscape (including 667×375), iPad portrait/landscape/Pro and narrow split view, 44-point controls, validation, retry, navigation guards, clear, photo drafts and confirmations. Set `UI_SHOT_DIR` to capture screenshots. This is React Native's browser renderer, not the separate web client or a native-device test.
- `bun test packages/shared/test packages/mobile/test` covers normalization, Unicode boundaries and room identity refresh.
- `bun --cwd packages/web test` covers avatar preview/cancel/retry/removal/fallback and bio editing/validation/clear/plain-text public viewing.
- Backend controller/context tests cover authorization, privacy, persistence, replacement failure, normalization and cleanup.
- Browser checks exercised web and the exported Expo client against the local backend: the same account's saved photo/bio, Expo file-picker preview/save/remove, failed bio save with retry, another account's live table avatar update, and read-only profile viewing.
- Native iOS/Android photo-picker permissions, device HEIC decoding and camera orientation still require physical-device or simulator QA; browser checks do not establish those platform-specific results.
