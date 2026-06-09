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
    <div className="flex flex-col items-center gap-4 text-center short:gap-2">
      {isYourTurn ? (
        <>
          <div className="text-sm font-black uppercase tracking-[0.18em] text-[#fff0b2] short:text-xs">
            Call Suit
          </div>
          <div className="grid grid-cols-2 gap-2 short:grid-cols-4">
            {SUITS.map((suit) => {
              const isLegal = legalSuits.length === 0 || legalSuits.includes(suit);
              return (
                <button
                  key={suit}
                  type="button"
                  onClick={() => onDeclareTrump(suit)}
                  disabled={!isLegal}
                  className="rounded-[8px] border border-white/50 bg-[linear-gradient(180deg,#fcfcfc_0%,#ececec_100%)] px-3 py-2.5 shadow-[0_8px_14px_rgba(0,0,0,0.14)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 short:px-2.5 short:py-1.5"
                >
                  <div className="text-3xl short:text-2xl" style={{ color: SUIT_COLORS_RAW[suit] }}>
                    {SUIT_SYMBOLS[suit]}
                  </div>
                  <div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-800 short:mt-0.5 short:text-[9px]">
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
  );
}
