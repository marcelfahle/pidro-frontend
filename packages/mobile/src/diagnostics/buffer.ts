// Exact private report v1 vocabulary. Never retain a caller's payload or error text.
export const diagnosticActions = [
  'bid',
  'pass',
  'play_card',
  'select_card',
  'confirm',
  'ready',
  'join',
  'leave',
  'reconnect',
  'none',
  'declare_trump',
  'select_hand',
  'select_dealer',
  'rematch',
  'set_pace',
  'continue_hand',
] as const;
export const diagnosticCodes = [
  'ok',
  'unavailable',
  'illegal_action',
  'not_your_turn',
  'disconnected',
  'reconnecting',
  'connected',
  'foreground',
  'background',
  'resumed',
  'paused',
  'expired',
  'stale',
  'pending',
  'received',
  'failed',
  'invalid_action',
  'invalid_phase',
  'card_not_in_hand',
  'must_follow_suit',
  'stale_readiness',
  'game_unavailable',
  'invalid_card',
  'action_failed',
] as const;
const types = ['tap', 'blocked', 'push', 'timeout', 'state', 'connection', 'lifecycle'] as const;
export type DiagnosticAction = (typeof diagnosticActions)[number];
export type DiagnosticCode = (typeof diagnosticCodes)[number];
export type DiagnosticType = (typeof types)[number];
export type DiagnosticEvent = {
  type: DiagnosticType;
  code: DiagnosticCode;
  action: DiagnosticAction;
  offset_ms: number;
  action_id?: string;
  state_revision?: number;
};
type Input = Omit<DiagnosticEvent, 'offset_ms'>;
export type GameReference = { room_code: string; game_instance_id: string };
export type DiagnosticSnapshot = GameReference & { owner: string; events: DiagnosticEvent[] };
const token = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
const revision = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

export function diagnosticAction(value: string): DiagnosticAction {
  return diagnosticActions.find((action) => action === value) ?? 'none';
}
export function diagnosticCode(value: unknown): DiagnosticCode {
  return diagnosticCodes.find((code) => code === value) ?? 'failed';
}

/** Memory only. Context generations also discard late replies from a previous game/user. */
export class DiagnosticBuffer {
  private owner: string | null = null;
  private room: string | null = null;
  private instance: string | null = null;
  private generation = 0;
  private observedRevision: number | undefined;
  private renderedRevision: number | undefined;
  private entries: { at: number; event: Input }[] = [];
  constructor(private clock: () => number = Date.now) {}

  identify(owner: string | null, room: string | null) {
    if (owner === this.owner && room === this.room) return;
    this.owner = owner;
    this.room = room;
    this.reset(null);
  }

  private reset(instance: string | null) {
    this.instance = instance;
    this.entries = [];
    this.observedRevision = undefined;
    this.renderedRevision = undefined;
    this.generation++;
  }

  observe(state: { game_instance_id?: unknown; state_revision?: unknown }) {
    const instance = token(state.game_instance_id) ? state.game_instance_id : null;
    if (instance !== this.instance) this.reset(instance);
    this.observedRevision = revision(state.state_revision) ? state.state_revision : undefined;
    this.record({ type: 'state', code: 'received', action: 'none' });
  }

  rendered(state: { game_instance_id?: unknown; state_revision?: unknown }) {
    if (state.game_instance_id !== this.instance || !revision(state.state_revision)) return;
    if (this.renderedRevision === state.state_revision) return;
    this.renderedRevision = state.state_revision;
    // A React commit, not proof that the OS displayed a frame. Separate from receive.
    this.record({
      type: 'state',
      code: 'resumed',
      action: 'none',
      state_revision: state.state_revision,
    });
  }

  record(input: Input) {
    if (!this.owner || !this.room || !types.includes(input.type)) return;
    const event: Input = {
      type: input.type,
      code: diagnosticCode(input.code),
      action: diagnosticAction(input.action),
    };
    if (token(input.action_id)) event.action_id = input.action_id;
    const cursor =
      input.state_revision ??
      (input.type === 'tap' ? this.renderedRevision : this.observedRevision);
    if (revision(cursor)) event.state_revision = cursor;
    const at = Math.max(this.entries.at(-1)?.at ?? 0, Math.floor(this.clock()));
    this.entries.push({ at, event });
    this.entries = this.entries.filter((entry) => at - entry.at <= 86_400_000).slice(-100);
  }

  attempt(action: DiagnosticAction, actionId?: string) {
    const generation = this.generation;
    return (type: DiagnosticType, code: DiagnosticCode) => {
      if (generation === this.generation) this.record({ type, code, action, action_id: actionId });
    };
  }

  snapshot(): DiagnosticSnapshot | null {
    if (!this.owner || !this.room || !/^[A-Z0-9]{4,12}$/.test(this.room) || !this.instance)
      return null;
    const now = this.clock();
    const recent = this.entries.filter((entry) => now - entry.at <= 86_400_000);
    if (!recent.length) return null;
    return {
      owner: this.owner,
      room_code: this.room,
      game_instance_id: this.instance,
      events: recent.map(({ at, event }) => ({ ...event, offset_ms: at - recent[0].at })),
    };
  }
}

export const gameDiagnostics = new DiagnosticBuffer();
