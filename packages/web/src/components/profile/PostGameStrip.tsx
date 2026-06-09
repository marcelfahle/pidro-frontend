import { MasteryMedal } from '../ds/profile';
import type { ProgressionSummary } from './postgame';
import { skillMaterial } from './ranking';
import { SkillEmblem } from './SkillEmblem';

/**
 * PostGameStrip — the end-of-game "what changed" beat (PID-52).
 *
 * Always shows the guaranteed signal: XP earned + level (even on a loss).
 * For ranked games it adds the skill-tier move and any achievements unlocked.
 * Casual games lead with Veteran/Mastery and never show a loud skill number.
 */

export function PostGameStrip({ summary }: { summary: ProgressionSummary }) {
  const { veteran_progress: progress } = summary;
  const pct = progress.max ? 1 : progress.span ? Math.min(1, progress.into / progress.span) : 0;

  const rating = summary.rating;
  const tierMoved = rating && rating.tier_before !== rating.tier_after;
  const afterMat = rating
    ? skillMaterial(rating.provisional_after ? 'provisional' : rating.tier_after)
    : null;

  return (
    <div
      className="mt-6 text-left"
      style={{
        background: 'rgba(8,28,52,0.55)',
        border: '1.5px solid rgba(0,200,255,0.25)',
        borderRadius: 'var(--pidro-radius-lg)',
        padding: 18,
      }}
    >
      <div className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-cyan-50/55">
        What changed
      </div>

      <div className="flex flex-col gap-3">
        {/* Veteran — always present */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 min-w-11 items-center justify-center px-2"
            style={{
              background: 'linear-gradient(180deg, #8A6030 0%, #5A3515 45%, #321A08 100%)',
              border: '2px solid var(--pidro-gold-dark)',
              borderRadius: 999,
              fontFamily: 'var(--pidro-font-display)',
              fontSize: 20,
              color: 'var(--pidro-gold)',
            }}
          >
            {summary.veteran_level}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-[family-name:var(--pidro-font-display)] text-lg text-white">
                {summary.veteran_title}
              </span>
              {summary.leveled_up && (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em]"
                  style={{
                    background: 'rgba(255,212,38,0.18)',
                    border: '1px solid var(--pidro-gold)',
                    color: 'var(--pidro-gold)',
                  }}
                >
                  Level up!
                </span>
              )}
              <span className="ml-auto font-[family-name:var(--pidro-font-display)] text-base text-cyan-200">
                +{summary.xp_earned} XP
              </span>
            </div>
            <div
              className="mt-1.5 h-2 overflow-hidden rounded-full"
              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div
                style={{
                  width: `${pct * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #2E86C1, #00CFFF)',
                  boxShadow: '0 0 8px rgba(0,207,255,0.5)',
                  transition: 'width 600ms ease',
                }}
              />
            </div>
          </div>
        </div>

        {/* Skill — ranked games only */}
        {rating && afterMat && (
          <div className="flex items-center gap-3 border-t border-cyan-300/10 pt-3">
            <SkillEmblem
              tier={rating.provisional_after ? 'provisional' : rating.tier_after}
              size={40}
            />
            <div>
              <div className="text-xs font-black uppercase tracking-[0.14em] text-cyan-50/55">
                Skill
              </div>
              <div className="font-[family-name:var(--pidro-font-display)] text-base text-white">
                {tierMoved ? (
                  <>
                    {rating.direction === 'up' ? 'Promoted to ' : 'Now '}
                    {afterMat.name}
                  </>
                ) : (
                  afterMat.name
                )}
              </div>
            </div>
            {rating.direction !== 'none' && (
              <span
                className="ml-auto text-xl"
                style={{ color: rating.direction === 'up' ? 'var(--pidro-online)' : '#FF8A8A' }}
              >
                {rating.direction === 'up' ? '▲' : '▼'}
              </span>
            )}
          </div>
        )}

        {/* Mastery — achievements unlocked */}
        {summary.achievements_unlocked.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-cyan-300/10 pt-3">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-cyan-50/55">
              Unlocked
            </span>
            {summary.achievements_unlocked.map((a) => (
              <span
                key={a.key}
                className="inline-flex items-center gap-2 rounded-full bg-black/20 py-1 pl-1 pr-3"
              >
                <MasteryMedal state="earned" size={28} />
                <span className="text-sm font-bold text-white">{a.name}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
