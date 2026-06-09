import type { Card as CardType, Position } from '@pidro/shared';
import { mapRelativeToAbsolute, POS_ORDER } from '@pidro/shared';
import { type CSSProperties, useCallback, useMemo, useState } from 'react';
import { Card } from '../../components/game/Card';
import {
  type DealerRevealBeat,
  DealerSelectionReveal,
} from '../../components/game/DealerSelectionReveal';
import {
  InspectorSection,
  Segmented,
  Slider,
  StageFrame,
  Timeline,
  type TimelineRow,
} from '../chrome';
import type { SceneContext, SceneSlots } from '../types';

const DEFAULTS = {
  reveal: 350,
  highlightDelay: 200,
  flyIn: 1300,
  highlight: 300,
};

const DEFAULT_CUTS: Record<Position, CardType> = {
  north: { rank: 14, suit: 'spades' },
  east: { rank: 9, suit: 'hearts' },
  south: { rank: 12, suit: 'diamonds' },
  west: { rank: 4, suit: 'clubs' },
};

const POSITION_OPTIONS = POS_ORDER.map((pos) => ({
  label: pos.charAt(0).toUpperCase(),
  value: pos,
  title: cap(pos),
}));

// Cards reveal in this relative-slot order (matches DealerSelectionReveal's render order).
const REVEAL_SLOTS = ['north', 'west', 'east', 'south'] as const;

const SUITS: CardType['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function randomCuts(): Record<Position, CardType> {
  const used = new Set<string>();
  const out = {} as Record<Position, CardType>;
  for (const pos of POS_ORDER) {
    let card: CardType;
    do {
      card = {
        rank: 2 + Math.floor(Math.random() * 13),
        suit: SUITS[Math.floor(Math.random() * 4)],
      };
    } while (used.has(`${card.rank}-${card.suit}`));
    used.add(`${card.rank}-${card.suit}`);
    out[pos] = card;
  }
  return out;
}

