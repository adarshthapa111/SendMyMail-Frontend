import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heading, Text, Button, Spinner } from '../../components/ui';
import { IconPlus } from '@tabler/icons-react';
import {
  ClientsTable, ClientsEmptyState, ClientsToolbar,
  type StatusFilter,
} from '../../components/clients';
import { useClients } from '../../hooks/useClients';
import type { ClientStatus } from '../../lib/api/clients';
import styles from '@styles/components/clients/ClientsList.module.scss';

/* /clients — the agency-wide client list. Pattern matches the mockup's
   .head + .toolbar + .card layout. Filter + search are client-side
   (small N for V1; server-side filter ships when we exceed a few hundred). */

export function ClientsList() {
  const navigate = useNavigate();
  const { status, items } = useClients();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  // Per-status counts for the segmented filter badges
  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { all: items.length, trial: 0, active: 0, paused: 0, archived: 0 };
    for (const it of items) c[it.status] = (c[it.status] ?? 0) + 1;
    return c;
  }, [items]);

  // Apply filter + search client-side
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((c) => {
      if (filter !== 'all' && c.status !== (filter as ClientStatus)) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q);
    });
  }, [items, filter, search]);

  if (status === 'loading' || status === 'idle') {
    return <div className={styles.spinner}><Spinner /></div>;
  }

  // FTUX — agency has zero clients ever. Skip the head/toolbar entirely so
  // the empty-state card is the hero, matching how dashboards onboard.
  if (items.length === 0) {
    return <ClientsEmptyState />;
  }

  return (
    <>
      <div className={styles.head}>
        <div>
          <Heading size="xl">All clients</Heading>
          <Text tone="muted" className={styles.sub}>
            {items.length} {items.length === 1 ? 'client' : 'clients'} in your workspace
          </Text>
        </div>
        <div className={styles.actions}>
          <Button
            variant="primary"
            leading={<IconPlus size={16} />}
            onClick={() => navigate('/clients/new')}
          >
            Add client
          </Button>
        </div>
      </div>

      <ClientsToolbar
        filter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
        counts={counts}
      />

      {visible.length === 0 ? (
        <div className={styles.noMatch}>
          <Text tone="muted">No clients match your filters.</Text>
        </div>
      ) : (
        <ClientsTable items={visible} />
      )}
    </>
  );
}
