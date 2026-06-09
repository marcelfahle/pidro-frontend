import type { SkillTier } from './ranking';

/**
 * Per-player post-game "what changed" summary — mirrors the server's
 * `PostGameSummary.build/2` (PID-52), pushed on the `progression_summary`
 * channel event at game over. XP/level are always present (the guaranteed
 * signal, win or lose); `rating` + `achievements_unlocked` are populated only
 * for ranked (4-human) games.
 */
export interface ProgressionSummary {
  rated: boolean;
  xp_earned: number;
  veteran_xp: number;
  veteran_level_before: number;
  veteran_level: number;
  leveled_up: boolean;
  veteran_title_before: string;
  veteran_title: string;
  title_changed: boolean;
  veteran_progress: { into: number; span: number; max: boolean };
  achievements_unlocked: { key: string; name: string; tier: number }[];
  rating: {
    tier_before: SkillTier;
    tier_after: SkillTier;
    provisional_before: boolean;
    provisional_after: boolean;
    direction: 'up' | 'down' | 'none';
  } | null;
}

/** Defensive coercion of a raw channel payload into a ProgressionSummary, or null. */
export function parseProgressionSummary(payload: unknown): ProgressionSummary | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  if (typeof p.veteran_level !== 'number' || typeof p.xp_earned !== 'number') return null;
  return p as unknown as ProgressionSummary;
}
