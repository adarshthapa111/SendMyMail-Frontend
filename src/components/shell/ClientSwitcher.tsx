import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { IconSelector, IconCheck, IconPlus } from '@tabler/icons-react';
import { useClients } from '../../hooks/useClients';
import { clientGradient, clientInitials, FALLBACK_GRADIENT } from '../../lib/clientColor';
import styles from '@styles/components/shell/ClientSwitcher.module.scss';

/* Top-bar dropdown showing the active client + a switcher for the rest.
   Reads from useClients() (Redux slice loaded once by useClientsBootstrap). */

/* When the user picks a different client and the current URL is a per-client
   route, we navigate to the equivalent URL under the new client. We keep the
   FIRST segment after the clientId (the "module" — contacts / lists / etc)
   and drop the rest (a contact id, a list id, etc — those don't exist under
   the new client and would 404). */
function rewriteForClient(pathname: string, newClientId: string): string | null {
  const m = pathname.match(/^\/clients\/[^/]+(?:\/([^/]+))?/);
  if (!m) return null;                           // not a per-client URL
  const segment = m[1];                          // e.g. 'contacts' | 'lists' | 'edit' | undefined
  return segment ? `/clients/${newClientId}/${segment}` : `/clients/${newClientId}/edit`;
}

export function ClientSwitcher() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { status, items, active, setActive } = useClients();

  function pickClient(id: string) {
    setActive(id);
    setOpen(false);
    const next = rewriteForClient(location.pathname, id);
    if (next && next !== location.pathname) navigate(next);
  }

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // Loading — show a quiet skeleton so the topbar doesn't jump
  if (status === 'loading' || status === 'idle') {
    return (
      <button className={styles.switcher} type="button" disabled>
        <span className={`${styles.av} ${styles.skeleton}`} />
        <span className={styles.skeletonText} />
      </button>
    );
  }

  // No clients yet — single CTA button
  if (items.length === 0) {
    return (
      <button
        className={styles.switcher}
        type="button"
        onClick={() => navigate('/clients/new')}
        title="You don't have any clients yet"
      >
        <span className={styles.av} style={{ background: FALLBACK_GRADIENT }}>
          <IconPlus size={12} />
        </span>
        Add your first client
      </button>
    );
  }

  const display = active ?? items[0]!;

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        className={styles.switcher}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={styles.av} style={{ background: clientGradient(display.avatarColor) }}>
          {clientInitials(display.name)}
        </span>
        <span className={styles.label}>{display.name}</span>
        <IconSelector size={14} className={styles.chev} />
      </button>

      {open ? (
        <div className={styles.menu} role="listbox">
          {items.map((c) => {
            const isActive = c.id === display.id;
            return (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={isActive}
                className={`${styles.menuItem} ${isActive ? styles.menuItemActive : ''}`}
                onClick={() => pickClient(c.id)}
              >
                <span className={styles.av} style={{ background: clientGradient(c.avatarColor) }}>
                  {clientInitials(c.name)}
                </span>
                <span className={styles.menuItemLabel}>
                  <span className={styles.menuItemName}>{c.name}</span>
                  {c.domain ? <span className={styles.menuItemSub}>{c.domain}</span> : null}
                </span>
                {isActive ? <IconCheck size={14} className={styles.tick} /> : null}
              </button>
            );
          })}

          <button
            type="button"
            className={`${styles.menuItem} ${styles.menuItemCreate}`}
            onClick={() => { setOpen(false); navigate('/clients/new'); }}
          >
            <span className={`${styles.av} ${styles.avAdd}`}>
              <IconPlus size={12} />
            </span>
            <span className={styles.menuItemLabel}>
              <span className={styles.menuItemName}>Create a new client</span>
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
