# PID-149: Classic login carryover

- Date: 2026-09-29
- Status: research spike; no production code
- Timebox: one day

## Verdict

| Platform | Can the replacement app read the old app's standard Unity storage?                                                                                                                                                                                              | Can we recognize a real Classic login today?                                                                                       |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| iOS      | **Yes, in principle**, for a genuine update with the same application identity. Unity uses the app's standard `UserDefaults`, whose persistent app domain lives under `Library/Preferences`; Apple guarantees `Library` except `Library/Caches` across updates. | **Unknown** until a physical-device overwrite proves where Classic stored its refresh token, under which key, and in which format. |
| Android  | **Yes, in principle**, for a genuine update with the same package and compatible app-signing certificate. Unity uses app-private `SharedPreferences`.                                                                                                           | **Unknown** until a Play-signed physical-device overwrite proves the Classic key, format, and storage generation.                  |

**Recommendation:** build a narrow, disposable native diagnostic and run the two real-device overwrite tests below. Do not make login carryover a launch dependency. Keep Apple, Facebook, and Classic password claim available as the fallback.

The likely path is technically sound and worth testing. It is not yet a proven “yes” because neither Unity documentation nor the Classic API response proves that the Classic client persisted the refresh token in `PlayerPrefs`. A plugin may have used Keychain/Keystore-backed storage, custom encryption, another file, or no durable refresh token at all.

## What survives an in-place update

### iOS

Unity documents iOS `PlayerPrefs` as `[NSUserDefaults standardUserDefaults]`. Older Unity documentation names the physical location as `Library/Preferences/<bundle identifier>.plist`. Apple guarantees that the app's `Documents` and `Library` directories, excluding `Library/Caches`, are preserved when an update replaces the executable bundle. The container's absolute path may change, so the replacement must use `UserDefaults`, not a saved plist path.

For production Pidro this requires the same effective application identity as Classic:

- bundle ID `com.oneapps.pidro`;
- the same App ID prefix/application identifier and compatible signing entitlements;
- for Keychain data, the same accessible Keychain access group.

The known Apple team is `LSFK7YF82G`, but team ID plus bundle ID is not a complete historical Keychain check: old apps can have a legacy App ID prefix. Compare the signed Classic and replacement `application-identifier` and `keychain-access-groups` entitlements if a Classic archive is available.

The current frontend is configured correctly only for `APP_VARIANT=production`. Its default and store Beta use `com.oneapps.pidro.beta`, and development uses `com.marcelfahle.pidro3.dev`; neither can read Classic's sandbox.

**Key and value representation.** `UserDefaults` stores string keys and property-list-compatible typed values. Unity exposes strings, integers, and floats. There is no documented mobile URL encoding, Base64 encoding, hashing, encryption, or obfuscation applied by Unity. Plist serialization is an implementation detail handled by the native API. Unity's documented `DeckBase_h...` key hashing applies to Windows Editor storage, not iOS. Unity's native mobile bridge is closed, so unusual behavior in an old Classic Unity version remains a device-test question.

**Keychain.** If Classic or an auth plugin used Keychain, entries normally remain accessible to an update whose signed access groups still match. Reading an entry also requires knowing or discovering its class, service, account, access group, and accessibility behavior. `expo-secure-store` is not a general migration scanner: it performs keyed lookups and its `keychainService` must match. Do not broadly enumerate Keychain metadata by default; account names and labels can themselves be personal data. Only perform a narrowly scoped, local follow-up on a sacrificial test account if PlayerPrefs is empty and entitlement/plugin evidence points to Keychain.

### Android

Unity documents Android `PlayerPrefs` as app-private `SharedPreferences`. Current Unity uses:

```text
/data/data/com.oneapps.pidro/shared_prefs/com.oneapps.pidro.v2.playerprefs.xml
```

Older Unity documentation uses:

```text
/data/data/com.oneapps.pidro/shared_prefs/com.oneapps.pidro.xml
```

