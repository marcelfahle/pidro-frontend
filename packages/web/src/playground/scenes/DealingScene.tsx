import type { Position, RelativePosition } from '@pidro/shared';
import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/game/Card';
import { InspectorSection, Slider, TableStage } from '../chrome';
import { makeViewModel } from '../mockGame';
import type { SceneContext, SceneSlots } from '../types';

const DEFAULTS = { perPlayer: 9, interval: 90, fly: 380 };
const VIEWER: Position = 'south';
const DEALER: Position = 'south';

// Cards go out clockwise from the top.
const ORDER: RelativePosition[] = ['north', 'east', 'south', 'west'];

const SEAT_BASE: Record<RelativePosition, { x: number; y: number }> = {
  north: { x: 0, y: -132 },
  south: { x: 0, y: 132 },
  east: { x: 196, y: 0 },
  west: { x: -196, y: 0 },
};

function dealTarget(rel: RelativePosition, k: number, perPlayer: number) {
  const base = SEAT_BASE[rel];
  const horizontal = rel === 'north' || rel === 'south';
  const fan = k - (perPlayer - 1) / 2;
  return {
    x: base.x + (horizontal ? fan * 13 : 0),
    y: base.y + (horizontal ? 0 : fan * 11),
    r: horizontal ? fan * 3 : 0,
  };
}

export function DealingScene({
  ctx,
  children,
}: {
  ctx: SceneContext;
  children: (slots: SceneSlots) => React.ReactNode;
}) {
  const [perPlayer, setPerPlayer] = useState(DEFAULTS.perPlayer);
  const [interval, setIntervalMs] = useState(DEFAULTS.interval);
  const [fly, setFly] = useState(DEFAULTS.fly);

  const [localNonce, setLocalNonce] = useState(0);
  const mountKey = `${ctx.playKey}:${localNonce}:${perPlayer}`;
  const replay = () => setLocalNonce((n) => n + 1);

  const total = perPlayer * 4;
  const [dealt, setDealt] = useState(0);
  const [prevMountKey, setPrevMountKey] = useState(mountKey);
  if (mountKey !== prevMountKey) {
    setPrevMountKey(mountKey);
    setDealt(0);
  }

  const speed = ctx.speed;

  useEffect(() => {
    if (dealt >= total) return;
    const t = setTimeout(() => setDealt((c) => c + 1), Math.round(interval / speed));
    return () => clearTimeout(t);
  }, [dealt, total, interval, speed]);

  const viewModel = makeViewModel({ viewer: VIEWER, phase: 'dealing', dealer: DEALER });

  const dealAreaVars = { '--deal-duration': `${Math.round(fly / speed)}ms` } as CSSProperties;

  const countByRel = useMemo(() => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < dealt; i++) {
      const rel = ORDER[i % 4];
      counts[rel] = (counts[rel] ?? 0) + 1;
    }
    return counts;
  }, [dealt]);

  const statusFor = (p: { relativePosition: RelativePosition }) => {
    const n = countByRel[p.relativePosition] ?? 0;
    return n > 0 ? `${n}` : undefined;
  };

  const totalMsBase = total * interval + fly;

  const stage = (
    <TableStage players={viewModel.players} statusFor={statusFor}>
      <div key={mountKey} className="relative h-full w-full" style={dealAreaVars}>
        {/* Deck */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            {dealt < total && (
              <>
                <div className="absolute -left-[3px] -top-[3px] opacity-70">
                  <Card faceDown size="sm" />
                </div>
                <div className="absolute -left-[1.5px] -top-[1.5px] opacity-85">
                  <Card faceDown size="sm" />
                </div>
              </>
            )}
            <Card faceDown size="sm" />
          </div>
        </div>

        {/* Dealt cards */}
        {Array.from({ length: dealt }).map((_, i) => {
          const rel = ORDER[i % 4];
          const k = Math.floor(i / 4);
          const { x, y, r } = dealTarget(rel, k, perPlayer);
          const cardVars = {
            '--deal-x': `${x}px`,
            '--deal-y': `${y}px`,
            '--deal-r': `${r}deg`,
          } as CSSProperties;
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: deal index is the stable identity here
              key={i}
              className="animate-deal-out absolute left-1/2 top-1/2"
              style={cardVars}
            >
              <Card faceDown size="sm" />
            </div>
          );
        })}
      </div>
    </TableStage>
  );

  const inspector = (
    <>
      <InspectorSection
        title="Deal"
        right={
          <button
            type="button"
            onClick={() => {
              setPerPlayer(DEFAULTS.perPlayer);
              setIntervalMs(DEFAULTS.interval);
              setFly(DEFAULTS.fly);
              replay();
            }}
            className="rounded-md border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-cyan-50/70 transition-colors hover:border-cyan-300/40 hover:text-white"
          >
            Reset
          </button>
        }
      >
        <Slider
          label="Cards per player"
          value={perPlayer}
          min={1}
          max={9}
          step={1}
          unit=""
          isDefault={perPlayer === DEFAULTS.perPlayer}
          onChange={setPerPlayer}
        />
        <p className="mt-2 text-[11px] leading-snug text-cyan-50/45">
          Pidro deals 9 each, then players discard to 6.
        </p>
      </InspectorSection>

      <InspectorSection title="Timings · base 1×">
        <div className="space-y-3.5">
          <Slider
            label="Deal interval"
            value={interval}
            min={30}
            max={400}
            step={10}
            isDefault={interval === DEFAULTS.interval}
            onChange={setIntervalMs}
          />
          <Slider
            label="Card fly-out"
            value={fly}
            min={150}
            max={1200}
            step={20}
            isDefault={fly === DEFAULTS.fly}
            onChange={setFly}
          />
        </div>
      </InspectorSection>

      <InspectorSection
        title="Progress"
        right={
          speed !== 1 ? (
            <span className="font-mono text-[11px] text-amber-300/80">viewing {speed}×</span>
          ) : undefined
        }
      >
        <div className="flex items-baseline justify-between font-mono text-[12px] tabular-nums text-white">
          <span>
            {dealt}
            <span className="text-cyan-50/45"> / {total} cards</span>
          </span>
          <span className="text-cyan-50/55">{(totalMsBase / 1000).toFixed(1)}s deal</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-cyan-400/80 transition-[width] duration-150"
            style={{ width: `${(dealt / total) * 100}%` }}
          />
        </div>
      </InspectorSection>
    </>
  );

  return children({ stage, inspector });
}
