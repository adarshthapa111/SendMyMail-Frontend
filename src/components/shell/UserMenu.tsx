import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconUser,
  IconBell,
  IconLifebuoy,
  IconKeyboard,
  IconLogout,
} from '@tabler/icons-react';
import styles from '@styles/components/shell/UserMenu.module.scss';

/* Mock user — replaced by `auth.user` slice when the auth feature lands. */
const MOCK_USER = {
  ini: 'PK',
  name: 'Prasiddha Karki',
  email: 'prasiddha@nirvanaagency.com',
  grad: 'linear-gradient(150deg,#7A71D8,#4B43A8)',
};

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLButtonElement>(null);

  /* close on outside-click */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const go = (path: string) => () => {
    setOpen(false);
    navigate(path);
  };

  return (
    <button
      ref={wrapRef}
      className={styles.userMenu}
      onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
      type="button"
    >
      <span className={styles.av} style={{ background: MOCK_USER.grad }}>
        {MOCK_USER.ini}
      </span>

      {open && (
        <div className={styles.pop} onClick={(e) => e.stopPropagation()}>
          <div className={styles.umh}>
            <span className={styles.avLg} style={{ background: MOCK_USER.grad }}>
              {MOCK_USER.ini}
            </span>
            <div>
              <b>{MOCK_USER.name}</b>
              <small>{MOCK_USER.email}</small>
            </div>
          </div>

          <button className={styles.item} onClick={go('/settings')}>
            <IconUser size={16} /> Profile &amp; settings
          </button>
          <button className={styles.item} onClick={go('/notifications')}>
            <IconBell size={16} /> Notifications
          </button>
          <button className={styles.item} onClick={go('/help')}>
            <IconLifebuoy size={16} /> Help &amp; support
          </button>
          <button className={styles.item}>
            <IconKeyboard size={16} /> Keyboard shortcuts
            <span className={styles.kbd}>⌘ /</span>
          </button>

          <div className={styles.sep} />

          <button className={`${styles.item} ${styles.danger}`}>
            <IconLogout size={16} /> Sign out
          </button>
        </div>
      )}
    </button>
  );
}
