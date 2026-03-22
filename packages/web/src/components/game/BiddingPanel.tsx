import type {
  GameViewModel,
  LegalAction,
  ServerGameState,
} from "@pidro/shared";

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
    .filter((a): a is Extract<LegalAction, { type: "bid" }> => a.type === "bid")
    .map((a) => a.amount);

  const canPass = legalActions.some((a) => a.type === "pass");
  const isYourTurn = legalBidAmounts.length > 0 || canPass;
  const currentBid = serverState.current_bid ?? 0;
  const bidWinner =
    serverState.bid_winner ?? serverState.highest_bid?.position ?? null;
  const bidWinnerPlayer = bidWinner
    ? viewModel.players.find((p) => p.absolutePosition === bidWinner)
    : null;
  const bidWinnerName = bidWinnerPlayer?.isYou
    ? "You"
    : (bidWinnerPlayer?.username ?? null);
  const currentTurnPlayer = viewModel.players.find((p) => p.isCurrentTurn);
  const waitingForName = currentTurnPlayer?.isYou
    ? null
    : (currentTurnPlayer?.username ?? "opponent");

  return (
    <div className="pidro-panel flex w-[168px] flex-col items-center gap-2 rounded-xl p-3">
      {currentBid > 0 && (
        <div className="text-center">
          <div className="text-[8px] font-black uppercase tracking-[0.22em] text-cyan-50/60">
            Current bid
          </div>
          <div className="mt-0.5 text-2xl font-black text-white">
            {currentBid}
          </div>
        </div>
      )}

      {isYourTurn ? (
        <div className="w-full">
          <div className="grid grid-cols-3 gap-1.5">
            {ALL_BID_VALUES.map((amount) => {
              const isLegal = legalBidAmounts.includes(amount);
              return (
                <button
                  key={amount}
                  type="button"
                  disabled={!isLegal}
                  onClick={() => isLegal && onBid(amount)}
                  className={`rounded-md py-1.5 text-sm font-black transition-all ${
                    isLegal
                      ? "border border-cyan-200/65 bg-cyan-400/12 text-white shadow-[0_4px_10px_rgba(0,0,0,0.14)] hover:-translate-y-0.5 hover:border-cyan-100 hover:bg-cyan-400/18"
                      : "border border-white/8 text-white/25 line-through decoration-white/30"
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
              className="mt-2 w-full rounded-md border border-cyan-200/30 bg-white/8 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-50/80 transition-all hover:bg-white/14"
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
