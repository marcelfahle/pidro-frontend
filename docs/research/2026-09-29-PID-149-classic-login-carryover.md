# PID-149: Classic login carryover

- Date: 2026-09-29
- Status: research spike; no production code
- Timebox: one day

## Verdict

| Platform | Read and decrypt Classic credentials?                                                                                                 | Remaining device proof                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| iOS      | **Yes.** The replacement can target the confirmed Unity `PlayerPrefs` keys through `UserDefaults` and reproduce Classic's decryption. | Confirm that a genuine App Store/TestFlight overwrite preserves the values.                   |
| Android  | **Yes.** The replacement can target the confirmed keys through `SharedPreferences` and reproduce Classic's decryption.                | Confirm update survival and which Unity preference filename the installed Classic build uses. |

The Classic Unity source resolves the main technical unknown. The recommended product flow is viable on both platforms, subject to one physical overwrite test per platform and server-side validation of every recovered credential.

Use two verification routes, in this order:

1. A recovered `facebooktoken` can use the existing `/api/v1/classic/verify` Facebook method. This is the cheapest path and needs no new Classic endpoint.
2. Otherwise, decrypt `EncryptedRefreshToken` and validate it through the proposed Classic `/internal/claims/verify_session` endpoint.

Never treat local presence or successful decryption as proof of account ownership. The compiled key is reproducible and AES-CBC does not authenticate its ciphertext. Proof comes only from Facebook or the Classic server validating the recovered token.

## Confirmed Classic implementation

The private Classic Unity 6 source (`Assets/Scripts/APIs/SecureTokenStorage.cs`, added 2024-08-15, and `ApiManager.cs`) confirms these ordinary Unity `PlayerPrefs` entries:

| Key                     | Stored value                                          | Migration use                                                |
| ----------------------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| `EncryptedAccessToken`  | Base64 of an encrypted Classic Guardian access token  | Presence/diagnostic only; do not use as claim proof.         |
| `EncryptedRefreshToken` | Base64 of an encrypted Classic Guardian refresh token | Decrypt in memory, then send for server validation.          |
| `facebooktoken`         | Raw Facebook access token                             | Send to the existing Classic verification method `facebook`. |

There is no Keychain, Android Keystore, or third-party secure-storage plugin in this implementation. “Plain PlayerPrefs” describes the storage mechanism: the Guardian tokens inside it are encrypted as described below, while `facebooktoken` is not.

Classic writes Guardian tokens as:

```text
UTF-8 token bytes
  → AES-256-CBC with PKCS7 padding
  → Base64 text
```

The AES key is the 32-byte SHA-256 digest of **the Classic build constant, taken from the Unity source at build time**. Classic passes the constant to C# `Encoding.Unicode`, which is UTF-16LE, before hashing it. The IV is 16 zero bytes. The replacement reverses that transform: Base64-decode, decrypt with the digest key and zero IV, remove PKCS7 padding, then decode the token as UTF-8.

Do not put the constant, the derived key, or test vectors containing real tokens in this repository, a PR, build output, logs, analytics, or crash reports.

`ApiManager.RefreshToken()` calls `/v3/refresh_token` when an API request receives a 401 and saves a rotated refresh token when Classic returns one. Active players are therefore more likely to have a still-valid refresh token than the nominal 30-day lifetime alone suggests. Validation by Classic remains authoritative.

The source date does not establish that every installed historical build contains this storage implementation. Older PHP-era or pre-August-2024 installations are outside the confirmed format until observed or upgraded.

## Storage across an in-place update

### iOS

Unity implements iOS `PlayerPrefs` with standard `NSUserDefaults`. Its persistent app domain is conventionally stored under `Library/Preferences/<bundle>.plist`. Apple preserves the app's `Library` directory, except `Library/Caches`, when updating an app in place. The replacement should use `UserDefaults`, never a saved absolute plist path.

The production replacement must have the same effective application identity as Classic: bundle ID `com.oneapps.pidro`, Apple team `LSFK7YF82G`, and an update-compatible signature. The default Beta (`com.oneapps.pidro.beta`) and development app are separate sandboxes and cannot read Classic's preferences.

