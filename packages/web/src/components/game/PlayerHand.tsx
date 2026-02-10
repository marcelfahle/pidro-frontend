import type { Card as CardType, LegalAction, RelativePosition, Suit } from '@pidro/shared';
import { sortCards } from '@pidro/shared';
import { Badge } from '../ui/Badge';
import { Card } from './Card';

interface PlayerHandProps {
  position: RelativePosition;
  cards: CardType[] | null;
  cardCount: number | null;
  username: string | null;
  isYou: boolean;
  isDealer: boolean;
  isCurrentTurn: boolean;
  isConnected: boolean;
  legalActions: LegalAction[];
  trumpSuit: Suit | null;
  onPlayCard?: (card: CardType) => void;
  shaking?: boolean;
}

function isCardPlayable(card: CardType, legalActions: LegalAction[]): boolean {
  return legalActions.some(
    (a) => a.type === 'play_card' && a.card.rank === card.rank && a.card.suit === card.suit,
  );
}

export function PlayerHand({
  position,
  cards,
  cardCount,
  username,
  isYou,
  isDealer,
  isCurrentTurn,
  isConnected,
  legalActions,
  trumpSuit,
  onPlayCard,
  shaking = false,
}: PlayerHandProps) {
  const isVertical = position === 'east' || position === 'west';
  const sortedCards = cards ? sortCards(cards, trumpSuit) : null;
  const showFaceUp = isYou && sortedCards !== null;
  const count = sortedCards?.length ?? cardCount ?? 0;

  const hasPlayableCards = isYou && legalActions.some((a) => a.type === 'play_card');

  return (
    <div
      className={`flex flex-col items-center gap-1 p-1 ${!isConnected ? 'opacity-50' : ''} ${isCurrentTurn ? 'rounded-lg ring-2 ring-yellow-400/60 bg-yellow-400/5' : ''}`}
    >
      {/* Player label */}
      <div className="flex items-center gap-1.5">
        <span className={`text-xs font-medium ${isYou ? 'text-blue-300' : 'text-emerald-200'}`}>
          {username ?? 'Empty'}
        </span>
        {isDealer && <Badge variant="yellow">D</Badge>}
        {isCurrentTurn && (
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-yellow-400" />
        )}
        {!isConnected && <Badge variant="red">DC</Badge>}
      </div>

      {/* Cards */}
      {count === 0 ? (
        <div className="flex h-16 items-center justify-center">
          <span className="text-xs text-emerald-400/50">No cards</span>
        </div>
      ) : showFaceUp ? (
        <div
          className={`flex ${isVertical ? 'flex-col -space-y-8' : 'flex-row -space-x-4'} items-center ${shaking ? 'animate-shake' : ''}`}
        >
          {sortedCards.map((card) => {
            const playable = hasPlayableCards && isCardPlayable(card, legalActions);
            const isTrump = trumpSuit !== null && card.suit === trumpSuit;

            return (
              <Card
                key={`${card.rank}-${card.suit}`}
                card={card}
                size="lg"
                playable={playable}
                isTrump={isTrump}
                onClick={playable && onPlayCard ? () => onPlayCard(card) : undefined}
                className={!playable && hasPlayableCards ? 'opacity-60' : ''}
              />
            );
          })}
        </div>
      ) : (
        <div
          className={`flex ${isVertical ? 'flex-col -space-y-8' : 'flex-row -space-x-6'} items-center`}
        >
          {Array.from({ length: count }, (_, i) => (
            <Card key={`back-${i.toString()}`} faceDown size="md" />
          ))}
        </div>
      )}
    </div>
  );
}
