import { useNavigate, useParams } from 'react-router-dom';
import { IconShoppingCart, IconForms, IconFileImport, IconUserPlus } from '@tabler/icons-react';
import type { Contact } from '../../lib/api/contacts';
import styles from '@styles/components/contacts/ContactsTable.module.scss';

interface Props {
  items: Contact[];
}

/* Maps the `source` value to a small icon + label.
   Only `manual` + `csv_import` are produced in V1 — the rest light up with
   their respective features. */
function SourceCell({ source }: { source: string | null }) {
  if (source === 'csv_import') return <span className={styles.src}><IconFileImport size={15} /> CSV import</span>;
  if (source === 'form')       return <span className={styles.src}><IconForms       size={15} /> Form</span>;
  if (source === 'woo')        return <span className={styles.src}><IconShoppingCart size={15} /> WooCommerce</span>;
  return                              <span className={styles.src}><IconUserPlus   size={15} /> Added by team</span>;
}

function fmtAdded(iso: string): string {
  const then = new Date(iso).getTime();
  const now  = Date.now();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 14)  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8)  return `${weeks} weeks ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function nameOf(c: Contact): string {
  const parts = [c.firstName, c.lastName].filter(Boolean);
  return parts.join(' ') || '—';
}

export function ContactsTable({ items }: Props) {
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId: string }>();

  return (
    <div className={styles.card}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Tags</th>
            <th>Lists</th>
            <th>Added</th>
            <th>Source</th>
            <th aria-label="Action" />
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr
              key={c.id}
              className={styles.row}
              tabIndex={0}
              onClick={() => navigate(`/clients/${clientId}/contacts/${c.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/clients/${clientId}/contacts/${c.id}`);
                }
              }}
            >
              <td className={styles.email}>{c.email}</td>
              <td>{nameOf(c)}</td>
              <td>
                {c.tags.length === 0 ? (
                  <span className={styles.dash}>—</span>
                ) : (
                  <div className={styles.tags}>
                    {c.tags.slice(0, 3).map((t) => (
                      <span key={t} className={`${styles.pill} ${styles.pillPurple}`}>{t}</span>
                    ))}
                    {c.tags.length > 3 ? <span className={styles.more}>+{c.tags.length - 3}</span> : null}
                  </div>
                )}
              </td>
              <td>
                {c.lists.length === 0 ? (
                  <span className={styles.dash}>—</span>
                ) : (
                  c.lists.map((l) => l.listName).join(', ')
                )}
              </td>
              <td className={styles.muted}>{fmtAdded(c.createdAt)}</td>
              <td><SourceCell source={c.source} /></td>
              <td className={styles.r}>
                <span className={styles.openLink}>Open →</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