Because Classic does not use Keychain for these tokens, Keychain access groups and migration behavior are irrelevant to this feature.

### Android

Unity implements Android `PlayerPrefs` with app-private `SharedPreferences`. Current Unity documentation names:

```text
com.oneapps.pidro.v2.playerprefs.xml
```

Older Unity documentation names:

```text
com.oneapps.pidro.xml
```

The migration module should make targeted reads from both stores, passing the names without `.xml` to `getSharedPreferences`:

```kotlin
context.getSharedPreferences("com.oneapps.pidro.v2.playerprefs", Context.MODE_PRIVATE)
context.getSharedPreferences("com.oneapps.pidro", Context.MODE_PRIVATE)
```

The physical-device test determines which filename the currently distributed Classic app uses. Production can then retain only the observed store if supported-version evidence makes the other unnecessary.

Android keeps app-private data during a valid package update and removes it on uninstall or Clear storage. An update requires the same package, `com.oneapps.pidro`, and a compatible app-signing certificate. With Play App Signing, Google—not the upload key—signs delivered APKs with the app-signing key. The faithful test therefore needs an internal track on Classic's existing Play listing.

## Expo implementation shape

Use a small local Expo native module rather than a generic preference dependency. It requires a new native binary; Expo Go and an OTA update cannot add it.

Expose one narrow operation that returns sanitized results for exactly these keys:

- `EncryptedAccessToken`
- `EncryptedRefreshToken`
- `facebooktoken`

The native implementation should:

- read `UserDefaults.standard` on iOS;
- read the two named Unity stores on Android until the device test identifies the real one;
- decrypt only the two encrypted token fields with the confirmed Classic transform;
- keep recovered credentials in memory only long enough to call the backend; and
- expose fixed key/store labels plus presence, native type, and sanitized decode/decrypt status to a diagnostic screen.

Do **not** expose enumeration, `getAll()`, arbitrary-key getters, raw values, ciphertext, plaintext, token length, token hashes, decoded JWT claims, or token-bearing exception messages. A purpose-built module is smaller and safer than a generic dependency and needs no config plugin merely to call these native APIs.

## Verification routes

| Recovered value                   | Route                                                                  | Result                                                                                                                                                                          |
| --------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `facebooktoken`                   | Existing `POST /api/v1/classic/verify` with method `facebook`          | Existing Classic preview and claim ticket. No Classic server change. The token may be expired or revoked and must pass the existing Facebook verification and account matching. |
| Decrypted `EncryptedRefreshToken` | New backend method backed by Classic `/internal/claims/verify_session` | Same Classic preview and claim ticket after complete Guardian refresh-token validation.                                                                                         |
| Decrypted `EncryptedAccessToken`  | None                                                                   | Do not use it as refresh-session or Facebook proof. Its presence can help diagnose migration state without exposing its contents.                                               |

If both usable Facebook and refresh credentials exist, prefer Facebook. It avoids new Classic API work and can establish the same durable Facebook identity during the continuation flow. Any mismatch, ambiguity, expiry, or validation failure falls back to the normal Apple, Facebook, or email/password choices.

## Device test for Marcel

These tests no longer discover keys or prove the cryptography. They prove only that a genuine store update preserves the confirmed entries and, on Android, which PlayerPrefs filename is in use.

Use disposable Classic accounts on physical devices. Do not uninstall Classic or clear storage after seeding it.

### Diagnostic build

1. Add the targeted local module above behind a diagnostic-only build flag. Show only each fixed key's presence/type and sanitized decode/decrypt status; never show or log values.
2. Build the production variant with package/bundle ID `com.oneapps.pidro` and a version/build number higher than installed Classic.
3. Keep the diagnostic out of the normal production update channel.

### iOS overwrite

