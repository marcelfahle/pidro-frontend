/**
 * Release gate: refuse to ship a commit that CI hasn't proven.
 *
 * Checks that the working tree is clean, HEAD is on main and pushed, and the
 * Frontend CI check runs for HEAD (including the full-game e2e) are green —
 * then hands off to EAS:
 *
 *   node scripts/ship.mjs ota     # eas update  --channel production
 *   node scripts/ship.mjs build   # eas build   --platform ios --profile production
 *
 * Flags: --wait (poll up to 15 min for in-progress checks), --dry-run (run
 * the gate, print the EAS command, ship nothing), --skip-gate (emergencies
 * only). Requires an authenticated `gh` and `eas` CLI.
 */
import { execSync, spawnSync } from 'node:child_process';

const mode = process.argv[2];
const wait = process.argv.includes('--wait');
const skipGate = process.argv.includes('--skip-gate');
const dryRun = process.argv.includes('--dry-run');

if (!['ota', 'build'].includes(mode)) {
  console.error('usage: node scripts/ship.mjs <ota|build> [--wait] [--skip-gate]');
  process.exit(1);
}

const REQUIRED_CHECKS = ['Mobile quality', 'UI grammar', 'Game e2e'];

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const dirty = sh('git status --porcelain');
if (dirty) fail('working tree is not clean — commit or stash first');

const branch = sh('git branch --show-current');
if (branch !== 'main') fail(`on branch ${branch} — ship from main`);

sh('git fetch origin main');
const head = sh('git rev-parse HEAD');
const remote = sh('git rev-parse origin/main');
if (head !== remote) fail('HEAD differs from origin/main — push (or pull) first');

if (skipGate) {
  console.log('⚠ CI gate SKIPPED (--skip-gate)');
} else {
  const deadline = Date.now() + (wait ? 15 * 60_000 : 0);
  for (;;) {
    const checks = JSON.parse(
      sh(
        `gh api "repos/{owner}/{repo}/commits/${head}/check-runs?per_page=100" -q '[.check_runs[] | {name, status, conclusion}]'`
      )
    );
    const relevant = REQUIRED_CHECKS.map((name) => ({
      name,
      run: checks.find((check) => check.name === name),
    }));

    const missing = relevant.filter(({ run }) => !run);
    const pending = relevant.filter(({ run }) => run && run.status !== 'completed');
    const red = relevant.filter(
      ({ run }) => run?.status === 'completed' && run.conclusion !== 'success'
    );

    if (missing.length)
      fail(
        `no CI run found for ${missing.map((m) => m.name).join(', ')} on ${head.slice(0, 8)} — did CI trigger?`
      );
    if (red.length)
      fail(
        `CI is red on ${head.slice(0, 8)}: ${red.map((r) => `${r.name}=${r.run.conclusion}`).join(', ')}`
      );
    if (!pending.length) break;

    if (Date.now() > deadline) {
      fail(
        `CI still running (${pending.map((p) => p.name).join(', ')}) — re-run with --wait or try later`
      );
    }
    console.log(`… waiting on ${pending.map((p) => p.name).join(', ')}`);
    execSync('sleep 20');
  }
  console.log(`✓ CI green on ${head.slice(0, 8)} (${REQUIRED_CHECKS.join(', ')})`);
}

const subject = sh('git log -1 --format=%s');
const command =
  mode === 'ota'
    ? ['eas', ['update', '--channel', 'production', '--message', subject]]
    : ['eas', ['build', '--platform', 'ios', '--profile', 'production']];

console.log(`→ ${command[0]} ${command[1].join(' ')}`);
if (dryRun) {
  console.log('✓ dry run — nothing shipped');
  process.exit(0);
}
const result = spawnSync(command[0], command[1], { stdio: 'inherit' });
process.exit(result.status ?? 1);
