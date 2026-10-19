import { t, type Position, type ReadinessSnapshot, type SeatInvitation } from '@pidro/shared';

/**
 * The seat invitation a table shows: only to a player whose every other seat
 * is a bot or empty, as the server says. A bot keeping someone's seat is still
 * them. One at a time, the oldest first.
 */
export function tableInvitation(
  invitations: SeatInvitation[],
  readiness: ReadinessSnapshot | null,
  you: Position | null,
  role: 'player' | 'spectator' | null
): SeatInvitation | null {
  if (role !== 'player' || !readiness || !you || !invitations.length) return null;
  const people = Object.entries(readiness.seats).some(
    ([position, seat]) =>
      position !== you && (seat.occupant_type === 'human' || seat.has_reservation === true)
  );
  if (people) return null;
  return invitations.reduce((oldest, next) =>
    next.held_since && oldest.held_since && next.held_since < oldest.held_since ? next : oldest
  );
}

/** "Finnish · as Bertil's partner", or the rules alone when the server does not say. */
export function tableInvitationLine(invitation: SeatInvitation, name: string): string | undefined {
  const rules = invitation.rule_set && t(`social.${invitation.rule_set}`);
  if (!rules) return undefined;
  return invitation.join_as === 'partner' || invitation.join_as === 'opponent'
    ? t(`friend_notice.as_${invitation.join_as}`, { rules, name })
    : rules;
}
