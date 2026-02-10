import type { GameViewModel, ServerGameState, ServerTrick, Suit } from '@pidro/shared';
import { mapAbsoluteToRelative } from '@pidro/shared';
import { Card, getPidroPoints } from './Card';

function teamLabel(winner: string): string {
  return winner === 'north' || winner === 'south' ? 'NS' : 'EW';
}

function trickPointTotal(trick: ServerTrick, trumpSuit: Suit | null): number {
  let pts = 0;
  for (const play of trick.cards) {
    const p = trumpSuit ? getPidroPoints(play.card.rank, play.card.suit, trumpSuit) : null;
    if (p != null) pts += p;
  }
  return pts;
}

interface TrickAreaProps {
  viewModel: GameViewModel;
  serverState: ServerGameState;
}

export function TrickArea({ viewModel, serverState }: TrickAreaProps) {
  const youPosition = viewModel.players.find((p) => p.isYou)?.absolutePosition ?? null;
  const currentTrick = serverState.current_trick ?? [];
  const tricks = serverState.tricks ?? [];
  const trickNumber = tricks.length + 1;
  const trumpSuit: Suit | null = viewModel.trumpSuit;

  // Map trick plays to relative positions
  const trickByRelative: Record<string, { card: { rank: number; suit: Suit }; isLeader: boolean }> =
    {};
  for (let i = 0; i < currentTrick.length; i++) {
    const play = currentTrick[i];
    if (!youPosition) continue;
    const relPos = mapAbsoluteToRelative(play.player, youPosition);
    trickByRelative[relPos] = {
      card: play.card,
      isLeader: i === 0,
    };
  }

  // Calculate trick point total
  let trickPoints = 0;
  for (const play of currentTrick) {
    const pts = trumpSuit ? getPidroPoints(play.card.rank, play.card.suit, trumpSuit) : null;
    if (pts != null) trickPoints += pts;
  }

  // Who has the current turn
  const currentTurnPlayer = viewModel.players.find((p) => p.isCurrentTurn);
  const isYourTurn = currentTurnPlayer?.isYou ?? false;

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-1">
      {/* Trick header */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-emerald-400/70">Trick #{trickNumber}</span>
        {trickPoints > 0 && <span className="text-xs text-yellow-400/80">{trickPoints} pts</span>}
      </div>

      {/* 3x3 grid for trick plays: N at top-center, W at left, E at right, S at bottom-center */}
      <div className="grid grid-cols-3 grid-rows-3 place-items-center gap-1">
        {/* Row 1: _, North, _ */}
        <div />
        <TrickSlot position="north" data={trickByRelative.north} trumpSuit={trumpSuit} />
        <div />

        {/* Row 2: West, center, East */}
        <TrickSlot position="west" data={trickByRelative.west} trumpSuit={trumpSuit} />
        <div className="flex h-10 w-10 items-center justify-center">
          {isYourTurn && currentTrick.length < 4 && (
            <span className="text-xs text-yellow-400">Your turn</span>
          )}
        </div>
        <TrickSlot position="east" data={trickByRelative.east} trumpSuit={trumpSuit} />

        {/* Row 3: _, South, _ */}
        <div />
        <TrickSlot position="south" data={trickByRelative.south} trumpSuit={trumpSuit} />
        <div />
      </div>

      {/* Completed tricks */}
      {tricks.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 border-t border-emerald-600/30 pt-1">
          {tricks.map((trick, idx) => {
            const pts = trickPointTotal(trick, trumpSuit);
            return (
              <div key={idx} className="flex flex-col items-center gap-0.5">
                <div className="flex -space-x-4">
                  {trick.cards.map((play, j) => (
                    <Card key={j} card={play.card} size="sm" isTrump={play.card.suit === trumpSuit} />
                  ))}
                </div>
                <span className="text-[9px] text-emerald-400/70">
                  #{idx + 1} {teamLabel(trick.winner)}
                  {pts > 0 && <span className="ml-0.5 text-yellow-400/70">{pts}pt</span>}
                </span>
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
}: {
  position: string;
  data?: { card: { rank: number; suit: Suit }; isLeader: boolean };
  trumpSuit: Suit | null;
}) {
  if (!data) {
    // Empty slot — dashed border with position initial
    return (
      <div className="flex h-16 w-12 items-center justify-center rounded-md border border-dashed border-emerald-600/40">
        <span className="text-xs text-emerald-600/40">{POSITION_LABELS[position]}</span>
      </div>
    );
  }

  const pointValue = trumpSuit
    ? (getPidroPoints(data.card.rank, data.card.suit, trumpSuit) ?? undefined)
    : undefined;

  return (
    <div className="relative flex flex-col items-center">
      {data.isLeader && <span className="absolute -top-3 text-[9px] text-emerald-400/60">Led</span>}
      <Card
        card={data.card}
        size="md"
        isTrump={data.card.suit === trumpSuit}
        pointValue={pointValue}
      />
    </div>
  );
}
