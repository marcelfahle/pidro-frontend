/**
 * Refresh the visual-regression baselines from CI.
 *
 * Downloads the ui-grammar-screenshots artifact of the latest successful
 * Frontend CI run on main (or the run given as an argument) into
 * test/ui-baselines/, replacing what is there. Commit the result.
 *
 *   bun run ui:baselines            # latest green main run
 *   bun run ui:baselines 12345678   # a specific run id
 */
import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const baselineRoot = resolve(mobileRoot, 'test/ui-baselines');

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
}

let runId = process.argv[2];
if (!runId) {
  runId = sh(
    `gh run list --branch main --workflow "Frontend CI" --status success --limit 1 --json databaseId -q '.[0].databaseId'`
  );
  if (!runId) {
    console.error('no successful Frontend CI run found on main');
    process.exit(1);
  }
}

console.log(`downloading ui-grammar-screenshots from run ${runId} …`);
rmSync(baselineRoot, { recursive: true, force: true });
sh(`gh run download ${runId} --name ui-grammar-screenshots --dir "${baselineRoot}"`);
console.log(`baselines refreshed in ${baselineRoot} — review with \`git diff --stat\` and commit`);
