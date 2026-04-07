import type { StateCreator } from 'zustand'
import type { StoreState, UiSlice } from './types'

export const createUiSlice: StateCreator<StoreState, [['zustand/subscribeWithSelector', never]], [], UiSlice> = (set) => ({
  theme: (typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light') as 'dark' | 'light',
  searchQuery: '',
  searchOptions: {
    caseSensitive: false,
    regex: false,
    searchKeys: true,
    searchValues: true
  },
  matchedIds: [],
  currentMatchIndex: -1,
  toastMessage: null,
  toastType: null,

  toggleTheme: () =>
    set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

  setSearchQuery: (query) => set({ searchQuery: query, currentMatchIndex: -1 }),

  setSearchOptions: (options) =>
    set((state) => ({
      searchOptions: { ...state.searchOptions, ...options }
    })),

  setMatchedIds: (ids) =>
    set({ matchedIds: ids, currentMatchIndex: ids.length > 0 ? 0 : -1 }),

  navigateMatch: (direction) =>
    set((state) => {
      if (state.matchedIds.length === 0) return {}
      const len = state.matchedIds.length
      const next =
        direction === 'next'
          ? (state.currentMatchIndex + 1) % len
          : (state.currentMatchIndex - 1 + len) % len
      return { currentMatchIndex: next }
    }),

  showToast: (message, type) => set({ toastMessage: message, toastType: type }),
  clearToast: () => set({ toastMessage: null, toastType: null })
})
