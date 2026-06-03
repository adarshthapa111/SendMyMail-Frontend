import { IconSearch } from '@tabler/icons-react';
import type { ContactList } from '../../lib/api/lists';
import styles from '@styles/components/contacts/ContactsToolbar.module.scss';

interface Props {
  /** Active list filter (id) or null for "All". */
  activeListId: string | null;
  /** All non-archived lists for this client. */
  lists: ContactList[];
  /** Total contacts in the client (across all lists). */
  totalCount: number;
  onListChange: (id: string | null) => void;
  search: string;
  onSearchChange: (s: string) => void;
}

/* Toolbar above the contacts table — segmented tabs for `All` + each list,
   plus a search input on the right. Matches the mockup `.seg` + `.search`. */
export function ContactsToolbar({
  activeListId, lists, totalCount, onListChange, search, onSearchChange,
}: Props) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.seg} role="tablist" aria-label="Filter contacts by list">
        <button
          type="button"
          role="tab"
          aria-selected={activeListId === null}
          className={activeListId === null ? styles.segActive : ''}
          onClick={() => onListChange(null)}
        >
          All contacts <span className={styles.n}>{totalCount.toLocaleString()}</span>
        </button>
        {lists.map((l) => {
          const selected = activeListId === l.id;
          return (
            <button
              key={l.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={selected ? styles.segActive : ''}
              onClick={() => onListChange(l.id)}
            >
              {l.name} <span className={styles.n}>{l.memberCount.toLocaleString()}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.search}>
        <IconSearch size={15} />
        <input
          type="search"
          placeholder="Search by email or name..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}