1. Install current Classic from the App Store on a physical iPhone, sign in to a disposable account, make an authenticated request so any refresh path can persist its latest tokens, and do not sign out.
2. Deliver the diagnostic as an update through the same App Store Connect record—preferably internal TestFlight—signed by team `LSFK7YF82G`. If it installs as a second app or requires deleting Classic, stop.
3. Launch it and record only build/platform metadata and the three fixed keys' presence/type/decode status.
4. Pass when the expected stored entries survive the overwrite and report the expected type and decode/decrypt status. Credential validation is a separate server acceptance test.

### Android overwrite

1. Install current Classic from Google Play on a physical Android device, sign in to a disposable account, make an authenticated request, and do not sign out.
2. Upload a higher-`versionCode` diagnostic AAB to an internal test track of the existing Classic Play app and let Play deliver the update. A local debug/upload-key APK is not equivalent. If Play does not offer **Update**, stop.
3. Target-read the three fixed keys from `com.oneapps.pidro.v2.playerprefs` and `com.oneapps.pidro`. Record only which fixed store contains them and their presence/type/decode status.
4. Pass when the store filename is identified and the expected entries survive with the expected type and decode/decrypt status. Credential validation is a separate server acceptance test.

Repeat a platform test only if coverage of signed-out behavior is needed; it is not necessary for key discovery. Never use Classic's token logs as a test mechanism.

## Refresh-session server sketch

The Facebook route requires no server change. For a recovered refresh token, add this internal-only Classic endpoint:

```text
POST /internal/claims/verify_session
Authorization: Bearer <existing Classic internal shared secret>
Content-Type: application/json

{"refresh_token":"<Classic Guardian refresh JWT>"}
```

On success, return the same normalized profile envelope as `/internal/claims/lookup` and `/internal/claims/verify_password`:

```json
{ "classic": { "id": 123, "username": "Bengt", "games": {}, "premium": {} } }
```

The Classic endpoint must:

- accept only a bounded-size refresh token, never a `DeviceId`, user ID, or access token;
- perform complete Guardian refresh-token validation, including signature/algorithm, expiry, token type, subject, configured issuer/audience, and existing revocation/session rules;
- derive the account only from the verified subject and reject missing or inactive accounts;
- reuse the lookup serializer so the preview shape stays identical;
- require the existing internal bearer authentication and TLS; and
- never log, echo, or persist the refresh token.

The new backend can add `method: "session"` to `/api/v1/classic/verify`. `ClassicClient.verify_session/1` calls the internal endpoint, after which `ClassicVerification` reuses its existing normalization, preview, and short-lived claim-ticket path.

Implementation must cover the complete method dispatch and persistence constraints, not merely add an enum value: providerless session validation, account creation/selection, availability and link attributes, errors, OpenAPI, rate limits, bounded input, and tests. Add `refresh_token` to Phoenix, HTTP-client, monitoring, analytics, and crash-report redaction; it is not currently in Phoenix's filter list.

Security review conclusion: this design is acceptable only because the Classic server—not local AES decryption—validates the Guardian token. A zero IV and unauthenticated CBC are legacy weaknesses, and a constant embedded in an app is extractable. Do not add local JWT trust or accept a bare Classic ID as a shortcut.

## Claim-ticket and account lifecycle

The existing claim ticket remains the correct bridge: random, hash-only at rest, ten-minute expiry, and bound to one current user or install ID. Treat it as a credential.

Persist the original ticket securely before redemption. Retain it and the legacy credentials until redemption succeeds and the new session is durably stored. If a redemption response is lost, retry the **same ticket with its exact original binding** before expiry:

- a user-bound ticket must be retried as the same authenticated user;
- an install-bound ticket must use the exact original install ID.

Signing in during the continuation must not silently convert or rebind an issued ticket. Re-validating the old refresh token after claim commit may produce a fresh ticket, but that ticket cannot recover the already-linked new account. If the original ticket is lost or expires, the player must use the durable sign-in established for that new account.

After successful redemption and durable storage of the new session, delete only the three confirmed legacy credential keys and the saved migration ticket—not the whole preference domain.

