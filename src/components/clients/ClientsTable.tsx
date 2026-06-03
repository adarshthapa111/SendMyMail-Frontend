import { useNavigate } from 'react-router-dom';
import { clientGradient, clientInitials } from '../../lib/clientColor';
import type { Client, ClientStatus } from '../../lib/api/clients';
import styles from '@styles/components/clients/ClientsTable.module.scss';

interface Props {
  items: Client[];
}

/* The clients list rendered as a real <table> — matches the mockup's
   columns one-for-one. Cells that depend on Feature 10 event data
   (Contacts / Last campaign / Emails 30d / Open rate / Deliverability)
   render as `—` for now. They light up once event ingestion ships;
   no FE work needed at that point — just update the API and the cells. */

const STATUS_VARIANT: Record<ClientStatus, { label: string; cls: string }> = {
  active:   { label: 'Active',   cls: styles.pillGreen },
  trial:    { label: 'Trial',    cls: styles.pillBlue  },
  paused:   { label: 'Paused',   cls: styles.pillGray  },
  archived: { label: 'Archived', cls: styles.pillRed   },
};

const DASH = '—';

export function ClientsTable({ items }: Props) {
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
            return (
              <tr
                key={c.id}
                className={styles.row}
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
                  <span className={styles.openLink}>Open →</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
