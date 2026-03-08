import type { GameViewModel, Position, ServerGameState, ServerTrick, Suit } from '@pidro/shared';
import { mapAbsoluteToRelative, SUIT_SYMBOLS } from '@pidro/shared';
import { useEffect, useRef, useState } from 'react';
import { Card, getPidroPoints } from './Card';

function trickWinnerLabel(winner: Position, youPosition: Position | null): string {
  if (!youPosition) return isNorthSouth(winner) ? 'NS' : 'EW';
  const sameTeam = isNorthSouth(winner) === isNorthSouth(youPosition);
  return sameTeam ? 'Us' : 'Them';
}

function trickPointTotal(trick: ServerTrick, trumpSuit: Suit | null): number {
  let pts = 0;
  for (const play of trick.cards) {
    const p = trumpSuit ? getPidroPoints(play.card.rank, play.card.suit, trumpSuit) : null;
    if (p != null) pts += p;
  }
  return pts;
}

function isNorthSouth(position: Position): boolean {
  return position === 'north' || position === 'south';
}

const CARD_ENTER_CLASSES: Record<string, string> = {
  north: 'animate-card-enter-north',
  south: 'animate-card-enter-south',
  east: 'animate-card-enter-east',
  west: 'animate-card-enter-west',
};

interface TrickAreaProps {
  viewModel: GameViewModel;
  serverState: ServerGameState;
  optimisticCard?: { rank: number; suit: Suit } | null;
}

