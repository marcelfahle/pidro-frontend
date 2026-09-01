/**
 * Mirror legacy card art into public/ so Skia can load it on web.
 * (Metro-web require() yields a numeric id Skia can't resolve to a URL — proven.)
 * Source of truth stays assets/images/cards. Runs via the `sync:cards` /
 * prestart / preweb npm scripts so the mirror can't drift.
 */
import { cpSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcCards = join(root, 'assets/images/cards');
const outDir = join(root, 'public/cards');

mkdirSync(outDir, { recursive: true });

let n = 0;
for (const file of readdirSync(srcCards)) {
  if (file.endsWith('.png')) {
    cpSync(join(srcCards, file), join(outDir, file));
    n++;
  }
}
cpSync(join(root, 'assets/images/cardback.png'), join(outDir, 'cardback.png'));
// suit glyphs for the trump indicator (file names are singular)
for (const s of ['heart', 'diamond', 'club', 'spade']) {
  const p = join(root, `assets/images/${s}.png`);
  if (existsSync(p)) cpSync(p, join(outDir, `${s}.png`));
}
// seat furniture (avatars + dealer chip) for the RN SeatLayer on web
for (const f of ['avatar1.png', 'avatar2.png', 'dealer-chip.png']) {
  const p = join(root, `assets/images/${f}`);
  if (existsSync(p)) cpSync(p, join(outDir, f));
}
console.log(`[sync:cards] mirrored ${n} cards + back + suits + seat art → public/cards`);
