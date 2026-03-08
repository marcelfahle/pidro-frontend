import type {
  Card as CardType,
  LegalAction,
  RelativePosition,
  SeatStatus,
  Suit,
} from '@pidro/shared';
import type { CSSProperties } from 'react';
import { Card } from './Card';
import { GamePlayerCard } from './GamePlayerCard';

interface PlayerHandProps {
  position: RelativePosition;
  cards: CardType[] | null;
  cardCount: number | null;
  username: string | null;
  isYou: boolean;
  isDealer: boolean;
  isCurrentTurn: boolean;
  isConnected: boolean;
  isTeammate?: boolean;
  seatStatus?: SeatStatus;
  legalActions: LegalAction[];
  trumpSuit: Suit | null;
  statusText?: string;
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
  isTeammate = false,
  seatStatus = 'normal',
  legalActions,
  trumpSuit,
  statusText,
  onPlayCard,
  shaking = false,
}: PlayerHandProps) {
  const isVertical = position === 'east' || position === 'west';
  const sortedCards = cards ? sortPlayerCards(cards, trumpSuit) : null;
  const showFaceUp = isYou && sortedCards !== null;
  const count = sortedCards?.length ?? cardCount ?? 0;
  const displayName = username ?? (isYou ? 'You' : 'Bot');
  const initial = displayName[0]?.toUpperCase() ?? '?';
  const roleLabel = isYou ? 'You' : isTeammate ? 'Partner' : 'Opponent';
  const isBot = seatStatus === 'bot_substitute' || seatStatus === 'permanent_bot';
  const isReconnecting = seatStatus === 'reconnecting';
  const resolvedStatus = isReconnecting
    ? 'Reconnecting...'
    : !isConnected && !isBot
      ? 'Offline'
      : (statusText ?? (isCurrentTurn ? 'Your turn' : isDealer ? 'Dealer' : 'Ready'));

  const hasPlayableCards = isYou && legalActions.some((a) => a.type === 'play_card');

  const dimWrapper = (!isConnected || isReconnecting) && !isBot;
  const wrapperClass =
    position === 'south'
      ? `flex w-full items-end justify-center gap-2.5 max-[390px]:flex-col max-[390px]:items-center ${dimWrapper ? 'opacity-50' : ''}`
      : `flex w-full flex-col items-center gap-1.5 ${dimWrapper ? 'opacity-50' : ''}`;

  const cardRailClass =
    position === 'south'
      ? 'flex flex-1 items-end justify-center'
      : isVertical
        ? 'flex flex-col items-center justify-center'
        : 'flex items-start justify-center';

  return (
    <div className={wrapperClass}>
      <GamePlayerCard
        displayName={displayName}
        roleLabel={roleLabel}
        statusText={resolvedStatus}
        initial={initial}
        isYou={isYou}
        isDealer={isDealer}
        isCurrentTurn={isCurrentTurn}
        isConnected={isConnected}
        seatStatus={seatStatus}
        className={
          position === 'south'
            ? 'min-w-[168px] max-lg:min-w-[148px] max-md:min-w-[132px] max-lg:gap-2 max-lg:px-2.5 max-lg:py-2'
            : 'w-full max-w-[180px] max-lg:max-w-[148px] max-md:max-w-[124px] max-lg:grid-cols-[36px_1fr] max-lg:gap-2 max-lg:px-2.5 max-lg:py-2'
        }
      />

      {count === 0 ? (
        <div className="flex h-16 items-center justify-center rounded-xl border border-dashed border-cyan-300/15 bg-black/10 px-4">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-cyan-50/45">
            No cards
          </span>
        </div>
      ) : showFaceUp ? (
        <div className={`${cardRailClass} ${shaking ? 'animate-shake' : ''}`}>
          {sortedCards.map((card, index) => {
            const playable = hasPlayableCards && isCardPlayable(card, legalActions);
            const isTrump = trumpSuit !== null && card.suit === trumpSuit;

            return (
              <div
                key={`${card.rank}-${card.suit}`}
                style={cardOffsetStyle(index, sortedCards.length, position)}
              >
                <Card
                  card={card}
                  size="lg"
                  playable={playable}
                  isTrump={isTrump}
                  onClick={playable && onPlayCard ? () => onPlayCard(card) : undefined}
                  className={!playable && hasPlayableCards ? 'opacity-60' : ''}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className={cardRailClass}>
          {Array.from({ length: count }, (_, i) => (
            <div key={`back-${i.toString()}`} style={cardOffsetStyle(i, count, position)}>
              <Card faceDown size={position === 'south' ? 'lg' : 'md'} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function cardOffsetStyle(index: number, total: number, position: RelativePosition): CSSProperties {
  const middle = (total - 1) / 2;
  const offset = index - middle;

  if (position === 'east' || position === 'west') {
    // Tighten vertical overlap when there are many cards
    const baseOverlap = -38;
    const overlap = total > 7 ? baseOverlap - Math.min(10, (total - 7) * 2) : baseOverlap;
    return {
      marginTop: index === 0 ? 0 : overlap,
      transform: `translateX(${Math.abs(offset) * 1.5}px) rotate(${offset * (position === 'west' ? -2 : 2)}deg)`,
      zIndex: index + 1,
    };
  }

  // Tighten horizontal overlap when there are many cards (e.g. 13 during second_deal)
  const baseSouth = -22;
  const baseNorth = -18;
  const southOverlap = total > 8 ? baseSouth - Math.min(20, (total - 8) * 4) : baseSouth;
  const northOverlap = total > 7 ? baseNorth - Math.min(12, (total - 7) * 3) : baseNorth;
  const hOverlap = position === 'south' ? southOverlap : northOverlap;

  return {
    marginLeft: index === 0 ? 0 : hOverlap,
    transform: `translateY(${position === 'south' ? Math.abs(offset) * 3 : 0}px) rotate(${offset * 2.5}deg)`,
    zIndex: index + 1,
  };
}

function sortPlayerCards(cards: CardType[], trumpSuit: Suit | null): CardType[] {
  const candidateOrder: Suit[] = trumpSuit
    ? [trumpSuit, 'spades', 'hearts', 'clubs', 'diamonds']
    : ['spades', 'hearts', 'clubs', 'diamonds'];
  const suitOrder = candidateOrder.filter((suit, index) => candidateOrder.indexOf(suit) === index);

  return [...cards].sort((a, b) => {
    const suitDiff = suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
    if (suitDiff !== 0) return suitDiff;
    return b.rank - a.rank;
  });
}
