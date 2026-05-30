import { configureStore } from '@reduxjs/toolkit';
import editorReducer from './slices/editorSlice';
import appReducer from './slices/appSlice';
import integrationsReducer from './slices/integrationsSlice';

export const store = configureStore({
  reducer: {
    editor: editorReducer,
    app: appReducer,
    integrations: integrationsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
