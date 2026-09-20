# Physical multiplayer testing

Use the iPad, iPhone, and Android phone with standalone builds connected to `https://app.pidro.online`. A bot fills the fourth seat. Metro and simulators are unnecessary.

## Build and install

Build from clean, pushed `main` after the release gate passes. From `pidro_frontend/`:

```sh
node packages/mobile/scripts/ship.mjs build --dry-run
cd packages/mobile
eas build --platform all --profile production --auto-submit
```

EAS compiles both apps in the cloud. The production environment must define `EXPO_PUBLIC_API_URL=https://app.pidro.online` and `EXPO_PUBLIC_WS_URL=wss://app.pidro.online/socket`.

- Install the iOS build through TestFlight on both Apple devices.
- Install the Android build through Google Play internal testing. The current EAS Android submission default is the internal track; verify the submission receipt says **internal**.
- Confirm each device has the intended build number. Sign in with a separate dedicated test account on each device; these logins persist between tests.

Store uploads and processing can take time. A finished build alone does not mean it is available to testers yet. The backend deployment is separate from these mobile builds.

## PID-75: three bots already playing

On one physical device, start a game with three bots. Make the human player's bids and card selections through at least two hands. Check that bot turns and the transition to the next hand continue. This checks the originally reported symptom independently of departures.

## PID-75: live departures

1. Create a table named **QA — PID-75**. Set two seats to **Open** and one to **Bot**. Use **Regular** bot strength.
2. Join the open seats from the other two devices. There are now three humans and one bot.
3. Once the game is live, have two human players depart using one of the methods below. Keep the third device active and make its bids and card selections.
4. Check that the surviving native client continues playing with three bots, completes a hand, and reaches the next hand.

Use a fresh table for each departure method:

| Method          | Action                                                                            | Expected behavior                                                                                                                       |
| --------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Explicit leave  | Both departing players use **Leave table**. Include the original host in one run. | Immediate permanent bot takeover; ownership transfers to a remaining human.                                                             |
| Connection loss | Force-close the app on both departing devices.                                    | Substitute bots normally take over after about 20 seconds. Permanent conversion follows the grace period, normally another 120 seconds. |
| Mixed           | One player uses **Leave table**; the other force-closes the app.                  | The surviving player continues with all three bots.                                                                                     |

Leave **Keep Bot / Open Seat** prompts unanswered while checking progression. Selecting **Open Seat** intentionally creates a vacancy and tests different behavior. An idle surviving player can also be timed out, so keep playing their turns.

Reopen a force-closed app during the grace period to check seat reclaim. An explicit leaver or someone returning after permanent conversion should not automatically reclaim that seat.

This three-device setup covers one human playing with three bots and live host departure. The exact four-human, three-departure variant needs a fourth physical client.

## Record the result

Record mobile build numbers, backend commit, room code, departure order/method, current phase/turn, and whether the next hand started. Capture a screen recording if play stops. A queued build or passing server test does not count as a completed physical-device test.

Production games and departures can affect the test accounts' statistics. The mobile **Private table** setting currently is not enforced by the backend's room creation path, so do not assume a QA table is hidden from the public lobby.

References: [Expo TestFlight distribution](https://docs.expo.dev/submit/testflight/), [Expo automated submission tracks](https://docs.expo.dev/build/automate-submissions/).
