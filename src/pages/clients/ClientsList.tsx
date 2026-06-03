import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Heading, Text, Button, Spinner } from '../../components/ui';
import { IconPlus } from '@tabler/icons-react';
import {
  ClientsTable, ClientsEmptyState, ClientsToolbar, ClientFormDialog, ArchiveDialog,
  type StatusFilter, type ClientFormValues,
} from '../../components/clients';
import { useClients } from '../../hooks/useClients';
import { createClient, archiveClient, updateClient, type Client, type ClientStatus } from '../../lib/api/clients';
import { addClient, upsertClient } from '../../store/slices/clientsSlice';
import { useAppDispatch } from '../../store/hooks';
import { withFormToast } from '../../lib/toast';
import styles from '@styles/components/clients/ClientsList.module.scss';

/* /clients — the agency-wide client list. The "Add client" button opens a
   modal locally instead of navigating to a separate page. The /clients/new
   route now redirects to /clients?new=1, which auto-opens the modal so
   external bookmarks and the topbar ClientSwitcher's "Create" item still work. */

export function ClientsList() {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { status, items, setActive } = useClients();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  // Modal state
  const [adding, setAdding] = useState(searchParams.get('new') === '1');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Archive dialog state — set the candidate when the user clicks "Archive"
  // on a row. The dialog itself confirms + calls archiveClient.
  const [archiveCandidate, setArchiveCandidate] = useState<Client | null>(null);
  const [archiving, setArchiving] = useState(false);
  // Restore is one click (no confirm needed — non-destructive)
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // If the user lands here with ?new=1 (from the switcher / a bookmark / the
  // /clients/new redirect), open the modal automatically. Re-runs when the
  // query param changes while the page is already mounted.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (searchParams.get('new') === '1') setAdding(true);
  }, [searchParams]);

  function closeModal() {
    setAdding(false);
    setFieldErrors({});
    // Strip ?new=1 from the URL so a refresh doesn't re-open the modal
    if (searchParams.get('new')) {
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
  }

  // Per-status counts. `all` is "everything but archived" — the Archived tab
  // has its own bucket so the All count doesn't include them.
  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { all: 0, trial: 0, active: 0, paused: 0, archived: 0 };
    for (const it of items) {
      c[it.status] = (c[it.status] ?? 0) + 1;
      if (it.status !== 'archived') c.all += 1;
    }
    return c;
  }, [items]);

  // Apply filter + search client-side. The 'all' filter EXCLUDES archived;
  // the only way to see archived clients is the dedicated Archived tab.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((c) => {
      if (filter === 'all' && c.status === 'archived') return false;
      if (filter !== 'all' && c.status !== (filter as ClientStatus)) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q);
    });
  }, [items, filter, search]);

  async function onCreate(values: ClientFormValues) {
    setSubmitting(true);
    setFieldErrors({});
    try {
      const res = await withFormToast(
        createClient({
          name:        values.name,
          domain:      values.domain || null,
          avatarColor: values.avatarColor,
        }),
        {
          loading: 'Creating client…',
          success: `Created ${values.name}`,
          onFieldError: (err) => setFieldErrors({ [err.field!]: err.message }),
        },
      );
      dispatch(addClient(res.data.client));
      setActive(res.data.client.id);   // make the new client the active one in the topbar switcher
      closeModal();
    } catch { /* toast / field error shown */ }
    finally { setSubmitting(false); }
  }

  /* Row-level "Archive" → confirm modal → API call → upsert into slice.
     The slice's upsertClient automatically swaps the active client if the
     archived one was active. */
  async function onArchiveConfirm() {
    if (!archiveCandidate) return;
    setArchiving(true);
    try {
      const res = await withFormToast(
        archiveClient(archiveCandidate.id),
        {
          loading: 'Archiving client…',
          success: `Archived ${archiveCandidate.name}`,
        },
      );
      dispatch(upsertClient(res.data.client));
      setArchiveCandidate(null);
    } catch { /* toast shown */ }
    finally { setArchiving(false); }
  }

  /* Row-level "Restore" — non-destructive, no confirm. PATCH status: 'active'. */
  async function onRestore(client: Client) {
    setRestoringId(client.id);
    try {
      const res = await withFormToast(
        updateClient(client.id, { status: 'active' }),
        {
          loading: 'Restoring…',
          success: `Restored ${client.name}`,
        },
      );
      dispatch(upsertClient(res.data.client));
    } catch { /* toast shown */ }
    finally { setRestoringId(null); }
  }

  if (status === 'loading' || status === 'idle') {
    return <div className={styles.spinner}><Spinner /></div>;
  }

  // FTUX — zero clients. Empty state owns the only "Add" trigger.
  if (items.length === 0) {
    return (
      <>
        <ClientsEmptyState onAdd={() => setAdding(true)} />
        {adding ? (
          <ClientFormDialog
            submitting={submitting}
            fieldErrors={fieldErrors}
            onSubmit={onCreate}
            onClose={closeModal}
          />
        ) : null}
      </>
    );
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
            onClick={() => setAdding(true)}
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
        <ClientsTable
          items={visible}
          onArchive={setArchiveCandidate}
          onRestore={(c) => { if (restoringId !== c.id) onRestore(c); }}
        />
      )}

      {adding ? (
        <ClientFormDialog
          submitting={submitting}
          fieldErrors={fieldErrors}
          onSubmit={onCreate}
          onClose={closeModal}
        />
      ) : null}

      {archiveCandidate ? (
        <ArchiveDialog
          client={archiveCandidate}
          submitting={archiving}
          onConfirm={onArchiveConfirm}
          onCancel={() => setArchiveCandidate(null)}
        />
      ) : null}
    </>
  );
}
