---
title: Pidro 3 iOS testing and distribution workflow
date: 2026-07-11
category: developer-experience
module: mobile
problem_type: developer_experience
component: development_workflow
severity: medium
applies_when:
  - "Iterating quickly on Pidro 3 in an iOS simulator"
  - "Testing live changes on a physical iPhone"
  - "Carrying a standalone production-backend build without Metro"
  - "Uploading the existing Pidro app to TestFlight"
tags:
  - "expo"
  - "ios"
  - "testflight"
  - "physical-device"
  - "development-client"
  - "personal-team"
---

# Pidro 3 iOS testing and distribution workflow

## Context

Pidro 3 uses Expo SDK 56, React Native, and Skia. Expo Go for SDK 56 is not distributed through the iOS App Store, so the mobile workflow needs distinct paths for fast iteration, physical-device development, untethered testing, and TestFlight.

The variants deliberately use separate bundle identifiers and can coexist on one phone:

| Use                       | App name        | Bundle identifier                | JavaScript source | Backend                    |
| ------------------------- | --------------- | -------------------------------- | ----------------- | -------------------------- |
| App Store/TestFlight      | Pidro 3         | `com.oneapps.pidro`              | Embedded          | Production EAS environment |
| Physical live development | Pidro 3 Dev     | `com.marcelfahle.pidro3.dev`     | Metro on the Mac  | Production                 |
| Standalone local preview  | Pidro 3 Preview | `com.marcelfahle.pidro3.preview` | Embedded          | Production                 |

The variant definitions live in `packages/mobile/app.config.js`. The repeatable commands live in `packages/mobile/package.json`, and TestFlight configuration lives in `packages/mobile/eas.json`.

## Guidance

### 1. Simulator: fastest UI iteration

From the frontend repository root:

```bash
bun run mobile:ios
```

This is the normal rapid loop for layout, portrait/landscape behavior, menus, cards, windows, buttons, and animation work. `packages/mobile/.env` controls the API and WebSocket endpoints for local simulator development.

### 2. Physical iPhone with live reload

Use this when device ergonomics, touch behavior, safe areas, rotation, or Skia performance need testing while code is changing.

List available device identifiers:

```bash
xcrun xctrace list devices
```

Install or rebuild the native development client:

```bash
cd packages/mobile
bun run ios:device -- <device-udid>
```

The command regenerates the ignored native iOS project for the Development variant before compiling. This prevents a previously generated Preview native tree from leaking into the Dev build.

For subsequent JavaScript/TypeScript iteration, the installed native client does not need rebuilding. Start Metro instead:

```bash
bun run start:device
```

The phone and Mac must be able to reach each other over the network. The cable is required for initial installation and native rebuilds, but not for ordinary Metro-based iteration.

### 3. Standalone physical preview

Use this when Pidro should behave like a normal installed application and remain usable away from the Mac:

```bash
cd packages/mobile
bun run ios:preview -- <device-udid>
```

This command:

1. Regenerates the native project for `Pidro 3 Preview`.
2. Builds the iOS Release configuration.
3. Embeds the JavaScript bundle and assets.
4. Compiles in `https://app.pidro.online` and `wss://app.pidro.online/socket`.
5. Signs with the Xcode Personal Team and installs on the selected phone.

After installation, Metro is not required. The Mac can be off, the cable can be disconnected, and the phone can leave the local Wi-Fi network. Personal Team provisioning expires after seven days, after which the same command refreshes the installation.

### 4. TestFlight

TestFlight uses the existing Pidro App Store record:

- App Store Connect ID: `1137091987`
- Bundle identifier: `com.oneapps.pidro`
- Pidro 3 marketing version: `3.0.0`
- Remote iOS build numbers with automatic incrementing

From `packages/mobile`:

```bash
printf '\033[?1004l'
npx testflight
```

The first command disables terminal focus reporting. Without it, a terminal focus event (`^[[I`) can crash EAS CLI's interactive confirmation prompt.

An updated Apple Developer Program agreement blocks TestFlight, certificates, profiles, and App Store Connect API access until the organization's Account Holder accepts it. The locally signed Dev and Preview variants provide the physical-device fallback during that block.

Uploading a build to TestFlight does not publish it to App Store users. Public release still requires explicitly selecting the build and submitting it for App Review.

### First-time phone setup

1. Install Xcode 26.4 or newer; SDK 56 requires it.
2. Connect and unlock the iPhone, then trust the Mac.
3. Enable **Settings → Privacy & Security → Developer Mode**.
4. Add the Apple Account in **Xcode → Settings → Apple Accounts**.
5. Use the Personal Team when the organization team is blocked.
6. After the first install, open **Settings → General → VPN & Device Management**, select the developer profile, and trust it.

## Why This Matters

Each artifact has one job:

- Simulator and Metro optimize iteration speed.
- Pidro 3 Dev validates real-device behavior without rebuilding JavaScript into the app.
- Pidro 3 Preview tests the actual embedded-bundle and production-backend experience anywhere.
- TestFlight validates Apple distribution, tester feedback, and eventual release behavior.

Keeping separate bundle identifiers avoids overwriting the public Pidro installation and makes Dev and Preview available side by side.

The native iOS project inside the mobile package is generated and gitignored. Both physical-build scripts run a clean prebuild so the selected variant, display name, URL scheme, and bundle identifier cannot depend on stale generated state.

## When to Apply

- Use the simulator for most visual and interaction work.
- Use Pidro 3 Dev when live reload on actual hardware matters.
- Use Pidro 3 Preview before handing the phone to someone, leaving the desk, or assessing production feel.
- Use TestFlight after the Account Holder accepts the current agreement and before any App Store release.
- Rebuild a native variant after adding or changing a native dependency, Expo config plugin, entitlement, icon, splash screen, bundle identifier, or other native configuration.

## Examples

### The standalone check

A Preview build is truly standalone when all of these are true:

```text
Pidro 3 Preview appears in the device's installed-app list
main.jsbundle exists inside the Release .app
the embedded bundle contains the production HTTPS and WSS endpoints
nothing is listening on Metro port 8081
the app still launches and plays
```

### CocoaPods autolinking failure

If CocoaPods reports:

```text
Invalid Podfile file: cannot load such file -- ./scripts/autolinking
```

check `NODE_OPTIONS`. CocoaPods changes its working directory to the generated native project, so relative preload paths break. The device scripts use an absolute preload based on `$PWD`:

```bash
NODE_OPTIONS="--require $PWD/scripts/tailwind-v3-resolve.cjs"
```

### Device is locked

The build can finish and install successfully while automatic launch fails because the phone locked during compilation. Unlock the phone and tap the installed app directly; rebuilding is unnecessary.

## Related

- [Expo local app development](https://docs.expo.dev/guides/local-app-development/)
- [Expo SDK 56 release notes](https://expo.dev/changelog/sdk-56)
- [Apple Personal Team limitations](https://developer.apple.com/help/account/basics/about-your-developer-account/)
- [Apple TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/)
