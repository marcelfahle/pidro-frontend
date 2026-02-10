import type { GameViewModel, ServerGameState } from '@pidro/shared';

interface GameOverOverlayProps {
  viewModel: GameViewModel;
  serverState: ServerGameState;
  onBackToLobby: () => void;
  onPlayAgain: () => void;
}

/**
 * Semi-transparent overlay shown when the game reaches 'complete' or 'game_over' phase.
 * Displays winner, final scores, and navigation buttons.
 */
export function GameOverOverlay({
  viewModel,
  serverState,
  onBackToLobby,
  onPlayAgain,
}: GameOverOverlayProps) {
  const scores = serverState.scores ?? { north_south: 0, east_west: 0 };
  const nsScore = scores.north_south;
  const ewScore = scores.east_west;

  // Determine winner
  const youPlayer = viewModel.players.find((p) => p.isYou);
  const youIsNS = youPlayer
    ? youPlayer.absolutePosition === 'north' || youPlayer.absolutePosition === 'south'
    : null;

  let winnerLabel: string;
  let youWon: boolean | null = null;

  if (nsScore > ewScore) {
    winnerLabel = 'North / South wins!';
    youWon = youIsNS === true;
  } else if (ewScore > nsScore) {
    winnerLabel = 'East / West wins!';
    youWon = youIsNS === false;
  } else {
    winnerLabel = "It's a tie!";
    youWon = null;
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-80 rounded-xl bg-gray-900 p-6 shadow-2xl">
        {/* Winner announcement */}
        <div className="mb-4 text-center">
          {youWon === true && (
            <div className="mb-1 text-sm font-medium text-emerald-400">You win!</div>
          )}
          {youWon === false && (
            <div className="mb-1 text-sm font-medium text-red-400">You lose</div>
          )}
          <h2 className="text-xl font-bold text-white">{winnerLabel}</h2>
        </div>

        {/* Final scores */}
        <div className="mb-4 flex justify-center gap-6">
          <div className="text-center">
            <div className="text-xs text-gray-400">North / South</div>
            <div
              className={`text-2xl font-bold ${nsScore >= ewScore ? 'text-emerald-400' : 'text-gray-300'}`}
            >
              {nsScore}
            </div>
          </div>
          <div className="text-2xl text-gray-600">vs</div>
          <div className="text-center">
            <div className="text-xs text-gray-400">East / West</div>
            <div
              className={`text-2xl font-bold ${ewScore >= nsScore ? 'text-emerald-400' : 'text-gray-300'}`}
            >
              {ewScore}
            </div>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBackToLobby}
            className="flex-1 rounded-md bg-gray-700 px-4 py-2 text-sm text-gray-200 transition-colors hover:bg-gray-600"
          >
            Back to Lobby
          </button>
          <button
            type="button"
            onClick={onPlayAgain}
            className="flex-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}
