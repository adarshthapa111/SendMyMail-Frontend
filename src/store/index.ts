import { configureStore } from '@reduxjs/toolkit';
import editorReducer from './slices/editorSlice';
import appReducer from './slices/appSlice';
import integrationsReducer from './slices/integrationsSlice';
import authReducer from './slices/authSlice';
import clientsReducer from './slices/clientsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    clients: clientsReducer,
    editor: editorReducer,
    app: appReducer,
    integrations: integrationsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
