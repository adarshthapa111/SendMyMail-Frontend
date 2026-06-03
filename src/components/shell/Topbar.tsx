import { useNavigate } from 'react-router-dom';
import { IconSearch, IconBell, IconPlus } from '@tabler/icons-react';
import { ClientSwitcher } from './ClientSwitcher';
import { UserMenu } from './UserMenu';
import { useAuth } from '../../hooks/useAuth';
import { useClients } from '../../hooks/useClients';
import styles from '@styles/components/shell/Topbar.module.scss';

export function Topbar() {
  const navigate = useNavigate();
  const { agency } = useAuth();
  const { active } = useClients();
  return (
    <div className={styles.topnav}>
      <div className={styles.left}>
        <div className={styles.brand}>
          <span className={styles.mark}>S</span>
          SendMyMail
          {agency?.name && (
            <>
              <span className={styles.sep}>/</span>
              <span className={styles.agency}>{agency.name}</span>
            </>
          )}
        </div>
        <ClientSwitcher />
      </div>

      <div className={styles.right}>
        <button className={styles.iconBtn} title="Search (⌘K)">
          <IconSearch size={18} />
        </button>
        <button
          className={styles.iconBtn}
          title="Notifications"
          onClick={() => navigate('/notifications')}
        >
          <IconBell size={18} />
          <span className={styles.bellDot} />
        </button>
        <button
          className={styles.primaryBtn}
          onClick={() => navigate(active ? `/clients/${active.id}/campaigns/new` : '/clients')}
          title={active ? `New campaign for ${active.name}` : 'Pick a client first'}
        >
          <IconPlus size={16} />
          New campaign
        </button>
        <UserMenu />
      </div>
    </div>
  );
}
