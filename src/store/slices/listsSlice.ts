import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ContactList } from '../../lib/api/lists';

/* Per-client cache of lists. Keyed by clientId — switching client wipes it.
   Loaded lazily when the user opens any contacts-related page. */

export type ListsStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface ListsState {
  clientId: string | null;
  status:   ListsStatus;
  items:    ContactList[];
  error:    string | null;
}

const initial: ListsState = {
  clientId: null,
  status:   'idle',
  items:    [],
  error:    null,
};

const slice = createSlice({
  name: 'lists',
  initialState: initial,
  reducers: {
    setLoading(state, action: PayloadAction<{ clientId: string }>) {
      if (state.clientId !== action.payload.clientId) {
        Object.assign(state, initial, { clientId: action.payload.clientId });
      }
      state.status = 'loading';
      state.error  = null;
    },
    setLists(state, action: PayloadAction<ContactList[]>) {
      state.status = 'loaded';
      state.items  = action.payload;
    },
    setError(state, action: PayloadAction<string>) {
      state.status = 'error';
      state.error  = action.payload;
    },
    addList(state, action: PayloadAction<ContactList>) {
      state.items.unshift(action.payload);
    },
    upsertList(state, action: PayloadAction<ContactList>) {
      const i = state.items.findIndex((l) => l.id === action.payload.id);
      if (i >= 0) state.items[i] = action.payload;
      else        state.items.unshift(action.payload);
    },
    removeList(state, action: PayloadAction<string>) {
      // Archive in V1 — we remove from the cache, but server-side it's still around
      state.items = state.items.filter((l) => l.id !== action.payload);
    },
    /* When the count changes (member added/removed), the page-level code calls this */
    bumpMemberCount(state, action: PayloadAction<{ listId: string; delta: number }>) {
      const l = state.items.find((l) => l.id === action.payload.listId);
      if (l) l.memberCount = Math.max(0, l.memberCount + action.payload.delta);
    },
    clearLists(state) {
      Object.assign(state, initial);
    },
  },
});

export const {
  setLoading, setLists, setError,
  addList, upsertList, removeList, bumpMemberCount,
  clearLists,
} = slice.actions;

export default slice.reducer;
