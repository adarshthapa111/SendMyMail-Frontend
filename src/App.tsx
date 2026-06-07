/* App root — delegates to the router after bootstrapping auth from localStorage.
   The previous `app.view` switching (editor vs integrations) lives in the router now.

   <Toaster /> is mounted HERE (not inside AppShell) so toasts also show on
   public / auth pages which render outside the chrome. */
import { Toaster } from 'react-hot-toast';
import { AppRouter } from './router';
import { useBootstrapAuth } from './hooks/useBootstrapAuth';
import { useClientsBootstrap } from './hooks/useClientsBootstrap';
import { useTheme } from './hooks/useTheme';

export default function App() {
  useBootstrapAuth();
  useClientsBootstrap();
  /* Mount the theme system. The hook keeps <html data-theme> in sync
     with the user's preference + OS theme changes. The inline script
     in index.html sets the initial value flash-free; this hook keeps
     it correct for the rest of the session. */
  useTheme();
  return (
    <>
      <AppRouter />
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: 'var(--card)',
            color: 'var(--ink)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r)',
            boxShadow: 'var(--shadow-md)',
            fontSize: 13.5,
            padding: '12px 14px',
          },
          success: { iconTheme: { primary: 'var(--green)', secondary: '#fff' } },
          error:   { iconTheme: { primary: 'var(--red)',   secondary: '#fff' }, duration: 5000 },
        }}
      />
    </>
  );
}
