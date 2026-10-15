/**
 * True while UI grammar captures pixel baselines: it sets `__pidroStill` before
 * the bundle loads. Endless motion (a breathing turn light) then holds its
 * resting frame, so no two captures catch it mid-breath. Never set in the app.
 */
export function isStillCapture(): boolean {
  return (globalThis as { __pidroStill?: boolean }).__pidroStill === true;
}
