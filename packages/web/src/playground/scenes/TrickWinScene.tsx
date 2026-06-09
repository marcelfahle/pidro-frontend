import type { Card as CardType, Position, RelativePosition, Suit } from '@pidro/shared';
import { SUIT_SYMBOLS } from '@pidro/shared';
import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '../../components/game/Card';
import {
  InspectorSection,
  Segmented,
  Slider,
  TableStage,
  Timeline,
  type TimelineRow,
} from '../chrome';
import { makeViewModel, POSITIONS, SUITS, seatName } from '../mockGame';
import type { SceneContext, SceneSlots } from '../types';

const DEFAULTS = { flashDelay: 250, sweepDelay: 650, sweepDur: 450 };
const VIEWER: Position = 'south';

// Viewer sits south, so absolute === relative here.
const CARDS: Record<RelativePosition, CardType> = {
  north: { rank: 13, suit: 'spades' },
  east: { rank: 7, suit: 'hearts' },
  south: { rank: 4, suit: 'clubs' },
  west: { rank: 9, suit: 'diamonds' },
};

const SWEEP_DIR: Record<RelativePosition, [number, number]> = {
  north: [0, -1],
  south: [0, 1],
  east: [1, 0],
  west: [-1, 0],
};

const SEAT_OPTIONS = POSITIONS.map((pos) => ({
  label: pos.charAt(0).toUpperCase(),
  value: pos,
  title: seatName(pos, VIEWER),
}));

