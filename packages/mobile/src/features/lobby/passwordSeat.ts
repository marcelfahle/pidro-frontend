import { errorPayload, t } from '@pidro/shared';
import type { Position, Room } from '@pidro/shared';
import { apiErrorInfo } from '@/utils/apiErrors';
import { tableRow } from './tableRow';

/** What the keypad shows: the digits so far, and whether a line or a wait replaces the help. */
export type PasswordEntry = {
  digits: string;
  status: 'typing' | 'sending' | 'wrong' | 'wait';
};

export const emptyEntry: PasswordEntry = { digits: '', status: 'typing' };

/** The fourth digit sends it; nothing types while it is sent or while the server says wait. */
export function enterDigit(entry: PasswordEntry, digit: string): PasswordEntry {
  if (!/^\d$/.test(digit) || entry.status === 'sending' || entry.status === 'wait') return entry;
  const digits = entry.digits + digit;
  return { digits, status: digits.length === 4 ? 'sending' : 'typing' };
}

export function deleteDigit(entry: PasswordEntry): PasswordEntry {
  if (entry.status === 'sending' || entry.status === 'wait') return entry;
  return { ...entry, digits: entry.digits.slice(0, -1) };
}

/** The server's answer to a password that did not seat you: the boxes clear either way. */
export function answerEntry(answer: 'wrong' | 'wait'): PasswordEntry {
  return { digits: '', status: answer };
}

/** How the keypad reads a refused join: wrong, wait so many seconds, or not its business. */
export function passwordAnswer(error: unknown): 'wrong' | { wait: number } | undefined {
  const code = apiErrorInfo(error).code?.toUpperCase();
  if (code === 'SEAT_REQUIRES_PASSWORD') return 'wrong';
  if (code !== 'RATE_LIMITED') return undefined;
  // The body first: a browser cannot read Retry-After across origins.
  const body = errorPayload(error) as { error_params?: { retry_after?: unknown } };
  const header = (error as { response?: { headers?: Record<string, unknown> } })?.response
    ?.headers?.['retry-after'];
  const seconds = [body.error_params?.retry_after, header]
    .map(Number)
    .find((value) => Number.isFinite(value) && value > 0);
  return { wait: seconds ? Math.ceil(seconds) : 60 };
}

/** The wait line: the board's minute, or the minutes the server really asks for. */
export function passwordWaitLine(seconds: number): string {
  return seconds <= 60
    ? t('social.password_wait')
    : t('social.password_wait_minutes', { minutes: Math.ceil(seconds / 60) });
}

/** The panel's words for one seat: whose table, the rules, and the seat's relation to the host. */
export function passwordSeatWords(room: Room, position: Position) {
  const seats = tableRow(room, 'open_tables').seats;
  const host = seats.find((seat) => seat.id && seat.id === room.host_id);
  const name = host?.name ?? t('social.player');
  const northSouth = (seat: Position) => seat === 'north' || seat === 'south';
  return {
    host: name,
    table: t('social.password_table', { name }),
    seat: t(
      host && northSouth(host.position) !== northSouth(position)
        ? 'social.password_opponent'
        : 'social.password_partner',
      { rules: t(`rules.${room.config?.rule_set ?? 'finnish'}`), name }
    ),
  };
}
