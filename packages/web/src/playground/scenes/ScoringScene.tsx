import type { Position } from '@pidro/shared';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { GameInfoBar } from '../../components/game/GameInfoBar';
import { InspectorSection, Slider, StageFrame } from '../chrome';
import type { SceneContext, SceneSlots } from '../types';

const VIEWER: Position = 'south';
const BASE = { north_south: 37, east_west: 29 };
const DEFAULTS = { us: 6, them: 0 };

export function ScoringScene({
  ctx,
  children,
}: {
  ctx: SceneContext;
  children: (slots: SceneSlots) => React.ReactNode;
}) {
  const [usDelta, setUsDelta] = useState(DEFAULTS.us);
  const [themDelta, setThemDelta] = useState(DEFAULTS.them);

  const speed = ctx.speed;
  const mountKey = `${ctx.playKey}:${usDelta}:${themDelta}`;

  // Reset to the pre-hand scores synchronously so the bar re-mounts clean,
  // then award the delta a beat later so GameInfoBar's bump fires once.
  const [scores, setScores] = useState(BASE);
  const [prevMountKey, setPrevMountKey] = useState(mountKey);
  if (mountKey !== prevMountKey) {
    setPrevMountKey(mountKey);
    setScores(BASE);
  }

  // Read deltas through a ref so the award timer only re-arms on a fresh mount.
  const deltaRef = useRef({ us: usDelta, them: themDelta });
  deltaRef.current = { us: usDelta, them: themDelta };

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-arm the award on every replay / delta change (mountKey)
  useEffect(() => {
    const { us, them } = deltaRef.current;
    const target = { north_south: BASE.north_south + us, east_west: BASE.east_west + them };
    const t = setTimeout(() => setScores(target), Math.round(250 / speed));
    return () => clearTimeout(t);
  }, [mountKey, speed]);

  const wrapperVars = {
    '--score-bump-duration': `${Math.round(400 / speed)}ms`,
  } as CSSProperties;

  const stage = (
    <StageFrame>
      <div className="flex h-full w-full flex-col items-center justify-center gap-6">
        <div className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-50/45">
          Hand 3 scored
        </div>
        <div key={mountKey} className="scale-[1.6]" style={wrapperVars}>
          <GameInfoBar scores={scores} viewerPosition={VIEWER} handNumber={4} roomCode="LAB" />
        </div>
        <div className="text-[12px] font-bold text-cyan-50/45">
          Us {scores.north_south} · Them {scores.east_west} — tap the score to expand hand history
        </div>
      </div>
    </StageFrame>
  );

  const inspector = (
    <>
      <InspectorSection
        title="Points awarded"
        right={
          <button
            type="button"
            onClick={() => {
              setUsDelta(DEFAULTS.us);
              setThemDelta(DEFAULTS.them);
            }}
            className="rounded-md border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-cyan-50/70 transition-colors hover:border-cyan-300/40 hover:text-white"
          >
            Reset
          </button>
        }
      >
        <div className="space-y-3.5">
          <Slider
            label="Us (+)"
            value={usDelta}
            min={0}
            max={14}
            step={1}
            unit="pts"
            isDefault={usDelta === DEFAULTS.us}
            onChange={setUsDelta}
          />
          <Slider
            label="Them (+)"
            value={themDelta}
            min={0}
            max={14}
            step={1}
            unit="pts"
            isDefault={themDelta === DEFAULTS.them}
            onChange={setThemDelta}
          />
        </div>
        <p className="mt-3 text-[11px] leading-snug text-cyan-50/45">
          Scores animate from {BASE.north_south}–{BASE.east_west}. The changed total bumps; Replay
          re-runs it{speed !== 1 ? ` (at ${speed}×)` : ''}.
        </p>
      </InspectorSection>
    </>
  );

  return children({ stage, inspector });
}
