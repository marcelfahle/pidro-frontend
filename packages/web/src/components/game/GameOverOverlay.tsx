import type { GameViewModel, ServerGameState } from '@pidro/shared';
import { getTeamScores, isNorthSouthTeam } from '@pidro/shared';
import { Button } from '../ui/Button';

interface GameOverOverlayProps {
  viewModel: GameViewModel;
  serverState: ServerGameState;
  onBackToLobby: () => void;
  onPlayAgain: () => void;
}

export function GameOverOverlay({
  viewModel,
  serverState,
  onBackToLobby,
  onPlayAgain,
}: GameOverOverlayProps) {
  const rawScores = serverState.scores ?? { north_south: 0, east_west: 0 };
  const youPlayer = viewModel.players.find((p) => p.isYou);
  const youPosition = youPlayer?.absolutePosition ?? null;
  const teamScores = getTeamScores(rawScores, youPosition);

  let winnerLabel: string;
  let youWon: boolean | null = null;

  if (teamScores.us > teamScores.them) {
    winnerLabel = 'Your team wins!';
    youWon = true;
  } else if (teamScores.them > teamScores.us) {
    winnerLabel = 'Opponents win!';
    youWon = false;
  } else {
    winnerLabel = "It's a tie!";
    youWon = null;
  }

  const winnersAreNorthSouth =
    teamScores.us === teamScores.them
      ? null
      : isNorthSouthTeam(youPosition ?? 'north') === teamScores.us > teamScores.them;

  const winners = viewModel.players.filter((player) => {
    if (winnersAreNorthSouth == null) return true;
    return isNorthSouthTeam(player.absolutePosition) === winnersAreNorthSouth;
  });
  const runnersUp = viewModel.players.filter((player) => !winners.includes(player));

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
      <div className="pidro-panel pidro-panel--glow w-full max-w-3xl p-6 text-center">
        {youWon === true && (
          <div className="text-sm font-black uppercase tracking-[0.18em] text-[#fff0b2]">
            You win!
          </div>
        )}
        {youWon === false && (
          <div className="text-sm font-black uppercase tracking-[0.18em] text-red-100">
            You lose
          </div>
        )}

        <div className="mt-2 flex justify-center">
          <div className="pidro-banner">Game Over</div>
        </div>

        <div className="mt-5 text-2xl font-black text-white">{winnerLabel}</div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="rounded-[20px] border border-[#ffcc54]/30 bg-[#ffcc54]/10 p-5">
            <div className="text-sm font-black uppercase tracking-[0.18em] text-[#fff0b2]">
              Winners
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {winners.map((player) => (
                <div
                  key={player.absolutePosition}
                  className="rounded-2xl border border-white/12 bg-black/10 p-3"
                >
                  <div className="pidro-avatar mx-auto">
                    {(player.username?.[0] ?? '?').toUpperCase()}
                  </div>
                  <div className="mt-2 text-sm font-black text-white">
                    {player.username ?? player.absolutePosition}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[20px] border border-cyan-300/20 bg-black/10 p-5">
            <div className="text-sm font-black uppercase tracking-[0.18em] text-cyan-50/78">
              Final Score
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-left">
              <ScoreTile
                label="Us"
                value={teamScores.us}
                highlighted={teamScores.us >= teamScores.them}
              />
              <ScoreTile
                label="Them"
                value={teamScores.them}
                highlighted={teamScores.them >= teamScores.us}
              />
            </div>
            {runnersUp.length > 0 && (
              <div className="mt-4 text-left">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-50/60">
                  Runners-up
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {runnersUp.map((player) => (
                    <span
                      key={player.absolutePosition}
                      className="rounded-full border border-cyan-300/15 bg-cyan-400/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.1em] text-white"
                    >
                      {player.username ?? player.absolutePosition}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="secondary" onClick={onBackToLobby}>
            Back to Lobby
          </Button>
          <Button onClick={onPlayAgain}>Play Again</Button>
        </div>
      </div>
    </div>
  );
}

function ScoreTile({
  label,
  value,
  highlighted,
}: {
  label: string;
  value: number;
  highlighted: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${highlighted ? 'border-[#ffcc54]/35 bg-[#ffcc54]/10' : 'border-cyan-300/15 bg-cyan-400/8'}`}
    >
      <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-50/60">{label}</div>
      <div className={`mt-1 text-4xl font-black ${highlighted ? 'text-[#fff0b2]' : 'text-white'}`}>
        {value}
      </div>
    </div>
  );
}