export function TrickWinScene({
  ctx,
  children,
}: {
  ctx: SceneContext;
  children: (slots: SceneSlots) => React.ReactNode;
}) {
  const [winner, setWinner] = useState<Position>('east');
  const [trump, setTrump] = useState<Suit>('hearts');
  const [flashDelay, setFlashDelay] = useState(DEFAULTS.flashDelay);
  const [sweepDelay, setSweepDelay] = useState(DEFAULTS.sweepDelay);
  const [sweepDur, setSweepDur] = useState(DEFAULTS.sweepDur);

  const [localNonce, setLocalNonce] = useState(0);
  const mountKey = `${ctx.playKey}:${localNonce}:${winner}`;
  const replay = () => setLocalNonce((n) => n + 1);

  const [phase, setPhase] = useState(0); // 0 shown · 1 flashed · 2 swept
  const [prevMountKey, setPrevMountKey] = useState(mountKey);
  if (mountKey !== prevMountKey) {
    setPrevMountKey(mountKey);
    setPhase(0);
  }

  const speed = ctx.speed;

  // Read timings through a ref so the sequence only re-arms on a fresh mount.
  const cfgRef = useRef({ flashDelay, sweepDelay, sweepDur });
  cfgRef.current = { flashDelay, sweepDelay, sweepDur };

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-arm on every replay / param change (mountKey)
  useEffect(() => {
    const { flashDelay: fd, sweepDelay: sd, sweepDur: dur } = cfgRef.current;
    const t1 = setTimeout(() => setPhase(1), Math.round(fd / speed));
    const t2 = setTimeout(() => setPhase(2), Math.round((fd + sd) / speed));
    // Settle back to the trick on the table so the resting state stays meaningful.
    const t3 = setTimeout(() => setPhase(0), Math.round((fd + sd + dur + 600) / speed));
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [mountKey, speed]);

  const winnerRel = winner as RelativePosition;
  const [sx, sy] = SWEEP_DIR[winnerRel];
  const swept = phase >= 2;
  const sweepMs = Math.round(sweepDur / speed);
  const flashMs = Math.round(900 / speed);

  const viewModel = makeViewModel({ viewer: VIEWER, phase: 'playing', trump, dealer: null });

  function cell(rel: RelativePosition) {
    const card = CARDS[rel];
    const isWinner = rel === winnerRel;
    const sweepStyle: CSSProperties = {
      transform: swept ? `translate(${sx * 200}px, ${sy * 200}px) scale(0.8)` : 'none',
      opacity: swept ? 0 : 1,
      // Only transition while playing; the settle-back to rest should snap, not reverse-sweep.
      transition:
        phase >= 1
          ? `transform ${sweepMs}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${sweepMs}ms ease-out`
          : 'none',
    };
    return (
      <div className="flex h-[5.5rem] w-[3.75rem] items-center justify-center">
        <div style={sweepStyle}>
          <div
            className={phase >= 1 && isWinner ? 'animate-trick-win rounded-lg' : ''}
            style={{ '--trick-win-duration': `${flashMs}ms` } as CSSProperties}
          >
            <Card card={card} size="md" />
          </div>
        </div>
      </div>
    );
  }

  const timelineRows = useMemo<TimelineRow[]>(
    () => [
      {
        key: 'flash',
        label: 'Flash',
        sub: seatName(winner, VIEWER),
        startMs: flashDelay,
        durMs: 900,
        accent: true,
      },
      {
        key: 'sweep',
        label: 'Sweep',
        sub: 'gather',
        startMs: flashDelay + sweepDelay,
        durMs: sweepDur,
      },
    ],
    [winner, flashDelay, sweepDelay, sweepDur],
  );
  const totalMs = Math.max(...timelineRows.map((r) => r.startMs + r.durMs));
  const litKeys = new Set<string>();
  if (phase >= 1) litKeys.add('flash');
  if (phase >= 2) litKeys.add('sweep');

  const stage = (
    <TableStage players={viewModel.players}>
      <div key={mountKey} className="grid grid-cols-[1fr_auto_1fr] place-items-center gap-3">
        <div />
        {cell('north')}
        <div />
        {cell('west')}
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan-300/15 bg-black/10">
          <span className="text-xl text-cyan-50/45">{SUIT_SYMBOLS[trump]}</span>
        </div>
        {cell('east')}
        <div />
        {cell('south')}
        <div />
      </div>
    </TableStage>
  );

  const inspector = (
    <>
      <InspectorSection title="Winner">
        <Segmented
          options={SEAT_OPTIONS}
          value={winner}
          onChange={(p) => {
            setWinner(p);
            replay();
          }}
          columns={4}
        />
        <p className="mt-2 text-[11px] leading-snug text-cyan-50/45">
          The winning card flashes gold, then the trick sweeps to that seat.
        </p>
      </InspectorSection>

      <InspectorSection title="Trump pip">
        <Segmented
          options={SUITS.map((s) => ({ label: SUIT_SYMBOLS[s], value: s, title: s }))}
          value={trump}
          onChange={setTrump}
          columns={4}
        />
      </InspectorSection>

      <InspectorSection
        title="Timings · base 1×"
        right={
          <button
            type="button"
            onClick={() => {
              setFlashDelay(DEFAULTS.flashDelay);
              setSweepDelay(DEFAULTS.sweepDelay);
              setSweepDur(DEFAULTS.sweepDur);
              replay();
            }}
            className="rounded-md border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-cyan-50/70 transition-colors hover:border-cyan-300/40 hover:text-white"
          >
            Reset
          </button>
        }
      >
        <div className="space-y-3.5">
          <Slider
            label="Flash delay"
            value={flashDelay}
            min={0}
            max={1000}
            step={25}
            isDefault={flashDelay === DEFAULTS.flashDelay}
            onChange={setFlashDelay}
          />
          <Slider
            label="Sweep delay"
            value={sweepDelay}
            min={0}
            max={1500}
            step={25}
            isDefault={sweepDelay === DEFAULTS.sweepDelay}
            onChange={setSweepDelay}
          />
          <Slider
            label="Sweep duration"
            value={sweepDur}
            min={150}
            max={1200}
            step={25}
            isDefault={sweepDur === DEFAULTS.sweepDur}
            onChange={setSweepDur}
          />
        </div>
      </InspectorSection>

      <InspectorSection
        title="Timeline"
        right={
          speed !== 1 ? (
            <span className="font-mono text-[11px] text-amber-300/80">viewing {speed}×</span>
          ) : undefined
        }
      >
        <Timeline rows={timelineRows} totalMs={totalMs} litKeys={litKeys} />
      </InspectorSection>
    </>
  );

  return children({ stage, inspector });
}
