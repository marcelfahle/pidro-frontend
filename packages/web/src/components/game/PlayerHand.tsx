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
  const visibleCards = sortedCards ?? [];
  const count = sortedCards?.length ?? cardCount ?? 0;
  const displayName = username ?? (isYou ? 'You' : 'Player');
  const initial = displayName[0]?.toUpperCase() ?? '?';
  const roleLabel = isYou ? 'You' : isTeammate ? 'Partner' : 'Opponent';
  const isBot = seatStatus === 'bot_substitute' || seatStatus === 'permanent_bot';
  const isReconnecting = seatStatus === 'reconnecting';
  const isVacant = seatStatus === 'vacant';
  const resolvedStatus = isReconnecting
    ? 'Reconnecting...'
    : isVacant
      ? 'Waiting for player...'
      : !isConnected && !isBot
        ? 'Offline'
        : (statusText ?? (isCurrentTurn ? 'Your turn' : isDealer ? 'Dealer' : 'Ready'));

  const hasPlayableCards = isYou && legalActions.some((a) => a.type === 'play_card');

  const dimWrapper = !isVacant && (!isConnected || isReconnecting) && !isBot;

  const playerCardProps = {
    displayName,
    roleLabel,
    statusText: resolvedStatus,
    initial,
    isYou,
    isDealer,
    isCurrentTurn,
    isConnected,
    seatStatus,
  };

  const cardRailClass =
    position === 'south'
      ? 'flex flex-1 items-center justify-center'
      : isVertical
        ? 'flex flex-col items-center justify-center'
        : 'flex items-start justify-center';

  // Desktop wrapper class
  const wrapperClass =
    position === 'south'
      ? `flex w-full items-end justify-center gap-2.5 max-sm:flex-col max-sm:items-center max-sm:gap-1 ${dimWrapper ? 'opacity-50' : ''}`
      : `flex w-full flex-col items-center gap-1.5 ${dimWrapper ? 'opacity-50' : ''}`;

  // Mobile east/west: rotated card rail peeking from edges
  if (isVacant) {
    return (
      <div className={wrapperClass}>
        <GamePlayerCard
          {...playerCardProps}
          className={
            position === 'south'
              ? 'min-w-[168px] max-lg:min-w-[148px] max-md:min-w-[132px] max-lg:gap-2 max-lg:px-2.5 max-lg:py-2'
              : 'w-full max-w-[180px] max-lg:max-w-[148px] max-md:max-w-[124px] max-lg:grid-cols-[36px_1fr] max-lg:gap-2 max-lg:px-2.5 max-lg:py-2'
          }
        />
        <WaitingForPlayer />
      </div>
    );
  }

  if (isVertical) {
    return (
      <div
        className={`${dimWrapper ? 'opacity-50' : ''} flex w-full flex-col items-center gap-1.5`}
      >
        {/* Desktop */}
        <div className="max-sm:hidden contents">
          {count === 0 ? (
            <NoCards />
          ) : showFaceUp ? (
            <div className={cardRailClass}>
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
                      className={
                        !playable && hasPlayableCards
                          ? 'brightness-[0.6] saturate-[0.3] translate-y-0.5'
                          : ''
                      }
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={cardRailClass}>
              {Array.from({ length: count }, (_, i) => (
                <div key={`back-${i.toString()}`} style={cardOffsetStyle(i, count, position)}>
                  <Card faceDown size="md" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mobile: rotated cards peeking from edge */}
        <div className="hidden max-sm:flex max-sm:flex-col max-sm:items-center max-sm:gap-0">
          {count > 0 && (
            <div className="flex flex-col items-center">
              {Array.from({ length: Math.min(count, 6) }, (_, i) => (
                <div
                  key={`peek-${i.toString()}`}
                  className="rotate-90"
                  style={{ marginTop: i === 0 ? 0 : -22 }}
                >
                  <Card faceDown size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // North position — cards only, avatar rendered separately in GameTable
  if (position === 'north') {
    return (
      <div
        className={`${dimWrapper ? 'opacity-50' : ''} flex w-full flex-col items-center`}
      >
        {count === 0 ? (
          <NoCards />
        ) : showFaceUp ? (
          <div className={cardRailClass}>
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
                    className={
                      !playable && hasPlayableCards
                        ? 'brightness-[0.6] saturate-[0.3] translate-y-0.5'
                        : ''
                    }
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className={cardRailClass}>
            {Array.from({ length: count }, (_, i) => (
              <div key={`back-${i.toString()}`} style={cardOffsetStyle(i, count, position)}>
                <Card faceDown size="md" />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // South position — cards only, avatar rendered separately in GameTable
  return (
    <div className={`flex w-full flex-col items-center ${dimWrapper ? 'opacity-50' : ''}`}>
      {count === 0 ? (
        <NoCards />
      ) : showFaceUp ? (
        <div className={`${cardRailClass} ${shaking ? 'animate-shake' : ''}`}>
          {visibleCards.map((card, index) => {
            const playable = hasPlayableCards && isCardPlayable(card, legalActions);
            const isTrump = trumpSuit !== null && card.suit === trumpSuit;

            return (
              <div
                key={`${card.rank}-${card.suit}`}
                style={cardOffsetStyle(index, visibleCards.length, position)}
              >
                <Card
                  card={card}
                  size="lg"
                  playable={playable}
                  isTrump={isTrump}
                  onClick={playable && onPlayCard ? () => onPlayCard(card) : undefined}
                  className={
                    !playable && hasPlayableCards
                      ? 'brightness-[0.6] saturate-[0.3] translate-y-0.5'
                      : ''
                  }
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className={cardRailClass}>
          {Array.from({ length: count }, (_, i) => (
            <div key={`back-${i.toString()}`} style={cardOffsetStyle(i, count, position)}>
              <Card faceDown size="lg" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NoCards() {
  return (
    <div className="flex h-16 items-center justify-center rounded-xl border border-dashed border-cyan-300/15 bg-black/10 px-4">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-cyan-50/45">
        No cards
      </span>
    </div>
  );
}

function WaitingForPlayer() {
  return (
    <div className="flex h-16 min-w-[168px] items-center justify-center gap-2 rounded-xl border border-dashed border-amber-300/40 bg-amber-400/10 px-4 text-center">
      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-200/90" />
      <span className="text-xs font-black uppercase tracking-[0.14em] text-amber-100/90">
        Waiting for player...
      </span>
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

  // North and south: flat row, no fan/curve
  return {
    marginLeft: index === 0 ? 0 : hOverlap,
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
