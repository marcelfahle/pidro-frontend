# Design boards

The approved designs for the avatar, the table seats, the profile, leagues and the Tables screens, exported from Marcel's design canvas on 2026-10-14; the Tables boards were replaced on 2026-10-15 (PID-202). The canvas itself is private (https://claude.ai/artifact/QNDfktYA6aE65LywZGW7so), so this folder is the copy a ticket works from.

- `boards/<Name>.png`: what it should look like. Phone boards are at 2×, wide boards at 1×.
- `source/<Name>.html`: the same board as plain HTML and CSS. Open it in a browser, or read it for exact sizes, offsets and colours. The shared classes are in `source/pidro-ds-v2.css`.

The boards are drawn in CSS, not React Native. Read them as a spec: match the sizes, positions, order and wording. Build with the app's primitives and tokens (`src/design/README.md`), never by pasting a hex value into a screen. If a colour on a board has no token yet, add one to `src/design/tokens.ts` under a name that says what it is for.

Initials stand in for photos on the boards. In the app the avatar is the player's photo, with the existing fallback image when there is none.

## Boards

| Board | What it shows | Used by |
| --- | --- | --- |
| `Avatars` | The avatar: ring, pin, level chip, turn light, dealer chip, and which parts show at which size | Avatar component |
| `Seat-States` | Every state one seat can be in, with its status line | Avatar component, table seats |
| `Table-Seats` | Phone portrait table: name and status under the avatar | Table seats |
| `Table-Landscape` | Phone landscape: name beside the avatar, East on the left, everyone else on the right | Table seats |
| `Table-iPad-Portrait` | iPad portrait: like the phone portrait, larger | Table seats |
| `Table-iPad-Landscape` | iPad landscape: like the phone landscape, larger | Table seats |
| `Main` | Profile of a Classic player | Profile |
| `Profile-New` | Profile of a new player | Profile |
| `Badge-Sheet` | The sheet behind the avatar: ring, and which pin to wear | Profile |
| `Ladders` | Week, month, all time | League tab, later leagues |
| `League`, `League-Intro`, `League-Result` | The weekly league: tab, first visit, Monday's result | Later; not before launch |
| `Lobby-Empty` | Tables with nobody playing: four empty chairs, Start a table | Tables (PID-203) |
| `Lobby-List` | Tables, phone portrait: rows of chairs grouped in four categories, tap an open chair to sit | Tables (PID-203) |
| `Lobby-Landscape`, `Lobby-iPad-Portrait`, `Lobby-iPad-Landscape` | The same row in two columns (phone landscape, iPad portrait) and three (iPad landscape) | Tables (PID-203) |
| `Create-Table` | Start a table: rules, then the seats with Open / Bot / Friend; Open flips in place to Anyone / 100+ / 1000+ | Start a table (PID-204, PID-206) |
| `Create-Seat` | The friend sheet behind Friend on a seat | Start a table (PID-208) |

On the boards the gold ring means a paying supporter and the gem means lifetime. Neither exists on the server yet, so until it does every avatar uses the glass ring.

## From the boards to the app

| On the boards | In the app |
| --- | --- |
| Gold ring, medal rim, level chip edge (`#F6DE9A → #8F5E12`) | `PidroBevel.goldRimGradient` |
| Glass ring (`#D8F6FF → #17507E`, opaque) | New token next to `PidroBevel.glassRimGradient`, which is translucent and made for buttons |
| Avatar face behind the photo, level chip (`#175086`, `#0E3158`, `#0A2340`) | `PidroBevel.panelHi`, `panelMid`, `panelDeep` |
| Classic pin face (`#91541C → #4E2509`) | The wood face: `PidroBevel.woodFaceGradient` |
| Gold text (`#FFD447`) | `PidroBevel.textGold` |
| Cyan status text (`#8beaff`) | `PidroColors.cyanText` |
| Partner's name (`#92e6b2`) | `PidroColors.success` (the table's `T.green`) |
| Turn light (`#c9f7ff`, glow `rgba(139,234,255,…)`) | New token |
| Last seconds of a turn (`#ffb86b`) and reconnecting (`#ffb4b9`) | `PidroColors.warning` and `PidroColors.danger`, or new tokens if those read wrong on the felt |
| Bree Serif, Nunito | `PidroFonts` |
| Felt | The app's own felt |
