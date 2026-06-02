import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconUser,
  IconBell,
  IconLifebuoy,
  IconKeyboard,
  IconLogout,
} from '@tabler/icons-react';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../ui';
import styles from '@styles/components/shell/UserMenu.module.scss';

/* Default avatar gradient — used until per-user gradients are persisted. */
const DEFAULT_GRAD = 'linear-gradient(150deg,#7A71D8,#4B43A8)';

/* Build "PK"-style initials from "Prasiddha Karki" / "Sushant" / "marketing@khukrispices.com". */
function initialsOf(name: string | undefined, email: string | undefined): string {
  const source = (name && name.trim()) || (email && email.split('@')[0]) || '';
  if (!source) return '?';
  const parts = source.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLButtonElement>(null);
  const { user, logout } = useAuth();

  /* close on outside-click (but not while signing out — keep the spinner visible) */
  useEffect(() => {
    if (!open || signingOut) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, signingOut]);

  const go = (path: string) => () => {
    if (signingOut) return;
    setOpen(false);
    navigate(path);
  };

  const ini = initialsOf(user?.name, user?.email);
  const displayName = user?.name ?? 'Signed in';
  const displayEmail = user?.email ?? '';

  async function onSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout(); // shows toast.loading → toast.success, clears slice + JWT, navigates to /login
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <button
      ref={wrapRef}
      className={styles.userMenu}
      onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
      type="button"
    >
      <span className={styles.av} style={{ background: DEFAULT_GRAD }}>
        {ini}
      </span>

      {open && (
        <div className={styles.pop} onClick={(e) => e.stopPropagation()}>
          <div className={styles.umh}>
            <span className={styles.avLg} style={{ background: DEFAULT_GRAD }}>
              {ini}
            </span>
            <div>
              <b>{displayName}</b>
              <small>{displayEmail}</small>
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

          <button
            className={`${styles.item} ${styles.danger}`}
            onClick={onSignOut}
            disabled={signingOut}
          >
            {signingOut ? <Spinner size="sm" /> : <IconLogout size={16} />}
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </button>
  );
}