**Recommendation: option 1.** After “Welcome back, Bengt”, Continue should finish with Apple, Facebook, or email/password so the resulting new account gains a durable sign-in in the same flow. If recognition used `facebooktoken`, continuing with Facebook can establish that durable identity without another claim method selection. Apple and email/password remain available for the refresh-session path and as fallbacks.

This preserves recovery after a new phone, reinstall, or lost redemption response without creating a device-session-only account model. Do not infer Apple/Facebook ownership from Classic profile fields, silently merge an already-claimed account, or promise passwordless email behavior that the current contracts do not provide.

“Not you?” should discard the preview/ticket and suppress immediate rediscovery. Product must decide whether it also deletes the saved Classic credential; deleting it prevents this device from offering carryover again.

## Reach and exclusions

This can reach veterans who:

- receive the new app as an in-place update on the same installation;
- have one of the three confirmed PlayerPrefs entries from a supported Classic build; and
- have a Facebook or refresh token that still passes authoritative validation.

Active players may have recently rotated refresh tokens because Classic refreshes after a 401. It still cannot reliably reach:

- players whose Facebook and refresh tokens are expired, revoked, malformed, or absent;
- players who signed out and had credentials removed or invalidated;
- players who uninstalled Classic, cleared app data, installed Beta beside Classic, or moved to a new phone;
- older installs that never received the confirmed 2024 storage implementation or use an unknown PHP-era format;
- installations that cannot be updated under the same package/bundle identity and signing lineage; or
- already-claimed accounts whose durable new-account sign-in is unavailable.

Do not estimate a percentage of the 73,000 accounts from current evidence. The upper bound is reduced first by same-install updates, then by supported persisted credentials, then by token validity. Production instrumentation should report only aggregate route/success/fallback reasons, never keys, tokens, account identifiers, or tickets.

## Follow-up acceptance cases

- One genuine iOS and Android overwrite retains the expected fixed keys; Android identifies the preference filename.
- Valid Facebook and refresh-token cases reach the expected Classic preview and ticket without exposing credentials.
- Missing, wrong-type, malformed, expired, revoked, wrong-token-type, inactive, and mismatched-account cases fail closed to normal claim choices.
- Wrong ticket binding, account switching, duplicate/concurrent redemption, and already-claimed accounts preserve current one-to-one ownership rules.
- A lost redemption response retries the retained original ticket and exact binding; an expired/lost post-redemption ticket falls back to the established durable sign-in.
- Logs, traces, analytics, crash reports, and errors contain no recovered credentials, decrypted claims, claim tickets, or token-bearing exceptions.

## Classic hygiene issue

Classic's `SaveTokens` currently sends both tokens to `Debug.LogError`. This should be removed from any remaining Classic release because device and collected logs may expose live credentials. Do not use it for migration diagnostics. This issue does not change the carryover protocol above.

## Sources

- Classic Unity 6 private source review: `Assets/Scripts/APIs/SecureTokenStorage.cs` and `ApiManager.cs`.
- [Unity `PlayerPrefs` documentation](https://docs.unity3d.com/6000.6/Documentation/ScriptReference/PlayerPrefs.html) — current platform stores and Android `.v2.playerprefs.xml`.
- [Unity 2019.4 `PlayerPrefs` documentation](https://docs.unity3d.com/2019.4/Documentation/ScriptReference/PlayerPrefs.html) — historical Android `<package>.xml` documentation.
- [Apple TN2285: Testing iOS App Updates](https://developer.apple.com/library/archive/technotes/tn2285/_index.html) — update testing and preservation of `Documents` and `Library`.
- [Apple `UserDefaults`](https://developer.apple.com/documentation/foundation/userdefaults) — persistent application preferences.
- [Android `SharedPreferences`](https://developer.android.com/reference/android/content/SharedPreferences) — named app-private preference maps.
- [Android app signing](https://developer.android.com/studio/publish/app-signing) — update certificate matching and Play app-signing versus upload keys.
- [Expo local modules](https://docs.expo.dev/modules/get-started/) — local Swift/Kotlin modules and native builds.
