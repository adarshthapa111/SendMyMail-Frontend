import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface ConnectionState {
  status: 'disconnected' | 'connected' | 'error';
  connectedAt: string | null;
  accountLabel?: string;
  /** Tier 4 webhooks store the user-supplied URL here for display. */
  url?: string;
  lastError?: string;
}

export type IntegrationsFilter = 'all' | 'connected' | 'available';

export interface IntegrationsState {
  connections: Record<string, ConnectionState>;
  search: string;
  filter: IntegrationsFilter;
}

const initialState: IntegrationsState = {
  connections: {},
  search: '',
  filter: 'all',
};

const slice = createSlice({
  name: 'integrations',
  initialState,
  reducers: {
    setConnected(
      state,
      action: PayloadAction<{ id: string; accountLabel?: string; url?: string }>
    ) {
      state.connections[action.payload.id] = {
        status: 'connected',
        connectedAt: new Date().toISOString(),
        accountLabel: action.payload.accountLabel,
        url: action.payload.url,
      };
    },
    setDisconnected(state, action: PayloadAction<string>) {
      delete state.connections[action.payload];
    },
    setConnectionError(state, action: PayloadAction<{ id: string; error: string }>) {
      const existing = state.connections[action.payload.id];
      state.connections[action.payload.id] = {
        status: 'error',
        connectedAt: existing?.connectedAt ?? null,
        lastError: action.payload.error,
      };
    },
    setSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
    },
    setFilter(state, action: PayloadAction<IntegrationsFilter>) {
      state.filter = action.payload;
    },
    /** Used on app startup to rehydrate connection state from localStorage. */
    hydrateConnections(state, action: PayloadAction<Record<string, ConnectionState>>) {
      state.connections = action.payload;
    },
  },
});

export const {
  setConnected,
  setDisconnected,
  setConnectionError,
  setSearch,
  setFilter,
  hydrateConnections,
} = slice.actions;
export default slice.reducer;
