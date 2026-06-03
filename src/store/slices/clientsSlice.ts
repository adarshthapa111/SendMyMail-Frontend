import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Client } from '../../lib/api/clients';

/* Clients slice — the agency's list of clients + which one is currently active
   in the top-bar switcher. Loaded once on app bootstrap (after auth lands),
   then refreshed only when a client is created / updated / archived
   (those mutations land with feature-client-management). */

export type ClientsStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface ClientsState {
  status: ClientsStatus;
  items: Client[];
  activeClientId: string | null;
  error: string | null;
}

const initialState: ClientsState = {
  status: 'idle',
  items: [],
  activeClientId: null,
  error: null,
};

const clientsSlice = createSlice({
  name: 'clients',
  initialState,
  reducers: {
    setLoading(state) {
      state.status = 'loading';
      state.error = null;
    },
    /* Load the list. If activeClientId is still in the new list AND it's
       not archived, keep it; otherwise default to the first NON-ARCHIVED
       item (or null when there are none). Archived clients are now kept in
       items[] for the Archived tab — but they're never picked as the active. */
    setClients(state, action: PayloadAction<{ items: Client[]; restoredActiveId?: string | null }>) {
      const { items, restoredActiveId } = action.payload;
      state.status = 'loaded';
      state.items = items;
      state.error = null;

      const isPickable = (id: string) =>
        items.some((c) => c.id === id && c.status !== 'archived');
      const firstActive = items.find((c) => c.status !== 'archived');

      if (restoredActiveId && isPickable(restoredActiveId)) {
        state.activeClientId = restoredActiveId;
      } else if (state.activeClientId && isPickable(state.activeClientId)) {
        // existing active is still valid + non-archived
      } else {
        state.activeClientId = firstActive?.id ?? null;
      }
    },
    /* User picked a different client in the top-bar switcher. */
    setActive(state, action: PayloadAction<string | null>) {
      state.activeClientId = action.payload;
    },
    setError(state, action: PayloadAction<string>) {
      state.status = 'error';
      state.error = action.payload;
    },
    /* Mutations — keep the slice in sync after each POST/PATCH/DELETE without
       refetching the whole list. The page-level code dispatches one of these
       after the API call resolves. */
    addClient(state, action: PayloadAction<Client>) {
      state.items.unshift(action.payload);   // newest first — matches API's createdAt DESC ordering
    },
    upsertClient(state, action: PayloadAction<Client>) {
      const i = state.items.findIndex((c) => c.id === action.payload.id);
      if (i >= 0) state.items[i] = action.payload;
      else        state.items.unshift(action.payload);

      /* If we just flipped the active client to archived, switch the active
         to the next non-archived client (or null if none remain). */
      if (action.payload.status === 'archived' && state.activeClientId === action.payload.id) {
        const next = state.items.find((c) => c.status !== 'archived');
        state.activeClientId = next?.id ?? null;
      }
    },
    removeClient(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.items = state.items.filter((c) => c.id !== id);
      if (state.activeClientId === id) state.activeClientId = state.items[0]?.id ?? null;
    },
    /* Wipe — on logout or any 401. */
    clearClients(state) {
      state.status = 'idle';
      state.items = [];
      state.activeClientId = null;
      state.error = null;
    },
  },
});

export const {
  setLoading, setClients, setActive, setError, clearClients,
  addClient, upsertClient, removeClient,
} = clientsSlice.actions;
export default clientsSlice.reducer;