The engine change was present by Unity 5.3, but no authoritative patch-level transition date was found and Unity's documentation lagged the implementation. A diagnostic for an unknown Classic version must therefore open both names, without the `.xml` suffix passed to the API:

```kotlin
context.getSharedPreferences("com.oneapps.pidro.v2.playerprefs", Context.MODE_PRIVATE)
context.getSharedPreferences("com.oneapps.pidro", Context.MODE_PRIVATE)
```

`SharedPreferences.getAll()` returns ordinary string keys and typed values. There is no documented Unity mobile URL encoding, Base64 encoding, hashing, encryption, or obfuscation. XML escaping is handled by Android and is not application-level key encoding. As on iOS, a Classic-specific plugin or obfuscator could have added its own format.

Android permits an installed app update only when package identity and signing certificates are compatible. With Play App Signing, Google signs delivered APKs with the **app-signing key**, not the upload key. A normal local/debug or EAS internal APK is therefore unlikely to install over the public Classic build even if it uses `com.oneapps.pidro`. Use the existing Classic Play listing and an internal test track, signed by Play, for the faithful test.

App-private data is retained by an update and removed on uninstall or Clear storage. The current replacement config has `allowBackup: false`, so backup/restore must not be treated as part of this feature's coverage.

**Keystore/plugins.** Android Keystore keys are app-owned and can remain usable across a correctly signed update, but that alone is insufficient. The replacement would also need the plugin's ciphertext, alias, algorithms, parameters, and serialization format. Keystore keys are removed on uninstall; encrypted preferences restored without their key are unusable. Treat plugin-backed storage as unknown until the exact Classic plugin and data are observed.

## How Expo can read it

Use a small **local Expo native module**, generated with `bun create expo-module --local`, rather than adding a generic preference dependency.

- iOS/Swift: read the persistent domain for `Bundle.main.bundleIdentifier`, or `UserDefaults.standard` for targeted keys. For diagnostics, prefer the persistent app domain over `dictionaryRepresentation()`, which is a union of multiple defaults domains.
- Android/Kotlin: open both named Unity preference files and inspect `getAll()`.
- JavaScript: expose only diagnostic key/type records initially, then a targeted method for the confirmed refresh-token key.

A local module matches the app's Expo Modules/CNG setup and is about two small native implementations. No config plugin is needed merely to call these APIs. Add a config plugin only if later work must generate entitlements or other native project configuration. This requires a new native binary; Expo Go and an OTA update cannot add it.

Existing libraries are a worse fit. `react-native-default-preference` can switch Android preference names and iOS suites, but its published interface predates the current React Native architecture and adds a dependency for a tiny migration. `expo-secure-store` reads its own encrypted Android store and keyed iOS Keychain items, not arbitrary Unity PlayerPrefs. A purpose-built module makes the two historical Android stores, one-shot migration, and no-value diagnostic contract explicit.

For production, do not expose an unrestricted “get all preferences” API. Compile the enumerator only into the diagnostic build. The production module should read and delete only confirmed keys.

## Finding Classic's real keys

The Classic API returns fields named `DeviceId`, `access_token`, and `refresh_token`. A typical Unity auth client might store those exact names, casing variants such as `deviceId`/`refreshToken`, prefixed names, or one serialized `auth`/`session` object. These are search candidates, not a contract. A bare `DeviceId` or user ID is identification only and must never be accepted as proof of ownership.

The diagnostic must:

1. Enumerate keys from the iOS persistent application defaults domain or both Android Unity stores.
2. Emit only store name, sorted key name, and native value type. **Never emit values, lengths, JWTs, account attributes, or decoded claims to logs, analytics, Sentry, or crash reports.** Key names may still be sensitive, so keep diagnostic logs private.
3. Record the platform, OS version, Classic version/build, diagnostic version/build, and signing/application identity.
4. If a likely key is found, replace the enumerator with a targeted local read. Pass the candidate directly to the server verification call in memory; do not display or log it and do not persist it into the new app's storage.
5. If names are opaque or a serialized value is suspected, add a local structural check for that one key or inspect it manually on the sacrificial device. Do not add a generic secret dump.

