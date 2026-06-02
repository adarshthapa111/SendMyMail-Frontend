import { Outlet } from 'react-router-dom';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import styles from '@styles/components/shell/AppShell.module.scss';

/* <Toaster /> lives in App.tsx (not here) so it's mounted on public/auth
   routes too — those render outside this shell. */

export function AppShell() {
  return (
    <>
      <Topbar />
      <div className={styles.shell}>
        <Sidebar />
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </>
  );
}