export function DealerSelectionScene({
  ctx,
  children,
}: {
  ctx: SceneContext;
  children: (slots: SceneSlots) => React.ReactNode;
}) {
  const [dealer, setDealer] = useState<Position>('north');
  const [viewer, setViewer] = useState<Position>('south');
  const [cuts, setCuts] = useState<Record<Position, CardType>>(DEFAULT_CUTS);

  const [reveal, setReveal] = useState(DEFAULTS.reveal);
  const [highlightDelay, setHighlightDelay] = useState(DEFAULTS.highlightDelay);
  const [flyIn, setFlyIn] = useState(DEFAULTS.flyIn);
  const [highlight, setHighlight] = useState(DEFAULTS.highlight);

  // Local replay nonce — bumped on discrete param changes; combined with the
  // shell's global playKey so both the Replay button and param edits remount.
  const [localNonce, setLocalNonce] = useState(0);
  const mountKey = `${ctx.playKey}:${localNonce}`;
  const replay = useCallback(() => setLocalNonce((n) => n + 1), []);

  const [litKeys, setLitKeys] = useState<Set<string>>(() => new Set());

  // Reset the lit timeline whenever a fresh sequence mounts (React's
  // adjust-state-during-render pattern — no effect needed).
  const [prevMountKey, setPrevMountKey] = useState(mountKey);
  if (mountKey !== prevMountKey) {
    setPrevMountKey(mountKey);
    setLitKeys(new Set());
  }

  const handleBeat = useCallback((beat: DealerRevealBeat) => {
    const key = beat.kind === 'reveal' ? `card-${beat.index}` : 'highlight';
    setLitKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  const pickDealer = useCallback(
    (pos: Position) => {
      setDealer(pos);
      replay();
    },
    [replay],
  );
  const pickViewer = useCallback(
    (pos: Position) => {
      setViewer(pos);
      replay();
    },
    [replay],
  );
  const shuffle = useCallback(() => {
    setCuts(randomCuts());
    replay();
  }, [replay]);
  const resetTimings = useCallback(() => {
    setReveal(DEFAULTS.reveal);
    setHighlightDelay(DEFAULTS.highlightDelay);
    setFlyIn(DEFAULTS.flyIn);
    setHighlight(DEFAULTS.highlight);
    replay();
  }, [replay]);

  // Effective (speed-scaled) timings drive the live playback.
  const speed = ctx.speed;
  const effReveal = Math.round(reveal / speed);
  const effHighlightDelay = Math.round(highlightDelay / speed);
  const effFlyIn = Math.round(flyIn / speed);
  const effHighlight = Math.round(highlight / speed);

  const stageVars = {
    '--card-enter-duration': `${effFlyIn}ms`,
    '--dealer-highlight-duration': `${effHighlight}ms`,
  } as CSSProperties;

  // Predicted schedule uses the *base* (1×) values — the design intent you'd ship.
  const timelineRows = useMemo<TimelineRow[]>(() => {
    const rows: TimelineRow[] = REVEAL_SLOTS.map((rel, i) => ({
      key: `card-${i}`,
      label: `Card ${i + 1}`,
      sub: cap(mapRelativeToAbsolute(rel, viewer)),
      startMs: reveal * (i + 1),
      durMs: flyIn,
    }));
    rows.push({
      key: 'highlight',
      label: 'Winner',
      sub: cap(dealer),
      startMs: REVEAL_SLOTS.length * reveal + highlightDelay,
      durMs: highlight,
      accent: true,
    });
    return rows;
  }, [viewer, dealer, reveal, flyIn, highlightDelay, highlight]);

  const totalMs = useMemo(
    () => Math.max(...timelineRows.map((r) => r.startMs + r.durMs)),
    [timelineRows],
  );

  const stage = (
    <StageFrame>
      <SeatTag
        className="left-1/2 top-3 -translate-x-1/2"
        pos={mapRelativeToAbsolute('north', viewer)}
        dealer={dealer}
        viewer={viewer}
      />
      <SeatTag
        className="left-3 top-1/2 -translate-y-1/2"
        pos={mapRelativeToAbsolute('west', viewer)}
        dealer={dealer}
        viewer={viewer}
      />
      <SeatTag
        className="right-3 top-1/2 -translate-y-1/2"
        pos={mapRelativeToAbsolute('east', viewer)}
        dealer={dealer}
        viewer={viewer}
      />
      <SeatTag
        className="bottom-3 left-1/2 -translate-x-1/2"
        pos={mapRelativeToAbsolute('south', viewer)}
        dealer={dealer}
        viewer={viewer}
      />

      <div
        key={mountKey}
        className="absolute inset-[15%] flex items-center justify-center"
        style={stageVars}
      >
        <DealerSelectionReveal
          cuts={cuts}
          dealer={dealer}
          viewerPosition={viewer}
          revealIntervalMs={effReveal}
          highlightDelayMs={effHighlightDelay}
          onBeat={handleBeat}
        />
      </div>
    </StageFrame>
  );

  const inspector = (
    <>
      <InspectorSection title="Dealer · winner">
        <Segmented options={POSITION_OPTIONS} value={dealer} onChange={pickDealer} columns={4} />
        <p className="mt-2 text-[11px] leading-snug text-cyan-50/45">
          The seat whose card gets the gold ring once all four are down.
        </p>
      </InspectorSection>

      <InspectorSection title="Your seat · viewer">
        <Segmented options={POSITION_OPTIONS} value={viewer} onChange={pickViewer} columns={4} />
        <p className="mt-2 text-[11px] leading-snug text-cyan-50/45">
          Rotates the table — your seat always sits at the bottom.
        </p>
      </InspectorSection>

      <InspectorSection
        title="Drawn cards"
        right={
          <button
            type="button"
            onClick={shuffle}
            className="rounded-md border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-cyan-50/70 transition-colors hover:border-cyan-300/40 hover:text-white"
          >
            🎲 Shuffle
          </button>
        }
      >
        <div className="grid grid-cols-4 gap-2">
          {POS_ORDER.map((pos) => (
            <div key={pos} className="flex flex-col items-center gap-1">
              <Card card={cuts[pos]} size="sm" />
              <span
                className={`text-[10px] font-black uppercase tracking-wide ${
                  pos === dealer ? 'text-amber-300' : 'text-cyan-50/40'
                }`}
              >
                {pos.charAt(0).toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </InspectorSection>

      <InspectorSection
        title="Timings · base 1×"
        right={
          <button
            type="button"
            onClick={resetTimings}
            className="rounded-md border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-cyan-50/70 transition-colors hover:border-cyan-300/40 hover:text-white"
          >
            Reset
          </button>
        }
      >
        <div className="space-y-3.5">
          <Slider
            label="Reveal interval"
            value={reveal}
            min={0}
            max={900}
            step={25}
            isDefault={reveal === DEFAULTS.reveal}
            onChange={setReveal}
          />
          <Slider
            label="Highlight delay"
            value={highlightDelay}
            min={0}
            max={1200}
            step={25}
            isDefault={highlightDelay === DEFAULTS.highlightDelay}
            onChange={setHighlightDelay}
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
          <Slider
            label="Winner ring"
            value={highlight}
            min={0}
            max={1200}
            step={25}
            isDefault={highlight === DEFAULTS.highlight}
            onChange={setHighlight}
          />
        </div>
        <p className="mt-3 text-[11px] leading-snug text-cyan-50/45">
          Edits update the timeline live. Hit <span className="text-cyan-50/75">Replay</span> to
          watch with the new values.
        </p>
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

function SeatTag({
  pos,
  dealer,
  viewer,
  className,
}: {
  pos: Position;
  dealer: Position;
  viewer: Position;
  className: string;
}) {
  const isDealer = pos === dealer;
  const isYou = pos === viewer;
  return (
    <div className={`absolute z-10 flex items-center gap-1 ${className}`}>
      <span
        className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
          isDealer
            ? 'border-amber-300/60 bg-amber-400/15 text-amber-200'
            : 'border-white/10 bg-black/40 text-cyan-50/60'
        }`}
      >
        {cap(pos)}
        {isYou && <span className="ml-1 text-cyan-50/40">· you</span>}
      </span>
    </div>
  );
}
