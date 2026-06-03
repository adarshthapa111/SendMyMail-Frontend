import { IconFilter, IconList, IconEdit } from '@tabler/icons-react';
import type { ContactList } from '../../lib/api/lists';
import styles from '@styles/components/contacts/ListsTable.module.scss';

interface Props {
  items: ContactList[];
  onEdit: (list: ContactList) => void;
}

function fmtUpdated(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ListsTable({ items, onEdit }: Props) {
  return (
    <div className={styles.card}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>List</th>
            <th>Type</th>
            <th className={styles.r}>Contacts</th>
            <th>Last used in</th>
            <th>Updated</th>
            <th aria-label="Action" />
          </tr>
        </thead>
        <tbody>
          {items.map((l) => {
            const isDynamic = l.type === 'dynamic';
            return (
              <tr key={l.id} className={styles.row}>
                <td>
                  <div className={styles.listName}>
                    <div className={`${styles.ic} ${isDynamic ? styles.icDynamic : styles.icStatic}`}>
                      {isDynamic ? <IconFilter size={16} /> : <IconList size={16} />}
                    </div>
                    <div className={styles.listNameMain}>
                      <b>{l.name}</b>
                      <small>{l.description || (isDynamic ? 'Auto-updating · rule-based' : 'Manually maintained')}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`${styles.typePill} ${isDynamic ? styles.typeDynamic : styles.typeStatic}`}>
                    {isDynamic ? 'Dynamic' : 'Static'}
                  </span>
                </td>
                <td className={`${styles.r} ${styles.tnum}`}>{l.memberCount.toLocaleString()}</td>
                <td className={styles.muted}>—</td>
                <td className={styles.muted}>{fmtUpdated(l.updatedAt)}</td>
                <td className={styles.r}>
                  <button type="button" className={styles.editBtn} onClick={() => onEdit(l)} aria-label={`Edit ${l.name}`}>
                    <IconEdit size={14} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
