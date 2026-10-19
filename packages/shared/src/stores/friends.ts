import { create } from 'zustand';
import type { BlockedPlayers, FriendLists } from '../api/friends';
import {
  enqueueFriendNotice,
  friendNoticeId,
  lateSeatNotice,
  type FriendNotice,
} from '../features/friendNotices';
import type { SeatInvitation } from '../types/lobby';

interface FriendsState extends FriendLists, BlockedPlayers {
  notices: FriendNotice[];
  seenNotices: string[];
  queueNotice: (notice: FriendNotice) => void;
  dismissNotice: (id: string) => void;
  lateSeat: (invitation: SeatInvitation) => void;
  isLoading: boolean;
  error: unknown;
  setLists: (lists: FriendLists | BlockedPlayers) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: unknown) => void;
  reset: () => void;
}

const initialState = {
  friends: [],
  added_you: [],
  blocked: [],
  classic: undefined,
  requested: [],
  requests_waiting: 0,
  waiting_for_you: 0,
  notices: [],
  seenNotices: [],
  isLoading: false,
  error: null,
};

export const useFriendsStore = create<FriendsState>((set) => ({
  ...initialState,
  queueNotice: (notice) =>
    set((state) => enqueueFriendNotice(state.notices, state.seenNotices, notice)),
  lateSeat: (invitation) =>
    set((state) => lateSeatNotice(state.notices, state.seenNotices, invitation)),
  dismissNotice: (id) =>
    set((state) => ({
      notices: state.notices.filter((notice) => friendNoticeId(notice) !== id),
    })),
  setLists: (lists) =>
    set((state) => ({
      ...lists,
      classic: 'friends' in lists ? lists.classic : state.classic,
      requested: 'friends' in lists ? lists.requested ?? [] : state.requested,
      requests_waiting: 'friends' in lists ? lists.requests_waiting ?? lists.added_you.length : state.requests_waiting,
      waiting_for_you: 'friends' in lists ? (lists.waiting_for_you ?? 0) : state.waiting_for_you,
      notices:
        'friends' in lists
          ? state.notices.filter(
              (notice) =>
                notice.kind !== 'request' ||
                lists.added_you.some((p) => p.user_id === notice.player.user_id)
            )
          : state.notices,
      isLoading: false,
      error: null,
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  reset: () => set(initialState),
}));
