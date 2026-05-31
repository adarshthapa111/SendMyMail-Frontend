import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import styles from '@styles/components/shell/AppShell.module.scss';

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
      <Toaster position="bottom-right" toastOptions={{ duration: 3500 }} />
    </>
  );
}
