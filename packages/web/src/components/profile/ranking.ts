/**
 * Pidro ranking model — the four player-profile axes share a single source of
 * display truth here. Ported from the Pidro Design System (`pidro-ds/ranking.jsx`).
 *
 * - Veteran (dedication): level 1–100 + uncapped Prestige. Carries the number.
 * - Skill (competence): a metallic emblem that swaps per tier. NEVER a number.
 * - Playstyle (character): the Aggression Meter needle.
 * - Mastery (achievements): permanent gold medals.
 *
 * Backend emits stable atoms (`veteran.level`, `skill.tier`); the display copy
 * lives here on the frontend so renames never touch the API.
 */

export type SkillTier = 'provisional' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'master';

export interface SkillMaterial {
  /** Player-facing display name (atom → label map lives here, not the API). */
  name: string;
  short: string;
  /** The "being placed" state — a distinct frosted treatment, not a low rank. */
  calibrating?: boolean;
  caption?: string;
  /** Metallic gradient stops. */
  hi: string;
  mid: string;
  lo: string;
  rim: string;
  /** Foreground glyph color. */
  ink: string;
  /** Outer glow color. */
  glow: string;
}

/** Skill tier → display name + metallic material. */
export const SKILL_MATERIALS: Record<SkillTier, SkillMaterial> = {
  provisional: {
    name: 'Unrated',
    short: 'Unrated',
    calibrating: true,
    caption: 'Being placed',
    hi: '#8AA0B2',
    mid: '#46586A',
    lo: '#2A3744',
    rim: '#9FB3C4',
    ink: '#CFE0EC',
    glow: 'rgba(120,150,175,0.0)',
  },
  bronze: {
    name: 'Novice',
    short: 'Novice',
    hi: '#F0B27C',
    mid: '#B87333',
    lo: '#6E3F16',
    rim: '#FFD9B0',
    ink: '#3A2008',
    glow: 'rgba(184,115,51,0.50)',
  },
  silver: {
    name: 'Steady Hand',
    short: 'Steady',
    hi: '#F6FAFD',
    mid: '#BAC8D3',
    lo: '#76858F',
    rim: '#FFFFFF',
    ink: '#2A3640',
    glow: 'rgba(200,215,228,0.50)',
  },
  gold: {
    name: 'Sharp',
    short: 'Sharp',
    hi: '#FFEFB0',
    mid: '#F1C232',
    lo: '#A87908',
    rim: '#FFF6D0',
    ink: '#5A3F00',
    glow: 'rgba(255,212,38,0.55)',
  },
  platinum: {
    name: 'Cardsharp',
    short: 'Cardsharp',
    hi: '#F6FDFF',
    mid: '#CFE6F0',
    lo: '#8FB2C4',
    rim: '#FFFFFF',
    ink: '#2C4250',
    glow: 'rgba(180,225,245,0.60)',
  },
  master: {
    name: 'Master',
    short: 'Master',
    hi: '#3F86AE',
    mid: '#0E3148',
    lo: '#04141F',
    rim: '#00CFFF',
    ink: '#CFF4FF',
    glow: 'rgba(0,207,255,0.60)',
  },
};

export function skillMaterial(tier: SkillTier | string | null | undefined): SkillMaterial {
  return SKILL_MATERIALS[(tier as SkillTier) ?? 'provisional'] ?? SKILL_MATERIALS.provisional;
}

/** Veteran milestone titles, attached at level thresholds. */
export const VETERAN_TITLES: { level: number; full: string; short: string }[] = [
  { level: 1, full: 'Newcomer', short: 'Newcomer' },
  { level: 5, full: 'Regular', short: 'Regular' },
  { level: 10, full: 'Old Hand', short: 'Old Hand' },
  { level: 20, full: 'Table Fixture', short: 'Fixture' },
  { level: 35, full: 'Mainstay', short: 'Mainstay' },
  { level: 50, full: 'Pillar of the Table', short: 'Pillar' },
  { level: 75, full: 'Living Legend', short: 'Legend' },
  { level: 100, full: 'Hall of Famer', short: 'Hall of Fame' },
];

export function veteranTitle(level: number): { level: number; full: string; short: string } {
  let t = VETERAN_TITLES[0];
  for (const row of VETERAN_TITLES) if (level >= row.level) t = row;
  return t;
}

export function playstyleLabel(v: number | null | undefined): string {
  if (v == null) return 'No read yet';
  if (v < 0.38) return 'Careful';
  if (v > 0.62) return 'Aggressive';
  return 'Balanced';
}

/** Compact XP formatting (1.2k, 5M). */
export function fmtXP(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1).replace(/\.0$/, '')}k`;
  return String(n);
}
