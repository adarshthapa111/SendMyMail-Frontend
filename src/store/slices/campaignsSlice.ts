import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CampaignSummary } from '../../lib/api/campaigns';

/* Per-client cache of campaign summaries (no envelope detail — the full
   single-campaign state lives in component state inside CampaignWizard /
   CampaignReport). Mirrors templatesSlice exactly. */

export type CampaignsStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface CampaignsState {
  clientId: string | null;
  status:   CampaignsStatus;
  items:    CampaignSummary[];
  error:    string | null;
}

const initial: CampaignsState = {
  clientId: null,
  status:   'idle',
  items:    [],
  error:    null,
};

const slice = createSlice({
  name: 'campaigns',
  initialState: initial,
  reducers: {
    setLoading(state, action: PayloadAction<{ clientId: string }>) {
      if (state.clientId !== action.payload.clientId) {
        Object.assign(state, initial, { clientId: action.payload.clientId });
      }
      state.status = 'loading';
      state.error  = null;
    },
    setCampaigns(state, action: PayloadAction<CampaignSummary[]>) {
      state.status = 'loaded';
      state.items  = action.payload;
      state.error  = null;
    },
    setError(state, action: PayloadAction<string>) {
      state.status = 'error';
      state.error  = action.payload;
    },
    addCampaign(state, action: PayloadAction<CampaignSummary>) {
      state.items = [action.payload, ...state.items.filter((c) => c.id !== action.payload.id)];
    },
    upsertCampaign(state, action: PayloadAction<CampaignSummary>) {
      const idx = state.items.findIndex((c) => c.id === action.payload.id);
      if (idx === -1) {
        state.items = [action.payload, ...state.items];
      } else {
        state.items[idx] = action.payload;
        const [moved] = state.items.splice(idx, 1);
        state.items.unshift(moved);
      }
    },
    removeCampaign(state, action: PayloadAction<string>) {
      state.items = state.items.filter((c) => c.id !== action.payload);
    },
    clearCampaigns(state) {
      Object.assign(state, initial);
    },
  },
});

export const {
  setLoading, setCampaigns, setError,
  addCampaign, upsertCampaign, removeCampaign, clearCampaigns,
} = slice.actions;

export default slice.reducer;
