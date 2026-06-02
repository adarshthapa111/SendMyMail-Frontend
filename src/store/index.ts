import { configureStore } from '@reduxjs/toolkit';
import editorReducer from './slices/editorSlice';
import appReducer from './slices/appSlice';
import integrationsReducer from './slices/integrationsSlice';
import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    editor: editorReducer,
    app: appReducer,
    integrations: integrationsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
