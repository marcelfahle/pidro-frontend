import {
  t,
  type CreateRoomRequest,
  type FriendPlayer,
  type Position,
  type Room,
  type RuleSet,
  type SeatType,
} from '@pidro/shared';
import type { PickerFriend } from './friendPicker';

export type SeatKey = 'seat_2' | 'seat_3' | 'seat_4';
export type DraftSeat =
  Exclude<SeatType, { type: 'held'; user_id: string }> | { type: 'held'; friend: FriendPlayer };
export type TableDraft = { seats: Record<SeatKey, DraftSeat> };

export const seatPositions: Record<SeatKey, Position> = {
  seat_2: 'east',
  seat_3: 'south',
  seat_4: 'west',
};
export const defaultSeats: TableDraft['seats'] = { seat_2: 'open', seat_3: 'open', seat_4: 'open' };

export function roomHasUser(room: Room, userId?: string | null): boolean {
  if (!userId) return false;
  if (room.player_ids?.includes(userId)) return true;
  if (room.positions && Object.values(room.positions).includes(userId)) return true;
  return (
    room.seats?.some((seat) => seat.player?.id === userId || seat.player_id === userId) ?? false
  );
}

export function chooseSeat(draft: TableDraft, seat: SeatKey, choice: DraftSeat): TableDraft {
  return { seats: { ...draft.seats, [seat]: choice } };
}

export function chooseFriend(draft: TableDraft, seat: SeatKey, friend: FriendPlayer): TableDraft {
  return chooseSeat(draft, seat, { type: 'held', friend });
}

export function assignedFriendIds(draft: TableDraft, current: SeatKey): string[] {
  return Object.entries(draft.seats).flatMap(([key, seat]) =>
    key !== current && typeof seat === 'object' && seat.type === 'held' ? [seat.friend.user_id] : []
  );
}

export function isPractice(draft: TableDraft): boolean {
  return Object.values(draft.seats).every((seat) => seat === 'ai');
}

export function tableFooter(draft: TableDraft): string {
  if (isPractice(draft)) return t('new_table.practice');
  const seats = Object.values(draft.seats);
  const open = seats.some(
    (seat) => seat === 'open' || (typeof seat === 'object' && seat.type === 'open')
  );
  if (!open) return t('new_table.invite_only_help');
  const names = seats.flatMap((seat) =>
    typeof seat === 'object' && seat.type === 'held' ? [seat.friend.display_name] : []
  );
  return [
    t('new_table.listed_help'),
    ...names.map((name) => t('new_table.invitation', { name })),
  ].join(' ');
}

export function newTableRequest(ruleSet: RuleSet, draft: TableDraft): CreateRoomRequest {
  const entry = (key: SeatKey): SeatType => {
    const seat = draft.seats[key];
    return typeof seat === 'object' && seat.type === 'held'
      ? { type: 'held', user_id: seat.friend.user_id }
      : seat;
  };
  return {
    rule_set: ruleSet,
    seats: { seat_2: entry('seat_2'), seat_3: entry('seat_3'), seat_4: entry('seat_4') },
  };
}

export function tableHeader(room: Room): string {
  const listed = room.seats?.some(
    (seat) => !seat.player && !seat.held_for && seat.status === 'free'
  );
  return t(listed ? 'new_table.listed' : 'new_table.invite_only', {
    rules: t(`social.${room.config?.rule_set ?? 'finnish'}`),
  });
}

export function waitingFooter(room: Room, canManage: boolean): string {
  const names =
    room.seats?.flatMap((seat) => (seat.held_for ? [seat.held_for.display_name] : [])) ?? [];
  const waiting = names.length
    ? t('new_table.waiting_for', { names: names.join(', ') })
    : t('new_table.waiting_players');
  return canManage ? `${waiting} ${t('new_table.change_seat')}` : waiting;
}

export function pickerFriends(
  friends: FriendPlayer[],
  selectedId?: string,
  unavailableIds: string[] = []
): PickerFriend[] {
  return friends.map((friend) => {
    const busy = friend.presence === 'at_table' && friend.table_company !== 'bots';
    return {
      id: friend.user_id,
      name: friend.display_name,
      avatarUrl: friend.avatar_url,
      section: busy ? 'busy' : friend.presence === 'offline' ? 'offline' : 'online',
      availability: unavailableIds.includes(friend.user_id)
        ? 'taken'
        : selectedId === friend.user_id
          ? 'selected'
          : busy
            ? 'others'
            : friend.table_company === 'bots' && friend.presence === 'at_table'
              ? 'bots'
              : friend.presence === 'offline'
                ? 'offline'
                : 'online',
    };
  });
}
