import { useNavigate } from 'react-router-dom';
import { IconArchive, IconArchiveOff } from '@tabler/icons-react';
import { clientGradient, clientInitials } from '../../lib/clientColor';
import type { Client, ClientStatus } from '../../lib/api/clients';
import styles from '@styles/components/clients/ClientsTable.module.scss';

interface Props {
  items: Client[];
  /** Called when the user clicks the row-level "Archive" action.
      Page-owner handles confirmation + API call + slice update. */
  onArchive?: (client: Client) => void;
  /** Called when the user clicks the row-level "Restore" action on an archived row. */
  onRestore?: (client: Client) => void;
}

const STATUS_VARIANT: Record<ClientStatus, { label: string; cls: string }> = {
  active:   { label: 'Active',   cls: styles.pillGreen },
  trial:    { label: 'Trial',    cls: styles.pillBlue  },
  paused:   { label: 'Paused',   cls: styles.pillGray  },
  archived: { label: 'Archived', cls: styles.pillRed   },
};

const DASH = '—';

export function ClientsTable({ items, onArchive, onRestore }: Props) {
  const navigate = useNavigate();

  return (
    <div className={styles.card}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.colClient}>Client</th>
            <th className={styles.r}>Contacts</th>
            <th>Last campaign</th>
            <th className={styles.r}>Emails (30d)</th>
            <th>Open rate</th>
            <th className={styles.r}>Deliverability</th>
            <th>Status</th>
            <th aria-label="Action" />
          </tr>
        </thead>
        <tbody>
          {items.map((c) => {
            const s = STATUS_VARIANT[c.status];
            const isArchived = c.status === 'archived';
            return (
              <tr
                key={c.id}
                className={`${styles.row} ${isArchived ? styles.rowArchived : ''}`}
                onClick={() => navigate(`/clients/${c.id}/edit`)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/clients/${c.id}/edit`);
                  }
                }}
              >
                <td>
                  <div className={styles.client}>
                    <span
                      className={styles.av}
                      style={{ background: clientGradient(c.avatarColor) }}
                      aria-hidden="true"
                    >
                      {clientInitials(c.name)}
                    </span>
                    <div className={styles.clientText}>
                      <b>{c.name}</b>
                      <small>{c.domain ?? `/${c.slug}`}</small>
                    </div>
                  </div>
                </td>
                <td className={`${styles.r} ${styles.tnum} ${styles.dash}`}>{DASH}</td>
                <td className={styles.dash}>{DASH}</td>
                <td className={`${styles.r} ${styles.tnum} ${styles.dash}`}>{DASH}</td>
                <td>
                  <div className={styles.openrate}>
                    <div className={styles.minibar}><i style={{ width: '0%' }} /></div>
                    <span className={`${styles.tnum} ${styles.dash}`}>{DASH}</span>
                  </div>
                </td>
                <td className={`${styles.r} ${styles.dash}`}>
                  <span className={styles.score}>{DASH}</span>
                </td>
                <td>
                  <span className={`${styles.pill} ${styles.pillDot} ${s.cls}`}>{s.label}</span>
                </td>
                <td className={styles.r}>
                  {isArchived && onRestore ? (
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.actionRestore}`}
                      onClick={(e) => { e.stopPropagation(); onRestore(c); }}
                    >
                      <IconArchiveOff size={13} /> Restore
                    </button>
                  ) : !isArchived && onArchive ? (
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.actionArchive}`}
                      onClick={(e) => { e.stopPropagation(); onArchive(c); }}
                    >
                      <IconArchive size={13} /> Archive
                    </button>
                  ) : (
                    <span className={styles.openLink}>Open →</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
