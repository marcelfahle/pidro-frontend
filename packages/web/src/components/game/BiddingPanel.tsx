import type { GameViewModel, LegalAction, ServerGameState } from '@pidro/shared';

const ALL_BID_VALUES = [6, 7, 8, 9, 10, 11, 12, 13, 14] as const;

interface BiddingPanelProps {
  viewModel: GameViewModel;
  serverState: ServerGameState;
  legalActions: LegalAction[];
  onBid: (amount: number) => void;
  onPass: () => void;
}

export function BiddingPanel({
  viewModel,
  serverState,
  legalActions,
  onBid,
  onPass,
}: BiddingPanelProps) {
  const legalBidAmounts = legalActions
    .filter((a): a is Extract<LegalAction, { type: 'bid' }> => a.type === 'bid')
    .map((a) => a.amount);

  const canPass = legalActions.some((a) => a.type === 'pass');
  const isYourTurn = legalBidAmounts.length > 0 || canPass;
  const currentBid = serverState.current_bid ?? 0;
  const currentTurnPlayer = viewModel.players.find((p) => p.isCurrentTurn);
  const waitingForName = currentTurnPlayer?.isYou
    ? null
    : (currentTurnPlayer?.username ?? 'opponent');

  return (
    <div className="pidro-panel flex w-[168px] flex-col items-center gap-2 rounded-xl p-3 short:w-auto short:max-w-[calc(100vw-32px)] short:flex-row short:gap-3 short:px-4 short:py-2">
      {currentBid > 0 && (
        <div className="text-center short:shrink-0">
          <div className="text-[8px] font-black uppercase tracking-[0.22em] text-cyan-50/60">
            Current bid
          </div>
          <div className="mt-0.5 text-2xl font-black text-white short:text-xl">{currentBid}</div>
        </div>
      )}

      {isYourTurn ? (
        <div className="w-full short:flex short:w-auto short:items-center short:gap-2">
          <div className="grid grid-cols-3 gap-1.5 short:grid-cols-9 short:gap-1">
            {ALL_BID_VALUES.map((amount) => {
              const isLegal = legalBidAmounts.includes(amount);
              return (
                <button
                  key={amount}
                  type="button"
                  disabled={!isLegal}
                  onClick={() => isLegal && onBid(amount)}
                  className={`rounded-md py-1.5 text-sm font-black transition-all short:min-w-9 short:px-1 ${
                    isLegal
                      ? 'border border-cyan-200/65 bg-cyan-400/12 text-white shadow-[0_4px_10px_rgba(0,0,0,0.14)] hover:-translate-y-0.5 hover:border-cyan-100 hover:bg-cyan-400/18'
                      : 'border border-white/8 text-white/25 line-through decoration-white/30'
                  }`}
                >
                  {amount}
                </button>
              );
            })}
          </div>
          {canPass && (
            <button
              type="button"
              onClick={onPass}
              className="mt-2 w-full rounded-md border border-cyan-200/30 bg-white/8 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-50/80 transition-all hover:bg-white/14 short:mt-0 short:w-auto short:shrink-0 short:whitespace-nowrap short:px-3 short:py-2.5"
            >
              Pass
            </button>
          )}
        </div>
      ) : (
        <div className="text-[10px] font-black text-cyan-50/70">{`Waiting for ${waitingForName}...`}</div>
      )}
    </div>
  );
}