export function TrickArea({ viewModel, serverState, optimisticCard }: TrickAreaProps) {
  const youPosition = viewModel.players.find((p) => p.isYou)?.absolutePosition ?? null;
  const currentTrick = serverState.current_trick ?? [];
  const tricks = serverState.tricks ?? [];
  const trickNumber = tricks.length + 1;
  const trumpSuit: Suit | null = viewModel.trumpSuit;

  // Track which slots had cards on the previous render to detect newly played cards
  const prevSlotKeysRef = useRef<Set<string>>(new Set());

  const trickByRelative: Record<string, { card: { rank: number; suit: Suit }; isLeader: boolean }> =
    {};
  for (let i = 0; i < currentTrick.length; i++) {
    const play = currentTrick[i];
    if (!youPosition) continue;
    const relPos = mapAbsoluteToRelative(play.player, youPosition);
    trickByRelative[relPos] = { card: play.card, isLeader: i === 0 };
  }

  // Show optimistic card in the south (you) slot if not already present
  if (optimisticCard && !trickByRelative.south) {
    trickByRelative.south = {
      card: optimisticCard,
      isLeader: currentTrick.length === 0,
    };
  }

  // Determine which slots are new (just played this render)
  const currentSlotKeys = new Set(Object.keys(trickByRelative));
  const newSlots = new Set<string>();
  for (const key of currentSlotKeys) {
    if (!prevSlotKeysRef.current.has(key)) {
      newSlots.add(key);
    }
  }
  useEffect(() => {
    prevSlotKeysRef.current = currentSlotKeys;
  });

  // Track trick win: detect when the last completed trick just appeared
  const prevTrickCountRef = useRef(tricks.length);
  const [winningSlot, setWinningSlot] = useState<string | null>(null);

  useEffect(() => {
    if (tricks.length > prevTrickCountRef.current && tricks.length > 0) {
      const lastTrick = tricks[tricks.length - 1];
      if (youPosition) {
        const winRelPos = mapAbsoluteToRelative(lastTrick.winner, youPosition);
        setWinningSlot(winRelPos);
        const timer = setTimeout(() => setWinningSlot(null), 1000);
        return () => clearTimeout(timer);
      }
    }
    prevTrickCountRef.current = tricks.length;
  }, [tricks.length, youPosition, tricks]);

  let trickPoints = 0;
  for (const play of currentTrick) {
    const pts = trumpSuit ? getPidroPoints(play.card.rank, play.card.suit, trumpSuit) : null;
    if (pts != null) trickPoints += pts;
  }

  const currentTurnPlayer = viewModel.players.find((p) => p.isCurrentTurn);
  const isYourTurn = currentTurnPlayer?.isYou ?? false;

  return (
    <div className="flex h-full w-full flex-col items-center justify-between gap-4">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="rounded-full border border-cyan-300/20 bg-black/10 px-4 py-2 text-sm font-black uppercase tracking-[0.14em] text-cyan-50/82">
          Trick #{trickNumber}
        </div>
        {trumpSuit && (
          <div className="rounded-full border border-cyan-300/20 bg-black/10 px-4 py-2 text-sm font-black uppercase tracking-[0.14em] text-cyan-50/82">
            Trump {SUIT_SYMBOLS[trumpSuit]}
          </div>
        )}
        {trickPoints > 0 && (
          <div className="rounded-full border border-[#ffcc54]/30 bg-[#ffcc54]/10 px-4 py-2 text-sm font-black uppercase tracking-[0.14em] text-[#fff0b2]">
            {trickPoints} pts
          </div>
        )}
      </div>

      <div className="relative flex h-full w-full items-center justify-center">
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 place-items-center gap-2">
          <div />
          <TrickSlot
            position="north"
            data={trickByRelative.north}
            trumpSuit={trumpSuit}
            animate={newSlots.has('north')}
            isWinner={winningSlot === 'north'}
          />
          <div />

          <TrickSlot
            position="west"
            data={trickByRelative.west}
            trumpSuit={trumpSuit}
            animate={newSlots.has('west')}
            isWinner={winningSlot === 'west'}
          />
          <div className="flex h-24 w-24 items-center justify-center rounded-full border border-cyan-300/15 bg-black/10 shadow-inner max-sm:h-20 max-sm:w-20">
            {isYourTurn && currentTrick.length < 4 ? (
              <span className="text-center text-sm font-black uppercase tracking-[0.12em] text-[#fff0b2]">
                Your turn
              </span>
            ) : (
              <span className="text-4xl text-cyan-50/65">
                {trumpSuit ? SUIT_SYMBOLS[trumpSuit] : '•'}
              </span>
            )}
          </div>
          <TrickSlot
            position="east"
            data={trickByRelative.east}
            trumpSuit={trumpSuit}
            animate={newSlots.has('east')}
            isWinner={winningSlot === 'east'}
          />

          <div />
          <TrickSlot
            position="south"
            data={trickByRelative.south}
            trumpSuit={trumpSuit}
            animate={newSlots.has('south')}
            isWinner={winningSlot === 'south'}
          />
          <div />
        </div>
      </div>

      {tricks.length > 0 && (
        <div className="flex w-full flex-wrap items-center justify-center gap-2">
          {tricks.map((trick, idx) => {
            const pts = trickPointTotal(trick, trumpSuit);
            const trickKey = `trick-${idx.toString()}-${trick.winner}`;
            return (
              <div
                key={trickKey}
                className="rounded-2xl border border-cyan-300/15 bg-black/10 px-3 py-2 text-center"
              >
                <div className="flex justify-center -space-x-3">
                  {trick.cards.map((play) => (
                    <Card
                      key={`${play.card.rank}-${play.card.suit}`}
                      card={play.card}
                      size="sm"
                      isTrump={play.card.suit === trumpSuit}
                    />
                  ))}
                </div>
                <div className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-50/72">
                  #{idx + 1} {trickWinnerLabel(trick.winner, youPosition)}
                  {pts > 0 ? ` ${pts}pt` : ''}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const POSITION_LABELS: Record<string, string> = {
  north: 'N',
  east: 'E',
  south: 'S',
  west: 'W',
};

function TrickSlot({
  position,
  data,
  trumpSuit,
  animate = false,
  isWinner = false,
}: {
  position: string;
  data?: { card: { rank: number; suit: Suit }; isLeader: boolean };
  trumpSuit: Suit | null;
  animate?: boolean;
  isWinner?: boolean;
}) {
  if (!data) {
    return (
      <div className="flex h-24 w-16 items-center justify-center rounded-2xl border border-dashed border-cyan-300/20 bg-black/10 max-sm:h-20 max-sm:w-14">
        <span className="text-xs font-black uppercase tracking-[0.2em] text-cyan-50/35">
          {POSITION_LABELS[position]}
        </span>
      </div>
    );
  }

  const pointValue = trumpSuit
    ? (getPidroPoints(data.card.rank, data.card.suit, trumpSuit) ?? undefined)
    : undefined;

  const animClass = animate ? (CARD_ENTER_CLASSES[position] ?? '') : '';
  const winClass = isWinner ? 'animate-trick-win' : '';

  return (
    <div className={`relative flex flex-col items-center gap-1 ${animClass} ${winClass}`.trim()}>
      {data.isLeader && (
        <span className="rounded-full border border-cyan-300/25 bg-black/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-50/75">
          Led
        </span>
      )}
      <Card
        card={data.card}
        size="md"
        isTrump={data.card.suit === trumpSuit}
        pointValue={pointValue}
      />
    </div>
  );
}
