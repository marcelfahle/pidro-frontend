import { create } from 'zustand';
import type { FriendLists } from '../api/friends';

interface FriendsState extends FriendLists {
  isLoading: boolean;
  error: string | null;
  setLists: (lists: FriendLists) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = { friends: [], added_you: [], isLoading: false, error: null };

export const useFriendsStore = create<FriendsState>((set) => ({
  ...initialState,
  setLists: (lists) => set({ ...lists, isLoading: false, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  reset: () => set(initialState),
}));