A key-list comparison by itself cannot prove that login/logout changed a token: the key may remain while only its value changes. Use separate seeded trials or separate devices, followed by server validation of the targeted candidate.

## Device test for Marcel

Use sacrificial physical devices and test accounts. Replacing Classic may prevent downgrade without erasing app data. Do not use a primary account/device, and do not uninstall or clear storage to fix an install failure.

### Prepare the diagnostic build

1. Add the local module above behind a diagnostic-only build flag. Its visible debug action prints only key names and value types.
2. Build with `APP_VARIANT=production`; verify the resolved iOS bundle ID and Android package are both `com.oneapps.pidro`.
3. Give the build a higher iOS build number and Android `versionCode` than the installed Classic build.
4. Keep this diagnostic isolated from the production Expo update channel. Do not publish its JavaScript to ordinary production clients.

### iOS overwrite

1. On a registered physical iPhone, install the current App Store Classic build, sign in to a disposable Classic account, and use the app long enough for it to persist the session. Do not sign out.
2. Prefer an internal TestFlight build attached to Classic's existing App Store Connect record. Alternatively, archive a release-like `com.oneapps.pidro` diagnostic and distribute it Ad Hoc to the registered device using team `LSFK7YF82G`. Confirm the archived app's application identifier/access groups match Classic's known entitlements.
3. Install the diagnostic **over** Classic. If iOS requests deletion or installs a second icon, stop: this was not an update and is not evidence.
4. Launch without Xcode first, then attach/read the diagnostic output. Save only the sorted key/type list and build metadata.
5. Repeat on a second seeded device/account that was explicitly signed out of Classic, or restore the original seeded device state before another overwrite. Compare key/type presence, then test only plausible candidate keys against the server.
6. If no candidate exists in the persistent defaults domain, mark PlayerPrefs negative. Investigate Keychain only if Classic archive/plugin evidence provides a narrow service/class selector and the signed access groups match.

### Android overwrite

1. On a physical Android device enrolled with a dedicated tester account, install Classic from Google Play, sign in to a disposable Classic account, and let it persist the session. Do not sign out.
2. Upload the higher-`versionCode` diagnostic AAB to an **internal test track of the existing Classic Play app**, add only the test account, and let Google Play deliver the update. An upload-key- or debug-signed local APK is not equivalent to the app-signing-key-signed installed app.
3. Confirm Play offers **Update**, not Install. If installation reports a signature mismatch, stop; do not uninstall Classic.
4. Launch and capture only keys/types from both `com.oneapps.pidro.v2.playerprefs` and `com.oneapps.pidro`.
5. Repeat with a separately seeded signed-out installation/device. Then replace the diagnostic enumerator with targeted reads for plausible candidates and validate them server-side.

### Pass/fail evidence

The test is positive only when all of these hold:

1. the store delivered a genuine overwrite;
2. the replacement read a targeted, non-logged credential from old storage;
3. Classic validated it as a refresh session for the expected disposable account; and
4. the new backend returned the expected Classic preview and its existing short-lived claim ticket.

Missing keys, wrong types, malformed values, expired/tampered/access tokens, inactive users, conflicting Android stores, inaccessible encrypted storage, and any identity/signing mismatch must fail closed to the normal claim choices.

## Server sketch

### Classic API

Add an internal-only endpoint:

```text
POST /internal/claims/verify_session
Authorization: Bearer <existing Classic internal shared secret>
Content-Type: application/json

{"refresh_token":"<Classic Guardian refresh JWT>"}
```

On success, return the same normalized source envelope as `/internal/claims/lookup` and `/internal/claims/verify_password`:

```json
{ "classic": { "id": 123, "username": "Bengt", "games": {}, "premium": {} } }
```

The Classic endpoint must:

