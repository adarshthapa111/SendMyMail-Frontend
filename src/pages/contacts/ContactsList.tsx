import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Heading, Text, Button, Spinner } from '../../components/ui';
import { IconPlus, IconUpload, IconHistory } from '@tabler/icons-react';
import {
  ContactsToolbar, ContactsTable, ContactsEmptyState, ContactFormDialog,
  AddToListDialog, BulkActionBar, ConfirmDialog,
  ImportHistoryDialog, ImportProgressDialog,
  type ContactFormValues,
} from '../../components/contacts';
import { useContacts } from '../../hooks/useContacts';
import { useLists }    from '../../hooks/useLists';
import { listTags, type Tag } from '../../lib/api/tags';
import { addContactsToList } from '../../lib/api/lists';
import { useAppDispatch } from '../../store/hooks';
import { bumpMemberCount } from '../../store/slices/listsSlice';
import { withFormToast, toast } from '../../lib/toast';
import { ApiError } from '../../lib/api/client';
import type { ImportJob } from '../../lib/api/imports';
import styles from '@styles/components/contacts/ContactsList.module.scss';

export function ContactsList() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const cid = clientId ?? null;

  const contacts = useContacts(cid);
  const lists    = useLists(cid);

  const [tags, setTags]             = useState<Tag[]>([]);
  const [adding, setAdding]         = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Bulk-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAdding, setBulkAdding]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Import history + progress dialogs
  const [historyOpen, setHistoryOpen] = useState(false);
  const [progressJob, setProgressJob] = useState<ImportJob | null>(null);

  // Clear selection when the visible items change (e.g. user filters / paginates).
  // Standard "reset dependent state on dep change" pattern; the rule is
  // overly strict for this UX so we disable it on the setState line.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIds(new Set());
  }, [contacts.search, contacts.listId, contacts.tag, contacts.page]);

  // Lazy-load tags when the add dialog opens
  useEffect(() => {
    if (!cid || !adding) return;
    let cancelled = false;
    listTags(cid)
      .then((res) => { if (!cancelled) setTags(res.data.items); })
      .catch(() => { /* non-fatal */ });
    return () => { cancelled = true; };
  }, [cid, adding]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else              next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allOnPage = contacts.items.every((c) => prev.has(c.id));
      if (allOnPage) {
        // Deselect everything on this page
        const next = new Set(prev);
        for (const c of contacts.items) next.delete(c.id);
        return next;
      }
      // Select all on this page
      const next = new Set(prev);
      for (const c of contacts.items) next.add(c.id);
      return next;
    });
  }, [contacts.items]);

  async function onAdd(values: ContactFormValues) {
    setSubmitting(true);
    setFieldErrors({});
    try {
      await withFormToast(
        contacts.create({
          email:     values.email,
          firstName: values.firstName || null,
          lastName:  values.lastName  || null,
          phone:     values.phone     || null,
          city:      values.city      || null,
          birthday:  values.birthday  || null,
          tags:      values.tags,
          listIds:   values.listIds,
        }),
        {
          loading: 'Adding contact…',
          success: `Added ${values.email}`,
          onFieldError: (err) => setFieldErrors({ [err.field!]: err.message }),
        },
      );
      // Bump list-member counts in the slice
      for (const lid of values.listIds) {
        dispatch(bumpMemberCount({ listId: lid, delta: 1 }));
      }
      setAdding(false);
    } catch (err) {
      if (!(err instanceof ApiError) || !err.field) { /* toast already shown */ }
    } finally {
      setSubmitting(false);
    }
  }

  /* Bulk add the selected contacts to one or more lists. */
  async function onBulkAddToLists(targetListIds: string[]) {
    if (!cid || selectedIds.size === 0) return;
    setBulkSubmitting(true);
    const ids = Array.from(selectedIds);
    try {
      await withFormToast(
        (async () => {
          for (const listId of targetListIds) {
            const res = await addContactsToList(cid, listId, ids);
            dispatch(bumpMemberCount({ listId, delta: res.data.added }));
          }
        })(),
        {
          loading: `Adding ${ids.length} ${ids.length === 1 ? 'contact' : 'contacts'} to ${targetListIds.length} ${targetListIds.length === 1 ? 'list' : 'lists'}…`,
          success: 'Done',
        },
      );
      setBulkAdding(false);
      setSelectedIds(new Set());
    } catch { /* toast shown */ }
    finally { setBulkSubmitting(false); }
  }

  /* Bulk delete — parallel per-id API calls. */
  async function onBulkDelete() {
    if (selectedIds.size === 0) return;
    setBulkSubmitting(true);
    const ids = Array.from(selectedIds);
    try {
      await withFormToast(
        Promise.all(ids.map((id) => contacts.remove(id))),
        {
          loading: `Deleting ${ids.length} ${ids.length === 1 ? 'contact' : 'contacts'}…`,
          success: `Deleted ${ids.length} ${ids.length === 1 ? 'contact' : 'contacts'}`,
        },
      );
      setConfirmDelete(false);
      setSelectedIds(new Set());
    } catch {
      toast.error('Some deletes failed. Refresh and try again.');
    } finally { setBulkSubmitting(false); }
  }

  if (!cid) return null;

  const loading = contacts.status === 'idle' || contacts.status === 'loading';
  const isEmpty = contacts.status === 'loaded' && contacts.total === 0 && !contacts.search && !contacts.listId;

  return (
    <>
      <div className={styles.head}>
        <div>
          <Heading size="xl">Contacts</Heading>
          <Text tone="muted" className={styles.sub}>
            {contacts.total.toLocaleString()} {contacts.total === 1 ? 'contact' : 'contacts'} in {lists.items.length} {lists.items.length === 1 ? 'list' : 'lists'}
            {' · '}
            <a className={styles.historyLink} onClick={() => setHistoryOpen(true)}>
              <IconHistory size={11} style={{ verticalAlign: -1, marginRight: 3 }} />
              import history
            </a>
            <span className={styles.dim}> · suppression ships in PR 3</span>
          </Text>
        </div>
        <div className={styles.actions}>
          <Button
            variant="ghost"
            leading={<IconUpload size={16} />}
            onClick={() => navigate(`/clients/${cid}/contacts/import`)}
          >
            Import CSV
          </Button>
          <Button variant="primary" leading={<IconPlus size={16} />} onClick={() => setAdding(true)}>
            Add contact
          </Button>
        </div>
      </div>

      {isEmpty ? (
        <ContactsEmptyState onAdd={() => setAdding(true)} />
      ) : (
        <>
          <ContactsToolbar
            activeListId={contacts.listId}
            lists={lists.items}
            totalCount={contacts.total}
            onListChange={contacts.setList}
            search={contacts.search}
            onSearchChange={contacts.setSearch}
          />

          {loading ? (
            <div className={styles.spinner}><Spinner /></div>
          ) : contacts.items.length === 0 ? (
            <div className={styles.noMatch}>
              <Text tone="muted">No contacts match your filters.</Text>
            </div>
          ) : (
            <ContactsTable
              items={contacts.items}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
            />
          )}

          {contacts.status === 'loaded' && contacts.total > contacts.pageSize ? (
            <Pagination
              page={contacts.page}
              pageSize={contacts.pageSize}
              total={contacts.total}
              onPage={(p) => {
                contacts.goToPage(p);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          ) : null}
        </>
      )}

      {/* Bulk-action bar — sticky at bottom when ≥1 selected */}
      {selectedIds.size > 0 ? (
        <BulkActionBar
          count={selectedIds.size}
          onAddToList={() => setBulkAdding(true)}
          onDelete={() => setConfirmDelete(true)}
          onClear={() => setSelectedIds(new Set())}
        />
      ) : null}

      {adding ? (
        <ContactFormDialog
          tags={tags}
          lists={lists.items}
          submitting={submitting}
          fieldErrors={fieldErrors}
          onSubmit={onAdd}
          onClose={() => { setAdding(false); setFieldErrors({}); }}
        />
      ) : null}

      {bulkAdding ? (
        <AddToListDialog
          contactIds={Array.from(selectedIds)}
          lists={lists.items}
          submitting={bulkSubmitting}
          onConfirm={onBulkAddToLists}
          onClose={() => setBulkAdding(false)}
        />
      ) : null}

      {confirmDelete ? (
        <ConfirmDialog
          title={`Delete ${selectedIds.size} ${selectedIds.size === 1 ? 'contact' : 'contacts'}?`}
          body={
            <>
              These contacts will be hidden from your list. Their campaign history is preserved
              (full GDPR cascade ships in PR 3). This cannot be undone here.
            </>
          }
          confirmLabel={`Yes, delete ${selectedIds.size}`}
          submitting={bulkSubmitting}
          onConfirm={onBulkDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      ) : null}

      {historyOpen ? (
        <ImportHistoryDialog
          onClose={() => setHistoryOpen(false)}
          onOpenJob={(job) => { setHistoryOpen(false); setProgressJob(job); }}
        />
      ) : null}

      {progressJob ? (
        <ImportProgressDialog
          jobId={progressJob.id}
          initial={progressJob}
          onClose={() => setProgressJob(null)}
        />
      ) : null}
    </>
  );
}

function Pagination({ page, pageSize, total, onPage }: {
  page: number; pageSize: number; total: number; onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from  = (page - 1) * pageSize + 1;
  const to    = Math.min(page * pageSize, total);
  return (
    <div className={styles.pagination}>
      <Text tone="muted" size="xs">
        {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}
      </Text>
      <div>
        <Button variant="ghost" size="sm" disabled={page <= 1}     onClick={() => onPage(page - 1)}>Previous</Button>
        <Button variant="ghost" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
      </div>
    </div>
  );
}
