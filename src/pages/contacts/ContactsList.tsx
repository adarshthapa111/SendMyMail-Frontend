import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Heading, Text, Button, Spinner } from '../../components/ui';
import { IconPlus, IconUpload } from '@tabler/icons-react';
import {
  ContactsToolbar, ContactsTable, ContactsEmptyState, ContactFormDialog,
  type ContactFormValues,
} from '../../components/contacts';
import { useContacts } from '../../hooks/useContacts';
import { useLists } from '../../hooks/useLists';
import { listTags, type Tag } from '../../lib/api/tags';
import { withFormToast } from '../../lib/toast';
import { ApiError } from '../../lib/api/client';
import styles from '@styles/components/contacts/ContactsList.module.scss';

export function ContactsList() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const cid = clientId ?? null;

  const contacts = useContacts(cid);
  const lists    = useLists(cid);

  const [tags, setTags] = useState<Tag[]>([]);
  const [adding, setAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Lazy-load tags for the form when the dialog opens
  useEffect(() => {
    if (!cid || !adding) return;
    let cancelled = false;
    listTags(cid)
      .then((res) => { if (!cancelled) setTags(res.data.items); })
      .catch(() => { /* non-fatal */ });
    return () => { cancelled = true; };
  }, [cid, adding]);

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
      // Bump member count for every list the contact was added to
      for (const lid of values.listIds) {
        const exists = lists.items.find((l) => l.id === lid);
        if (exists) lists.update(lid, {}).catch(() => { /* no-op — we'll just live without the bump */ });
      }
      setAdding(false);
    } catch (err) {
      if (!(err instanceof ApiError) || !err.field) {
        // toast handled the non-field error; keep the modal open so user can retry
      }
    } finally {
      setSubmitting(false);
    }
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
            <span className={styles.dim}> · suppression ships in PR 3</span>
          </Text>
        </div>
        <div className={styles.actions}>
          <Button
            variant="ghost"
            leading={<IconUpload size={16} />}
            disabled
            title="CSV import ships in feature-contacts-lists PR 2"
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
            <ContactsTable items={contacts.items} />
          )}

          {/* Pagination — minimal V1, only shows if there's more than one page */}
          {contacts.status === 'loaded' && contacts.total > contacts.pageSize ? (
            <Pagination
              page={contacts.page}
              pageSize={contacts.pageSize}
              total={contacts.total}
              onPage={(p) => navigate(`/clients/${clientId}/contacts?page=${p}`)}
            />
          ) : null}
        </>
      )}

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
    </>
  );
}

/* Tiny pagination — V1 is just prev/next + count. */
function Pagination({ page, pageSize, total, onPage }: {
  page: number; pageSize: number; total: number; onPage: (p: number) => void;
}) {
  const pages   = Math.max(1, Math.ceil(total / pageSize));
  const from    = (page - 1) * pageSize + 1;
  const to      = Math.min(page * pageSize, total);
  return (
    <div className={styles.pagination}>
      <Text tone="muted" size="xs">
        {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}
      </Text>
      <div>
        <Button variant="ghost" size="sm" disabled={page <= 1}      onClick={() => onPage(page - 1)}>Previous</Button>
        <Button variant="ghost" size="sm" disabled={page >= pages}  onClick={() => onPage(page + 1)}>Next</Button>
      </div>
    </div>
  );
}
