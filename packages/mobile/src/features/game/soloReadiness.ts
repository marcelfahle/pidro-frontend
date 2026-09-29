import type { ReadinessSnapshot } from '@pidro/shared';

export function shouldAutoReadySolo(
  readiness: ReadinessSnapshot | null,
  playerPosition: string | null
) {
  if (!readiness || !playerPosition || readiness.status !== 'waiting') return false;
  const seats = Object.values(readiness.seats);
  return (
    seats.filter((seat) => seat.occupant_type === 'bot').length === 3 &&
    seats.filter((seat) => seat.occupant_type === 'human').length === 1 &&
    !readiness.ready_players.includes(playerPosition as keyof ReadinessSnapshot['seats'])
  );
}
