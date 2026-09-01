import type {
  ActiveTurnTimer,
  GamePhase,
  LegalAction,
  ServerGameState,
  ServerTurnTimerPayload,
} from '../types/game';
import type { Position } from '../types/lobby';

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function normalizeTurnTimer(payload: unknown): ActiveTurnTimer | null {
  if (!payload || typeof payload !== 'object') return null;

  const data = payload as Partial<ServerTurnTimerPayload>;
  const timerId = asNumber(data.timer_id);
  const durationMs = asNumber(data.duration_ms);
  const transitionDelayMs = asNumber(data.transition_delay_ms);
  const eventSeq = asNumber(data.event_seq);

  if (
    timerId == null ||
    durationMs == null ||
    transitionDelayMs == null ||
    eventSeq == null ||
    (data.scope !== 'seat' && data.scope !== 'room') ||
    typeof data.phase !== 'string'
  ) {
    return null;
  }

  const remainingMs = asNumber(data.remaining_ms) ?? durationMs + transitionDelayMs;

  return {
    timerId,
    scope: data.scope,
    position: (data.position as Position | null | undefined) ?? null,
    phase: data.phase as GamePhase,
    durationMs,
    transitionDelayMs,
    serverTime: typeof data.server_time === 'string' ? data.server_time : new Date().toISOString(),
    remainingMs,
    receivedAtMs: Date.now(),
    eventSeq,
  };
}

export function describeGameAction(action: Record<string, unknown> | undefined): string {
  switch (action?.type) {
    case 'pass':
      return 'passed';
    case 'bid':
      return `bid ${String(action.amount ?? '')}`.trim();
    case 'declare_trump':
      return `declared ${String(action.suit ?? 'trump')}`;
    case 'play_card':
      return 'played a card';
    case 'select_hand':
      return 'selected a hand';
    case 'select_dealer':
      return 'selected the dealer';
    default:
      return 'acted';
  }
}

export function extractGameState(
  data: Record<string, unknown> | undefined,
): ServerGameState | null {
  if (!data) return null;

  const nestedData =
    data.data && typeof data.data === 'object' ? (data.data as Record<string, unknown>) : undefined;
  const candidates = [data.state, data.game_state, nestedData?.game_state, nestedData?.state, data];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object' && 'phase' in candidate) {
      return candidate as ServerGameState;
    }
  }

  return null;
}

export function shouldAutoSelectDealer(
  gameState: ServerGameState,
  legalActions: LegalAction[],
  position: Position | null,
): boolean {
  return (
    position === 'north' &&
    gameState.phase === 'dealer_selection' &&
    !gameState.dealer_selection_cuts &&
    legalActions.some((action) => action.type === 'select_dealer')
  );
}
