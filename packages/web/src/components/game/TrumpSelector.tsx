import type { GameViewModel, LegalAction, Suit } from '@pidro/shared';
import { SUIT_COLORS_RAW, SUIT_SYMBOLS } from '@pidro/shared';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

const SUIT_NAMES: Record<Suit, string> = {
  hearts: 'Hearts',
  diamonds: 'Diamonds',
  clubs: 'Clubs',
  spades: 'Spades',
};

interface TrumpSelectorProps {
  viewModel: GameViewModel;
  legalActions: LegalAction[];
  onDeclareTrump: (suit: Suit) => void;
}

export function TrumpSelector({ viewModel, legalActions, onDeclareTrump }: TrumpSelectorProps) {
  const youPosition = viewModel.players.find((p) => p.isYou)?.absolutePosition ?? null;
  const isYourTurn = viewModel.currentTurnAbsolute === youPosition;

  // Extract legal trump suits from legal actions
  const legalSuits = legalActions
    .filter((a): a is Extract<LegalAction, { type: 'declare_trump' }> => a.type === 'declare_trump')
    .map((a) => a.suit);

  // Who has the current turn
  const currentTurnPlayer = viewModel.players.find((p) => p.isCurrentTurn);
  const waitingForName = currentTurnPlayer?.isYou
    ? null
    : (currentTurnPlayer?.username ?? 'opponent');

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-2">
      {isYourTurn ? (
        <>
          <span className="text-sm font-medium text-yellow-400">Choose Trump Suit</span>
          <div className="grid grid-cols-2 gap-2">
            {SUITS.map((suit) => {
              const isLegal = legalSuits.length === 0 || legalSuits.includes(suit);
              return (
                <button
                  key={suit}
                  type="button"
                  onClick={() => onDeclareTrump(suit)}
                  disabled={!isLegal}
                  className="flex flex-col items-center rounded-lg bg-emerald-700/60 px-4 py-2 transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="text-2xl" style={{ color: SUIT_COLORS_RAW[suit] }}>
                    {SUIT_SYMBOLS[suit]}
                  </span>
                  <span className="text-xs text-white">{SUIT_NAMES[suit]}</span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <span className="text-sm text-emerald-400/60">
          Waiting for {waitingForName} to declare trump...
        </span>
      )}
    </div>
  );
}
