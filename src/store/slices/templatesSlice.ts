import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { TemplateSummary } from '../../lib/api/templates';

/* Per-client cache of template summaries (no `mjmlSource` — the heavy tree
   lives in editorSlice when a single template is open for editing).
   Keyed by `clientId` so switching clients drops the wrong-client data.
   Mirrors the shape of contactsSlice / listsSlice. */

export type TemplatesStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface TemplatesState {
  clientId: string | null;
  status:   TemplatesStatus;
  items:    TemplateSummary[];
  error:    string | null;
}

const initial: TemplatesState = {
  clientId: null,
  status:   'idle',
  items:    [],
  error:    null,
};

const slice = createSlice({
  name: 'templates',
  initialState: initial,
  reducers: {
    setLoading(state, action: PayloadAction<{ clientId: string }>) {
      // Switching clientId wipes the cache before reloading.
      if (state.clientId !== action.payload.clientId) {
        Object.assign(state, initial, { clientId: action.payload.clientId });
      }
      state.status = 'loading';
      state.error  = null;
    },
    setTemplates(state, action: PayloadAction<TemplateSummary[]>) {
      state.status = 'loaded';
      state.items  = action.payload;
      state.error  = null;
    },
    setError(state, action: PayloadAction<string>) {
      state.status = 'error';
      state.error  = action.payload;
    },
    /* Insert at the top of the list (newest-first ordering by updatedAt
       which is what the server returns). */
    addTemplate(state, action: PayloadAction<TemplateSummary>) {
      state.items = [action.payload, ...state.items.filter((t) => t.id !== action.payload.id)];
    },
    /* Replace an existing row in place (after a Save / Rename / Archive
       roundtrip). If the row isn't in the cache yet, insert at top. */
    upsertTemplate(state, action: PayloadAction<TemplateSummary>) {
      const idx = state.items.findIndex((t) => t.id === action.payload.id);
      if (idx === -1) {
        state.items = [action.payload, ...state.items];
      } else {
        state.items[idx] = action.payload;
        // Re-sort: the just-touched row goes to the top (updatedAt is newest).
        const [moved] = state.items.splice(idx, 1);
        state.items.unshift(moved);
      }
    },
    /* Remove from cache entirely (used after a hard delete; archive uses
       upsertTemplate with archived: true to keep the row visible in the
       Archived tab when we add one). */
    removeTemplate(state, action: PayloadAction<string>) {
      state.items = state.items.filter((t) => t.id !== action.payload);
    },
    clearTemplates(state) {
      Object.assign(state, initial);
    },
  },
});

export const {
  setLoading, setTemplates, setError,
  addTemplate, upsertTemplate, removeTemplate, clearTemplates,
} = slice.actions;

export default slice.reducer;
