import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Contact } from '../../lib/api/contacts';

/* Per-client paginated cache of contacts.
   Keyed by `clientId` so switching clients drops the wrong-client data.
   Pagination is server-side — items[] is the currently-shown page only,
   total is the full count for the current filter set. */

export type ContactsStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface ContactsState {
  clientId:  string | null;          // which client these items belong to
  status:    ContactsStatus;
  items:     Contact[];
  total:     number;
  page:      number;
  pageSize:  number;
  search:    string;
  listId:    string | null;          // active list filter (null = all)
  tag:       string | null;          // active tag filter
  error:     string | null;
}

const initial: ContactsState = {
  clientId: null,
  status:   'idle',
  items:    [],
  total:    0,
  page:     1,
  pageSize: 50,
  search:   '',
  listId:   null,
  tag:      null,
  error:    null,
};

const slice = createSlice({
  name: 'contacts',
  initialState: initial,
  reducers: {
    setLoading(state, action: PayloadAction<{ clientId: string }>) {
      // When the active clientId changes, wipe everything before loading
      if (state.clientId !== action.payload.clientId) {
        Object.assign(state, initial, { clientId: action.payload.clientId });
      }
      state.status = 'loading';
      state.error  = null;
    },
    setPage(state, action: PayloadAction<{ items: Contact[]; total: number; page: number; pageSize: number }>) {
      state.status   = 'loaded';
      state.items    = action.payload.items;
      state.total    = action.payload.total;
      state.page     = action.payload.page;
      state.pageSize = action.payload.pageSize;
    },
    setError(state, action: PayloadAction<string>) {
      state.status = 'error';
      state.error  = action.payload;
    },
    setSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
      state.page   = 1;
    },
    setListFilter(state, action: PayloadAction<string | null>) {
      state.listId = action.payload;
      state.page   = 1;
    },
    setTagFilter(state, action: PayloadAction<string | null>) {
      state.tag  = action.payload;
      state.page = 1;
    },
    /* User-driven page navigation (prev / next). Doesn't reset other
       filters — preserves search + listId + tag across page changes. */
    gotoPage(state, action: PayloadAction<number>) {
      state.page = Math.max(1, action.payload);
    },
    /* Optimistic mutations — UI updates instantly after each API call */
    addContact(state, action: PayloadAction<Contact>) {
      state.items.unshift(action.payload);
      state.total += 1;
    },
    upsertContact(state, action: PayloadAction<Contact>) {
      const i = state.items.findIndex((c) => c.id === action.payload.id);
      if (i >= 0) state.items[i] = action.payload;
    },
    removeContact(state, action: PayloadAction<string>) {
      state.items = state.items.filter((c) => c.id !== action.payload);
      state.total = Math.max(0, state.total - 1);
    },
    /* Wipe — when active client changes or user logs out */
    clearContacts(state) {
      Object.assign(state, initial);
    },
  },
});

export const {
  setLoading, setPage, setError,
  setSearch, setListFilter, setTagFilter, gotoPage,
  addContact, upsertContact, removeContact,
  clearContacts,
} = slice.actions;

export default slice.reducer;
