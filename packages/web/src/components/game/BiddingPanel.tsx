import type { GameViewModel, LegalAction, ServerGameState } from '@pidro/shared';
import { mapAbsoluteToRelative } from '@pidro/shared';

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
  const viewerPosition = viewModel.viewerPositionAbsolute;

  const legalBidAmounts = legalActions
    .filter((a): a is Extract<LegalAction, { type: 'bid' }> => a.type === 'bid')
    .map((a) => a.amount);

  const canPass = legalActions.some((a) => a.type === 'pass');
  const isYourTurn = legalBidAmounts.length > 0 || canPass;
  const bids = serverState.bids ?? {};
  const bidHistory = Object.entries(bids).map(([position, bid]) => {
    const relPos = mapAbsoluteToRelative(
      position as 'north' | 'east' | 'south' | 'west',
      viewerPosition,
    );
    const player = viewModel.players.find((p) => p.absolutePosition === position);
    const name = player?.isYou ? 'You' : (player?.username ?? relPos);
    return { name, bid: bid as number | 'pass' };
  });

  const currentBid = serverState.current_bid ?? 0;
  const bidWinner = serverState.bid_winner ?? serverState.highest_bid?.position ?? null;
  const bidWinnerPlayer = bidWinner
    ? viewModel.players.find((p) => p.absolutePosition === bidWinner)
    : null;
  const bidWinnerName = bidWinnerPlayer?.isYou ? 'You' : (bidWinnerPlayer?.username ?? null);
  const currentTurnPlayer = viewModel.players.find((p) => p.isCurrentTurn);
  const waitingForName = currentTurnPlayer?.isYou
    ? null
    : (currentTurnPlayer?.username ?? 'opponent');
  const visibleBidHistory = bidHistory.filter(
    ({ bid, name }) => bid === 'pass' || name !== bidWinnerName,
  );

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 max-sm:gap-2 text-center">
      <div className="pidro-panel w-full max-w-[180px] px-5 py-4 max-sm:px-3 max-sm:py-2">
        {currentBid > 0 ? (
          <>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-50/65">
              Current bid
            </div>
            <div className="mt-1 text-5xl font-black text-white">{currentBid}</div>
            {bidWinnerName && (
              <div className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-cyan-50/75">
                {bidWinnerName}
              </div>
            )}
          </>
        ) : (
          <div className="text-sm font-black uppercase tracking-[0.18em] text-cyan-50/75">
            No bids yet
          </div>
        )}
      </div>

      {isYourTurn ? (
        <div className="pidro-panel w-full max-w-[310px] p-4">
          <div className="mb-3 text-sm font-black uppercase tracking-[0.16em] text-[#fff0b2]">
            Your turn to bid
          </div>
          <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-4 max-sm:gap-2">
            {legalBidAmounts.map((amount) => {
              return (
                <button
                  key={amount}
                  type="button"
                  onClick={() => onBid(amount)}
                  className="rounded-[8px] border border-cyan-200/65 bg-cyan-400/12 px-0 py-3 text-2xl max-sm:py-2 max-sm:text-xl font-black text-white shadow-[0_8px_14px_rgba(0,0,0,0.14)] transition-all hover:-translate-y-0.5 hover:border-cyan-100 hover:bg-cyan-400/18"
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
              className="mt-4 max-sm:mt-2 w-full rounded-[7px] border-2 border-[#d99d1b] bg-[linear-gradient(180deg,rgba(255,213,88,0.22)_0%,transparent_36%),linear-gradient(180deg,#6d3000_0%,#4a1900_38%,#2f1100_100%)] px-4 py-3 text-base font-black uppercase tracking-[0.12em] text-[#ffd84a]"
            >
              Pass
            </button>
          )}
        </div>
      ) : (
        <div className="pidro-panel rounded-full px-5 py-3 text-sm font-black text-cyan-50/80">{`Waiting for ${waitingForName} to bid...`}</div>
      )}

      {visibleBidHistory.length > 0 && (
        <div className="flex max-w-[360px] flex-wrap justify-center gap-2 text-xs font-black uppercase tracking-[0.08em] text-cyan-50/78">
          {visibleBidHistory.map(({ name, bid }) => (
            <span
              key={name}
              className="rounded-full border border-cyan-300/15 bg-black/10 px-3 py-1.5"
            >
              <span>{`${name}: ${bid === 'pass' ? 'Pass' : bid}`}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
