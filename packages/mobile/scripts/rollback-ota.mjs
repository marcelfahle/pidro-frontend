/**
 * Rolls beta testers back to an earlier update group. From packages/mobile:
 *
 *   node scripts/rollback-ota.mjs              # republish the group before the current one
 *   node scripts/rollback-ota.mjs <group-id>   # republish that group
 *   node scripts/rollback-ota.mjs --dry-run    # list the groups and the choice, publish nothing
 *
 * Needs a logged-in eas CLI or EXPO_TOKEN. When to roll back: docs/shipping.md.
 */
import { execFileSync, spawnSync } from 'node:child_process';

const dryRun = process.argv.includes('--dry-run');
const groupArg = process.argv.slice(2).find((arg) => !arg.startsWith('--'));
const ROLLBACK = 'Roll back to';

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const groups = JSON.parse(
  execFileSync(
    'bunx',
    ['eas-cli', 'update:list', '--branch', 'beta', '--limit', '8', '--json', '--non-interactive'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }
  )
).currentPage;
if (!groups.length) fail('no beta updates yet');

console.log('Recent beta update groups, newest first:');
groups.forEach(({ group, runtimeVersion, message }, index) =>
  console.log(`${index === 0 ? '→' : ' '} ${group}  ${runtimeVersion}  ${message}`)
);
console.log('');

const [current, previous] = groups;
let target = groups.find(({ group }) => group === groupArg);
if (groupArg && !target) target = { group: groupArg, message: groupArg };
if (!groupArg) {
  // Picking "the one before" again after a rollback would bring back the bad update.
  if (current.message.startsWith(`"${ROLLBACK}`))
    fail('beta is already rolled back; pass the group id to go further back');
  if (!previous || previous.runtimeVersion !== current.runtimeVersion)
    fail(`no earlier update for runtime ${current.runtimeVersion}; fix forward instead`);
  target = previous;
}

const args = [
  'eas-cli',
  'update:republish',
  '--group',
  target.group,
  '--destination-branch',
  'beta',
  '--message',
  `${ROLLBACK} ${target.message.replace(/^"([^"]*)".*$/, '$1')}`,
  '--non-interactive',
];
console.log(`→ bunx ${args.join(' ')}`);
if (dryRun) {
  console.log('✓ dry run — nothing republished');
  process.exit(0);
}
process.exit(spawnSync('bunx', args, { stdio: 'inherit' }).status ?? 1);
