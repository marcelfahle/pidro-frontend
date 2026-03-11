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
  const legalSuits = legalActions
    .filter((a): a is Extract<LegalAction, { type: 'declare_trump' }> => a.type === 'declare_trump')
    .map((a) => a.suit);
  const isYourTurn = legalSuits.length > 0;

  const currentTurnPlayer = viewModel.players.find((p) => p.isCurrentTurn);
  const waitingForName = currentTurnPlayer?.isYou
    ? null
    : (currentTurnPlayer?.username ?? 'opponent');

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="pidro-panel w-full max-w-[360px] p-5 text-center">
        {isYourTurn ? (
          <>
            <div className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-[#fff0b2]">
              Choose Trump Suit
            </div>
            <div className="grid grid-cols-2 gap-3">
              {SUITS.map((suit) => {
                const isLegal = legalSuits.length === 0 || legalSuits.includes(suit);
                return (
                  <button
                    key={suit}
                    type="button"
                    onClick={() => onDeclareTrump(suit)}
                    disabled={!isLegal}
                    className="rounded-[8px] border border-white/50 bg-[linear-gradient(180deg,#fcfcfc_0%,#ececec_100%)] px-4 py-4 shadow-[0_8px_14px_rgba(0,0,0,0.14)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <div className="text-5xl" style={{ color: SUIT_COLORS_RAW[suit] }}>
                      {SUIT_SYMBOLS[suit]}
                    </div>
                    <div className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-slate-800">
                      {SUIT_NAMES[suit]}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="rounded-full border border-cyan-300/20 bg-black/10 px-5 py-3 text-sm font-black text-cyan-50/80">{`Waiting for ${waitingForName} to declare trump...`}</div>
        )}
      </div>
    </div>
  );
}
