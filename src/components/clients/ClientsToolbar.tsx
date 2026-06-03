import { IconSearch } from '@tabler/icons-react';
import type { ClientStatus } from '../../lib/api/clients';
import styles from '@styles/components/clients/ClientsToolbar.module.scss';

export type StatusFilter = 'all' | ClientStatus;

interface Props {
  filter: StatusFilter;
  onFilterChange: (f: StatusFilter) => void;
  search: string;
  onSearchChange: (s: string) => void;
  counts: Record<StatusFilter, number>;
}

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all',      label: 'All'      },
  { value: 'trial',    label: 'Trial'    },
  { value: 'active',   label: 'Active'   },
  { value: 'paused',   label: 'Paused'   },
  { value: 'archived', label: 'Archived' },
];

/* The .toolbar row above the table — segmented status filter on the left,
   client-side search on the right. Mirrors the mockup's:
     <div class="seg"><button class="on">All <span class="n">8</span></button>...</div>
     <div class="search"><i class="ti ti-search"></i><input ... /></div>
*/
export function ClientsToolbar({ filter, onFilterChange, search, onSearchChange, counts }: Props) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.seg} role="tablist" aria-label="Filter clients by status">
        {FILTERS.map((f) => {
          const selected = filter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={selected}
              className={selected ? styles.segActive : ''}
              onClick={() => onFilterChange(f.value)}
            >
              {f.label} <span className={styles.n}>{counts[f.value]}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.search}>
        <IconSearch size={15} />
        <input
          type="search"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}
