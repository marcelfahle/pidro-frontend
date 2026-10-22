import { randomUUID } from './uuid';
import { diagnosticAction, gameDiagnostics, type DiagnosticCode } from './buffer';

type Attempt = { action: string; id?: string; record: ReturnType<typeof gameDiagnostics.attempt> };
let tapping: Attempt | undefined;

export function diagnosticAttempt(action: string): Attempt {
  let id: string | undefined;
  // Correlation must never prevent a move, even if native entropy is unavailable.
  try {
    id = randomUUID();
  } catch {
    /* Optional protocol metadata. */
  }
  return { action, id, record: gameDiagnostics.attempt(diagnosticAction(action), id) };
}

/** Synchronous input path only; never reuse this scope for a later attempt. */
export function actionTap<T>(action: string, run: () => T): T {
  const previous = tapping;
  tapping = diagnosticAttempt(action);
  tapping.record('tap', 'pending');
  try {
    return run();
  } finally {
    tapping = previous;
  }
}

export function cardTap(play: () => void) {
  actionTap('play_card', play);
}

export function blockedCardTap(code: DiagnosticCode) {
  cardTap(() => blockedPlay(code));
}

export function blockedPlay(code: DiagnosticCode) {
  (tapping ?? diagnosticAttempt('play_card')).record('blocked', code);
}

export function pushAttempt(action: string) {
  return tapping?.action === action ? tapping : diagnosticAttempt(action);
}
