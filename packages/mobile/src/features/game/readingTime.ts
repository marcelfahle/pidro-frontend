/**
 * The least time a table message stays up so a slow reader can finish it: a
 * moment to notice it, then time for every character. A tap may always close
 * one sooner; nothing else may.
 */
const NOTICE_MS = 1500;
const PER_CHARACTER_MS = 60;

export function readingTimeMs(text: string): number {
  return NOTICE_MS + PER_CHARACTER_MS * Array.from(text.trim()).length;
}