- accept only a bounded-size refresh token, never `DeviceId`, user ID, or an access token;
- run Classic's complete Guardian refresh-token verification: configured algorithm/key, signature, expiry, token type, subject, applicable issuer/audience, and any existing revocation/session checks;
- derive the account exclusively from the verified subject and reject missing or inactive accounts;
- use the same profile serializer as lookup so the new backend receives identical fields;
- authenticate the internal request with the existing server-to-server bearer secret and require TLS;
- never log, echo, persist, or place the refresh token in a URL/header other than the JSON request body; and
- make invalid, expired, revoked, wrong-type, unknown, and inactive credentials indistinguishable to the public caller. A provider outage may remain a service error.

### New backend

Extend the existing `/api/v1/classic/verify` contract with `method: "session"`, `refresh_token`, and the existing user/install binding. `ClassicClient.verify_session/1` calls the internal endpoint; `ClassicVerification` then reuses the existing normalization, preview, and ticket issuance path.

The existing ticket is the right boundary: it is 32 random bytes, stored hash-only, expires after ten minutes, is bound to exactly one current user or install ID, and is transactionally protected against linking the same Classic account twice. It is a short-lived, binding-scoped, idempotent authorization—not hardware attestation and not strictly single-use. Anyone holding the refresh token can request another ticket while it remains valid, and same-owner ticket redemption is intentionally retryable until expiry.

Implementation work must also cover the full method dispatch, not only add an enum value:

- add providerless `:session` to the Ecto enum and database method/provider constraints;
- handle it in provider validation, user creation/selection, provider availability, link attributes, errors, OpenAPI, and tests;
- add `refresh_token` to Phoenix, HTTP client, monitoring, analytics, and crash-report redaction (the current Phoenix filter list does not include it);
- rate-limit the public verification action and cap input size; and
- test wrong binding, account switching after preview, expiration, duplicate/concurrent redemption, already-claimed accounts, and repeated verification with the same refresh token.

The app sends the recovered token only to the new backend over TLS. It holds the transient copy only for the request. Before redemption, securely persist the original claim ticket with its install binding; protect it as a credential. Keep that ticket and the original Classic credential until claim succeeds **and** the new app's session is durably stored. If redemption commits but its response is lost, retry the same ticket and binding before its ten-minute expiry. Re-verifying the Classic refresh token would issue a new ticket, but that new ticket cannot recover the session after the Classic account has already been linked. Once the original ticket is lost or expires, recovery requires the established new-account sign-in method. Then delete only the confirmed old credential key/field and the migration ticket, not the whole preference domain. “Not you?” must discard the ticket/preview and suppress immediate rediscovery; product must decide whether it also deletes the saved Classic login.

### Open account-lifecycle decision

A Classic refresh token proves ownership of the Classic account, but it is not a durable sign-in method for the new account. The current claim flow creates password-backed accounts from password claims and provider-backed accounts from Apple/Facebook claims. A providerless `:session` ticket has no corresponding recoverable account path.

Before production implementation, choose one:

1. after the welcome-back preview, ask the player to attach password, Apple, or Facebook as the new account's recovery method; or
2. explicitly support a device-session-only new account and define how the player recovers it after losing the redemption response, original ticket, new token, or device.

The first option preserves the current security model but does not completely “skip claim methods.” The second matches one-tap Continue but needs an explicit product/security design. Never infer an Apple/Facebook identity from Classic profile fields, silently merge an already-claimed account, or accept a client-selected Classic/user ID.

## Reach and exclusions

This can reach veterans who:

- update Classic in place on the same iOS/Android app installation;
- still have a locally persisted Classic **refresh token**;
- have a token that remains valid under Classic's complete validation rules; and
- used a storage format and version that the migration reader supports.

It cannot reliably reach:

