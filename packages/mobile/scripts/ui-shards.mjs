export function partitionCases(cases, partition, costs) {
  if (!partition) return cases;
  const match = /^([1-9]\d*)\/([1-9]\d*)$/.exec(partition);
  const [current, total] = match ? match.slice(1).map(Number) : [];
  if (!Number.isSafeInteger(total) || current > total || total > cases.length) {
    throw new Error('UI_PARTITION must be current/total with 1 <= current <= total <= case count');
  }
  const measured = Object.values(costs)
    .filter((ms) => Number.isFinite(ms) && ms > 0)
    .sort((a, b) => a - b);
  const fallback = measured[Math.floor(measured.length / 2)] ?? 1000;
  const cost = ({ id }) => (costs[id] > 0 ? costs[id] : fallback);
  const buckets = Array.from({ length: total }, () => ({ ms: 0, ids: new Set() }));
  for (const item of [...cases].sort((a, b) => cost(b) - cost(a))) {
    const bucket = buckets.reduce((lightest, next) => (next.ms < lightest.ms ? next : lightest));
    bucket.ids.add(item.id);
    bucket.ms += cost(item);
  }
  return cases.filter(({ id }) => buckets[current - 1].ids.has(id));
}

export function verifyCoverage(expected, completed) {
  const missing = new Set(expected);
  const seen = new Set();
  for (const { id } of completed) {
    if (seen.has(id)) throw new Error(`Duplicate visual case: ${id}`);
    if (!missing.delete(id)) throw new Error(`Unexpected visual case: ${id}`);
    seen.add(id);
  }
  if (missing.size) throw new Error(`Missing visual cases: ${[...missing].join(', ')}`);
}
