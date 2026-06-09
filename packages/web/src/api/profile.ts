import type { SkillTier } from '../components/profile/ranking';
import { api } from './client';

/**
 * Player profile screen — mirrors `Profiles.public_profile/1` on the server
 * (the fail-closed allowlist; raw μ/σ never ship). One read feeds the whole
 * profile/identity surface.
 */
export interface PlayerProfile {
  user_id: string;

  games_played: number;
  wins: number;
  losses: number;
  win_rate: number;
  first_seen_at: string | null;
  account_age_days: number | null;

  skill: { tier: SkillTier; provisional: boolean };

  veteran: {
    level: number;
    xp: number;
    title: string;
    /** `[into, span]` toward the next level, or `"max"` at the cap. */
    progress: [number, number] | 'max';
    prestige: number;
    /** `[into, step]` toward the next Prestige star, or `null` below the cap. */
    prestige_progress: [number, number] | null;
  };

  heritage: string[];

  playstyle: {
    bidding_win_rate: number | null;
    aggression_needle: number | null;
    aggression_label: string | null;
    aggression_insufficient: boolean;
    avg_winning_bid: number | null;
  };

  achievements: {
    key: string;
    name: string;
    description: string;
    tier: number;
    awarded_at: string;
  }[];
  achievements_catalog: {
    key: string;
    name: string;
    description: string;
    tier: number;
    earned: boolean;
  }[];
}

interface ProfileEnvelope {
  data: PlayerProfile;
}

/** Fetch the authenticated user's full profile screen. */
export async function getProfile(): Promise<PlayerProfile> {
  const response = await api.get<ProfileEnvelope>('/api/v1/profile');
  return response.data.data;
}

/** Veteran progress as a 0–1 ring fraction (1 at the cap). */
export function veteranProgressFraction(progress: PlayerProfile['veteran']['progress']): number {
  if (progress === 'max') return 1;
  const [into, span] = progress;
  if (!span) return 0;
  return Math.min(1, Math.max(0, into / span));
}
