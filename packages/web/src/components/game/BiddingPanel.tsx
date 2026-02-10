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
  const youPosition = viewModel.players.find((p) => p.isYou)?.absolutePosition ?? null;
  const isYourTurn = viewModel.currentTurnAbsolute === youPosition;

  // Extract legal bid amounts from legal actions
  const legalBidAmounts = legalActions
    .filter((a): a is Extract<LegalAction, { type: 'bid' }> => a.type === 'bid')
    .map((a) => a.amount)
    .sort((a, b) => a - b);

  const canPass = legalActions.some((a) => a.type === 'pass');

  // Build bid history from serverState.bids
  const bids = serverState.bids ?? {};
  const bidHistory = Object.entries(bids).map(([position, bid]) => {
    const relPos = youPosition
      ? mapAbsoluteToRelative(position as 'north' | 'east' | 'south' | 'west', youPosition)
      : position;
    const player = viewModel.players.find((p) => p.absolutePosition === position);
    const name = player?.isYou ? 'You' : (player?.username ?? relPos);
    return { name, bid: bid as number | 'pass' };
  });

  // Current highest bid
  const currentBid = serverState.current_bid ?? 0;
  const bidWinner = serverState.bid_winner ?? serverState.highest_bid?.position ?? null;
  const bidWinnerPlayer = bidWinner
    ? viewModel.players.find((p) => p.absolutePosition === bidWinner)
    : null;
  const bidWinnerName = bidWinnerPlayer?.isYou ? 'You' : (bidWinnerPlayer?.username ?? null);

  // Who has the current turn
  const currentTurnPlayer = viewModel.players.find((p) => p.isCurrentTurn);
  const waitingForName = currentTurnPlayer?.isYou
    ? null
    : (currentTurnPlayer?.username ?? 'opponent');

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-2">
      {/* Current bid display */}
      <div className="text-center">
        {currentBid > 0 ? (
          <div>
            <span className="text-xs text-emerald-400/70">Current bid</span>
            <div className="text-2xl font-bold text-white">{currentBid}</div>
            {bidWinnerName && <span className="text-xs text-emerald-300">{bidWinnerName}</span>}
          </div>
        ) : (
          <span className="text-sm text-emerald-400/60">No bids yet</span>
        )}
      </div>

      {/* Action area */}
      {isYourTurn ? (
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-medium text-yellow-400">Your turn to bid</span>

          {/* Bid buttons */}
          <div className="flex flex-wrap justify-center gap-1">
            {legalBidAmounts.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => onBid(amount)}
                className="h-8 w-8 rounded-md bg-emerald-600 text-sm font-bold text-white transition-colors hover:bg-emerald-500"
              >
                {amount}
              </button>
            ))}
          </div>

          {/* Pass button */}
          {canPass && (
            <button
              type="button"
              onClick={onPass}
              className="rounded-md bg-gray-600 px-4 py-1.5 text-sm text-gray-200 transition-colors hover:bg-gray-500"
            >
              Pass
            </button>
          )}
        </div>
      ) : (
        <span className="text-sm text-emerald-400/60">Waiting for {waitingForName} to bid...</span>
      )}

      {/* Bid history */}
      {bidHistory.length > 0 && (
        <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-0.5">
          {bidHistory.map(({ name, bid }) => (
            <span key={name} className="text-xs text-emerald-400/50">
              {name}: {bid === 'pass' ? 'Pass' : bid}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
