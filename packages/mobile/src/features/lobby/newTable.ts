import type { FriendPlayer, Position, RuleSet } from '@pidro/shared';
import { t, formatNumber } from '@pidro/shared';
import type { CreateRoomRequest } from '@/types/lobby';

/** The three seats a host fills on New table: left opponent, partner, right opponent. */
export type SeatKey = 'seat_2' | 'seat_3' | 'seat_4';

/** Friend seats hold a selected friend, or share a seat-bound link after creation. */
export type SeatChoice = 'open' | 'ai' | 'invite';

export type SeatRequirement = 0 | 100 | 1000;
export type TableDraft = {
  seats: Record<SeatKey, SeatChoice>;
  /** Games played an open seat asks for; 0 or missing means anyone may sit. */
  requirements: Partial<Record<SeatKey, SeatRequirement>>;
  invited?: Partial<Record<SeatKey, FriendPlayer>>;
};

export const seatPositions: Record<SeatKey, Position> = {
  seat_2: 'east',
  seat_3: 'south',
  seat_4: 'west',
};

export const defaultSeats: Record<SeatKey, SeatChoice> = {
  seat_3: 'open',
  seat_2: 'open',
  seat_4: 'ai',
};

/** One tap commits the seat. Leaving Open drops that seat's requirement. */
export function chooseSeat(draft: TableDraft, seat: SeatKey, choice: SeatChoice): TableDraft {
  return {
    seats: { ...draft.seats, [seat]: choice },
    requirements: choice === 'open' ? draft.requirements : { ...draft.requirements, [seat]: 0 },
    ...(draft.invited && { invited: { ...draft.invited, [seat]: undefined } }),
  };
}

export function chooseFriend(draft: TableDraft, seat: SeatKey, friend: FriendPlayer): TableDraft {
  return { ...chooseSeat(draft, seat, 'invite'), invited: { ...draft.invited, [seat]: friend } };
}

export function findFriends(friends: FriendPlayer[], query: string): FriendPlayer[] {
  const search = query.normalize('NFKC').trim().toLocaleLowerCase();
  return friends.filter((friend) =>
    friend.display_name.normalize('NFKC').toLocaleLowerCase().includes(search)
  );
}

/** Only an open seat can ask for games played. */
export function chooseRequirement(
  draft: TableDraft,
  seat: SeatKey,
  games: SeatRequirement
): TableDraft {
  if (draft.seats[seat] !== 'open') return draft;
  return { ...draft, requirements: { ...draft.requirements, [seat]: games } };
}

export function tableFooter(seats: Record<SeatKey, SeatChoice>): string {
  const open = Object.values(seats).filter((seat) => seat === 'open').length;
  return open === 0
    ? t('social.footer_friends')
    : t('social.footer_open', { count: open, number: formatNumber(open) });
}

export function newTableRequest(
  ruleSet: RuleSet,
  seats: Record<SeatKey, SeatChoice>,
  requirements: TableDraft['requirements'] = {},
  invited: TableDraft['invited'] = {}
): { request: CreateRoomRequest; invite: Position[] } {
  const serverSeat = (key: SeatKey) => {
    const choice = seats[key];
    const min_games = requirements[key] ?? 0;
    if (choice === 'invite' && invited[key])
      return { type: 'held' as const, user_id: invited[key].user_id };
    return choice === 'ai'
      ? 'ai'
      : choice === 'open' && min_games > 0
        ? { type: 'open' as const, min_games }
        : 'open';
  };
  return {
    request: {
      rule_set: ruleSet,
      seats: {
        seat_2: serverSeat('seat_2'),
        seat_3: serverSeat('seat_3'),
        seat_4: serverSeat('seat_4'),
      },
    },
    invite: (Object.keys(seats) as SeatKey[])
      .filter((key) => seats[key] === 'invite' && !invited[key])
      .map((key) => seatPositions[key]),
  };
}
