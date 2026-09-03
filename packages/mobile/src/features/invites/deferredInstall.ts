import {
  normalizeInviteCode,
  type DeferredInviteFingerprint,
  type DeferredInviteRequest,
  type DeferredScreenClass,
  type PendingInvite,
} from '@pidro/shared';

export const DEFERRED_ATTEMPT_KEY = 'deferred-install-attempted:v1';

const RETENTION_MS = 30 * 60 * 1_000;
const DEFAULT_TIMEOUT_MS = 3_000;

interface AttemptStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
}

interface DeferredInstallDependencies {
  pendingInvite: PendingInvite | null;
  platform: 'ios' | 'android' | 'other';
  storage: AttemptStorage;
  now: () => number;
  getInstallationTime: () => Promise<Date | null>;
  getPlayReferrer: () => Promise<string | null>;
  getFingerprint: () => Promise<DeferredInviteFingerprint | null>;
  getInstallId: () => Promise<string>;
  resolve: (request: DeferredInviteRequest, signal: AbortSignal) => Promise<string | null>;
  timeoutMs?: number;
}

export function screenClassFor(width: number, height: number): DeferredScreenClass {
  const smallerDimension = Math.min(width, height);
  if (smallerDimension < 600) return 'compact';
  if (smallerDimension < 900) return 'medium';
  return 'large';
}

export function parsePlayInstallReferrer(value: string | null): string | null {
  if (!value || value.includes('://')) return null;

  try {
    const params = new URLSearchParams(value);
    const inviteValues = params.getAll('invite');
    if (inviteValues.length !== 1) return null;
    return normalizeInviteCode(inviteValues[0] ?? '');
  } catch {
    return null;
  }
}

async function beforeDeadline<T>(promise: Promise<T>, remainingMs: number): Promise<T> {
  if (remainingMs <= 0) throw new Error('deferred install deadline exceeded');

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('deferred install deadline exceeded')),
          remainingMs
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function isFreshInstall(installationTime: Date | null, now: number): boolean {
  if (!installationTime) return false;
  const age = now - installationTime.getTime();
  return Number.isFinite(age) && age >= 0 && age <= RETENTION_MS;
}

export async function resolveDeferredInstall({
  pendingInvite,
  platform,
  storage,
  now,
  getInstallationTime,
  getPlayReferrer,
  getFingerprint,
  getInstallId,
  resolve,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: DeferredInstallDependencies): Promise<string | null> {
  try {
    if (await storage.getItem(DEFERRED_ATTEMPT_KEY)) return null;

    // Persist before any platform lookup or network request. A crash, timeout,
    // or failed match must not turn startup into a retry loop.
    await storage.setItem(DEFERRED_ATTEMPT_KEY, '1');

    if (pendingInvite || platform === 'other') return null;

    const startedAt = now();
    const deadline = startedAt + timeoutMs;
    const remaining = () => deadline - now();
    const [installationTime, rawReferrer] = await beforeDeadline(
      Promise.all([
        getInstallationTime(),
        platform === 'android' ? getPlayReferrer() : Promise.resolve(null),
      ]),
      remaining()
    );
    const referrerCode = platform === 'android' ? parsePlayInstallReferrer(rawReferrer) : null;
    const freshInstall = isFreshInstall(installationTime, startedAt);

    if (!freshInstall && !referrerCode) return null;

    const fingerprint = freshInstall ? await beforeDeadline(getFingerprint(), remaining()) : null;
    if (freshInstall && !fingerprint && !referrerCode) return null;

    const installId = await beforeDeadline(getInstallId(), remaining());
    const request: DeferredInviteRequest = {
      platform,
      install_id: installId,
      ...(referrerCode ? { referrer: `invite=${referrerCode}` } : {}),
      ...(freshInstall && fingerprint ? fingerprint : {}),
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.max(0, remaining()));
    try {
      const code = await beforeDeadline(resolve(request, controller.signal), remaining());
      return normalizeInviteCode(code ?? '');
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  } catch {
    return null;
  }
}
