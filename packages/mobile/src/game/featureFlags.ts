/**
 * Game feature flags.
 *
 * The Skia canvas table (`src/game/canvas/GameCanvasTable`) is now the MAIN table
 * rendered in the game screen. The legacy RN `GameTable` is kept as a backup:
 * flip this to `false` to fall straight back to it (instant, no other changes).
 *
 * NOTE: the canvas table has been verified on the `/table-dev` harness (mocks +
 * web/CanvasKit) but NOT yet against a live Phoenix game or on-device — test there
 * and flip back here if anything misbehaves.
 */
export const USE_SKIA_TABLE = true;