- people whose refresh token expired (stated lifetime: 30 days, subject to Classic's actual renewal/revocation behavior);
- people who signed out if sign-out deleted or invalidated the refresh token;
- people who uninstalled Classic, cleared app data, or installed the Beta beside Classic;
- people on a new phone, except where a platform backup happened to restore both usable data and required cryptographic material—this is not promised coverage;
- sessions stored by unsupported plugins, custom encryption/obfuscation, or unknown PHP-era formats;
- installations whose update identity/signing lineage or iOS Keychain access groups do not match; or
- accounts already claimed in the new backend without completing that account's established sign-in path.

Do not estimate a percentage of the 73,000 accounts from the available facts. The maximum audience is constrained first by same-install updates, then by still-valid persisted refresh sessions. Instrument only aggregate success/fallback reasons after launch, with no key names, tokens, account identifiers, or claim tickets.

## Follow-up acceptance cases

- Positive overwrite on one real iOS and one real Android device reaches the expected Classic preview without logging credentials.
- Signed-out, missing, empty, wrong-type, malformed, unsupported, expired, tampered, wrong-issuer, wrong-token-type, inactive, and revoked cases fall back safely.
- Both Android stores present with conflicting candidates fall back rather than guessing.
- Kill after preview retries verification; a lost redemption response or failed new-session persistence retries the securely retained original ticket/binding before expiry; cleanup retry and “Not you?” do not create/import twice. A lost or expired post-redemption ticket falls back to the established new-account sign-in method rather than re-verifying into an unusable fresh ticket.
- Wrong user/install binding, account switch after preview, duplicate/concurrent redemption, and already-claimed account retain the current one-to-one ownership rules.
- Logs, request traces, Sentry, analytics, and server errors contain neither Classic refresh tokens nor claim tickets.
- A player who later loses the new session has the recovery behavior selected in the account-lifecycle decision above.

## Sources

- [Unity `PlayerPrefs` documentation](https://docs.unity3d.com/6000.6/Documentation/ScriptReference/PlayerPrefs.html) — current platform stores, Android `.v2.playerprefs.xml`, native API access, and lack of encryption.
- [Unity 2019.4 `PlayerPrefs` documentation](https://docs.unity3d.com/2019.4/Documentation/ScriptReference/PlayerPrefs.html) — historical Android `<package>.xml` documentation.
- [Unity C# reference: `PlayerPrefs.bindings.cs`](https://github.com/Unity-Technologies/UnityCsReference/blob/master/Runtime/Export/PlayerPrefs/PlayerPrefs.bindings.cs) — string keys and typed int/float/string native calls; the native mobile implementation is not public.
- [Apple TN2285: Testing iOS App Updates](https://developer.apple.com/library/archive/technotes/tn2285/_index.html) — update testing and preservation guarantees for `Documents`/`Library`.
- [Apple `UserDefaults`](https://developer.apple.com/documentation/foundation/userdefaults) — persistent app domain, string keys, plist-compatible values, and domain enumeration.
- [Apple Keychain access groups](https://developer.apple.com/documentation/security/sharing-access-to-keychain-items-among-a-collection-of-apps) — application identifier, access groups, and query scope.
- [Apple TN2311: Managing Multiple App ID Prefixes](https://developer.apple.com/library/archive/technotes/tn2311/_index.html) — legacy App ID prefixes and update/Keychain compatibility.
- [Android `SharedPreferences`](https://developer.android.com/reference/android/content/SharedPreferences) — named maps, `getAll()`, and typed values.
- [Android app signing](https://developer.android.com/studio/publish/app-signing) — certificate matching for updates and Play app-signing versus upload keys.
- [Android app-specific storage](https://developer.android.com/training/data-storage/app-specific) and [Auto Backup](https://developer.android.com/identity/data/autobackup) — sandbox/removal and backup limits.
- [Android Keystore](https://developer.android.com/privacy-and-security/keystore) — app-owned non-exportable keys and key aliases.
- [Expo local modules](https://docs.expo.dev/modules/get-started/) and [config plugins](https://docs.expo.dev/config-plugins/introduction/) — local Swift/Kotlin module and CNG integration.
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/) — platform stores, service/access-group lookup, and uninstall/backup behavior.
