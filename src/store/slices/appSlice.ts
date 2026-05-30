import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type View = 'editor' | 'integrations';

interface AppState {
  view: View;
}

const initialState: AppState = { view: 'editor' };

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setView(state, action: PayloadAction<View>) {
      state.view = action.payload;
    },
  },
});

export const { setView } = appSlice.actions;
export default appSlice.reducer;
