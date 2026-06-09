import type { Position, Suit } from '@pidro/shared';
import { getRankLabel, SUIT_SYMBOLS } from '@pidro/shared';
import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { TrickArea } from '../../components/game/TrickArea';
import {
  InspectorSection,
  Segmented,
  Slider,
  TableStage,
  Timeline,
  type TimelineRow,
} from '../chrome';
import { makeServerState, makeViewModel, SUITS } from '../mockGame';
import type { SceneContext, SceneSlots } from '../types';

const DEFAULTS = { interval: 700, flyIn: 1300 };

// A believable trick: spades led, East trumps in with a heart and wins.
const TRICK: { player: Position; card: { rank: number; suit: Suit } }[] = [
  { player: 'south', card: { rank: 13, suit: 'spades' } },
  { player: 'west', card: { rank: 4, suit: 'spades' } },
  { player: 'north', card: { rank: 14, suit: 'spades' } },
  { player: 'east', card: { rank: 7, suit: 'hearts' } },
];

const VIEWER: Position = 'south';

function cardLabel(card: { rank: number; suit: Suit }): string {
  return `${getRankLabel(card.rank)}${SUIT_SYMBOLS[card.suit]}`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function TrickPlayScene({
  ctx,
  children,
}: {
  ctx: SceneContext;
  children: (slots: SceneSlots) => React.ReactNode;
}) {
  const [trump, setTrump] = useState<Suit>('hearts');
  const [interval, setIntervalMs] = useState(DEFAULTS.interval);
  const [flyIn, setFlyIn] = useState(DEFAULTS.flyIn);

  const [localNonce, setLocalNonce] = useState(0);
  const mountKey = `${ctx.playKey}:${localNonce}:${trump}`;
  const replay = () => setLocalNonce((n) => n + 1);

  // Reset playback whenever a fresh sequence mounts.
  const [playCount, setPlayCount] = useState(0);
  const [prevMountKey, setPrevMountKey] = useState(mountKey);
  if (mountKey !== prevMountKey) {
    setPrevMountKey(mountKey);
    setPlayCount(0);
  }

  const speed = ctx.speed;

  // Reveal plays one at a time.
  useEffect(() => {
    if (playCount >= TRICK.length) return;
    const t = setTimeout(() => setPlayCount((c) => c + 1), Math.round(interval / speed));
    return () => clearTimeout(t);
  }, [playCount, interval, speed]);

  const currentTurn = TRICK[playCount]?.player ?? null;
  const viewModel = makeViewModel({ viewer: VIEWER, phase: 'playing', trump, currentTurn });
  const serverState = makeServerState({
    phase: 'playing',
    trump,
    current_player: currentTurn,
    current_trick: TRICK.slice(0, playCount),
    tricks: [],
  });

  const stageVars = { '--card-enter-duration': `${Math.round(flyIn / speed)}ms` } as CSSProperties;

  const timelineRows = useMemo<TimelineRow[]>(
    () =>
      TRICK.map((play, i) => ({
        key: `play-${i}`,
        label: `Play ${i + 1}`,
        sub: `${cap(play.player)} ${cardLabel(play.card)}`,
        startMs: interval * (i + 1),
        durMs: flyIn,
        accent: play.player === 'east',
      })),
    [interval, flyIn],
  );
  const totalMs = useMemo(
    () => Math.max(...timelineRows.map((r) => r.startMs + r.durMs)),
    [timelineRows],
  );
  const litKeys = useMemo(
    () => new Set(TRICK.slice(0, playCount).map((_, i) => `play-${i}`)),
    [playCount],
  );

  const playedByPos = new Map(TRICK.slice(0, playCount).map((p) => [p.player, p.card]));
  const statusFor = (p: { absolutePosition: Position; isCurrentTurn: boolean }) => {
    const card = playedByPos.get(p.absolutePosition);
    if (card) return cardLabel(card);
    if (p.isCurrentTurn) return 'To play';
    return undefined;
  };

  const stage = (
    <TableStage players={viewModel.players} statusFor={statusFor}>
      <div
        key={mountKey}
        className="flex h-full w-full items-center justify-center"
        style={stageVars}
      >
        <TrickArea viewModel={viewModel} serverState={serverState} />
      </div>
    </TableStage>
  );

  const inspector = (
    <>
      <InspectorSection title="Trump">
        <Segmented
          options={SUITS.map((s) => ({ label: SUIT_SYMBOLS[s], value: s, title: s }))}
          value={trump}
          onChange={(s) => {
            setTrump(s);
            replay();
          }}
          columns={4}
        />
        <p className="mt-2 text-[11px] leading-snug text-cyan-50/45">
          East trumps in last and takes the trick.
        </p>
      </InspectorSection>

      <InspectorSection
        title="Timings · base 1×"
        right={
          <button
            type="button"
            onClick={() => {
              setIntervalMs(DEFAULTS.interval);
              setFlyIn(DEFAULTS.flyIn);
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
            label="Play interval"
            value={interval}
            min={100}
            max={1500}
            step={50}
            isDefault={interval === DEFAULTS.interval}
            onChange={setIntervalMs}
          />
          <Slider
            label="Card fly-in"
            value={flyIn}
            min={200}
            max={3000}
            step={50}
            isDefault={flyIn === DEFAULTS.flyIn}
            onChange={setFlyIn}
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
