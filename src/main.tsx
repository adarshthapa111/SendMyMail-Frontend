import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App';
import './index.css';

/* react-hot-toast's <Toaster /> is mounted inside AppShell (so it has the right z-index
   and respects the chrome). Public/auth pages render it via PublicShell when needed. */

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
);
