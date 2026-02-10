import { create } from 'zustand';

interface UIState {
  isLoading: boolean;
  setLoading: (isLoading: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isLoading: false,
  setLoading: (isLoading) => set({ isLoading }),
}));
