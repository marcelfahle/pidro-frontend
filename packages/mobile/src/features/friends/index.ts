import {
  t,
  formatNumber,
  type FriendLists,
  type FriendPlayer,
  type FriendResult,
  type RelativePlayerView,
} from '@pidro/shared';
import { relativeDay } from '../relativeDay';

export function friendSections(lists: FriendLists) {
  return [
    { title: t('friends.added_you'), players: lists.added_you, addBack: true },
    { title: t('social.friends'), players: lists.friends, addBack: false },
  ].filter((section) => section.players.length > 0);
}

export function classicFriendsMessage(lists: FriendLists): string | null {
  const count = lists.classic?.not_here ?? 0;
  return count > 0 ? t('friends.classic_not_here', { count, number: formatNumber(count) }) : null;
}

export function presenceLabel(presence: FriendPlayer['presence']) {
  return t(`friends.${presence}`);
}

export function relationLabel(relation: FriendResult['relation']) {
  return t(relation === 'none' ? 'friends.add' : `friends.${relation}`);
}

export function canSearch(query: string) {
  // Hermes has no Segmenter. The server checks the exact grapheme minimum.
  return Array.from(query.normalize('NFKC').trim()).length >= 3;
}

export function canViewPlayer(player: Pick<RelativePlayerView, 'playerId' | 'seatStatus'>) {
  // A substitute keeps the reserved human's ID; actual bots have bot_ IDs.
  return (
    !!player.playerId &&
    !player.playerId.startsWith('bot_') &&
    player.seatStatus !== 'permanent_bot' &&
    player.seatStatus !== 'vacant'
  );
}

/**
 * A friends-list entry as a row reads it. Everything past the name is
 * optional, so an older server works: `table_company` and `join_as` arrive
 * with PID-251 and PID-253, `requested_at` with PID-245, and `with_bots` /
 * `with_others` are the other presence form PID-251 considered. The server
 * sends no seat count, hand, last-played or asked date yet; the line reads
 * them when they come and says less until then.
 */
export type FriendEntry = Omit<FriendPlayer, 'presence'> & {
  presence?: FriendPlayer['presence'] | 'with_bots' | 'with_others';
  requested_at?: string;
  seats_open?: number;
  hand?: number;
  last_played_at?: string;
  asked_at?: string;
};

/** Where the entry stands with you: as `FriendResult.relation`, plus a friend made just now. */
export type FriendRelation = 'friend' | 'added_you' | 'added' | 'new_friend';

export interface FriendRowState {
  variant: 'friend' | 'request' | 'sent' | 'fresh';
  dot: 'online' | 'table' | null;
  line: string;
  tone: 'green' | 'gold' | 'quiet';
  /** At a table with other people and no seat for you: the seat picker greys it. */
  busy: boolean;
}

function dated(
  key: 'friends.played' | 'friends.asked' | 'friends.request_sent_when',
  date: string | undefined,
  now: Date
) {
  const day = date ? relativeDay(date, now) : null;
  return day ? t(key, { when: day }) : null;
}

function presenceStatus(entry: FriendEntry, now: Date): Omit<FriendRowState, 'variant'> {
  const { presence, join_as } = entry;
  const company =
    presence === 'with_bots'
      ? 'bots'
      : presence === 'with_others'
        ? 'people'
        : presence === 'at_table'
          ? entry.table_company
          : undefined;
  const seated = presence === 'at_table' || company !== undefined;
  if (presence === 'online')
    return { dot: 'online', line: t('friends.free_to_play'), tone: 'green', busy: false };
  if (!seated) {
    return {
      dot: null,
      line: dated('friends.played', entry.last_played_at, now) ?? t('friends.not_online'),
      tone: 'quiet',
      busy: false,
    };
  }
  if (join_as) {
    const seats = entry.seats_open;
    return {
      dot: 'table',
      line: seats
        ? `${t('friends.at_table')} · ${t('social.seats_open', { count: seats, number: formatNumber(seats) })}`
        : t('friends.at_table'),
      tone: 'gold',
      busy: false,
    };
  }
  if (company === 'bots')
    return { dot: 'online', line: t('friends.with_bots'), tone: 'green', busy: false };
  const busy = company === 'people';
  if (entry.hand)
    return {
      dot: 'table',
      line: t('friends.at_table_hand', { number: formatNumber(entry.hand) }),
      tone: 'gold',
      busy,
    };
  return busy
    ? { dot: 'table', line: t('friends.with_others'), tone: 'quiet', busy }
    : { dot: 'table', line: t('friends.at_table'), tone: 'gold', busy };
}

/** The row's look and its one status line, from the entry alone. Screens use this, not their own rules. */
export function friendRowState(
  entry: FriendEntry,
  relation: FriendRelation = 'friend',
  now: Date = new Date()
): FriendRowState {
  if (relation === 'added_you') {
    const asked = dated('friends.asked', entry.asked_at, now);
    return {
      variant: 'request',
      dot: null,
      line: asked ?? t('friends.wants_to_be_friends'),
      tone: asked ? 'quiet' : 'gold',
      busy: false,
    };
  }
  if (relation === 'added') {
    return {
      variant: 'sent',
      dot: null,
      line:
        dated('friends.request_sent_when', entry.requested_at, now) ?? t('friends.request_sent'),
      tone: 'quiet',
      busy: false,
    };
  }
  const status = presenceStatus(entry, now);
  if (relation === 'new_friend')
    return { ...status, variant: 'fresh', line: t('friends.friends_now'), tone: 'green' };
  return { ...status, variant: 'friend' };
}
