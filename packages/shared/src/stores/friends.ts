import { create } from 'zustand';
import type { BlockedPlayers, FriendLists } from '../api/friends';

interface FriendsState extends FriendLists, BlockedPlayers {
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
  isLoading: false,
  error: null,
};

export const useFriendsStore = create<FriendsState>((set) => ({
  ...initialState,
  setLists: (lists) => set((state) => ({
    ...lists,
    classic: 'friends' in lists ? lists.classic : state.classic,
    isLoading: false,
    error: null,
  })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  reset: () => set(initialState),
}));
