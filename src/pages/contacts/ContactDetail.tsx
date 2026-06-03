import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Heading, Text, Card, Button, Pill, Spinner } from '../../components/ui';
import {
  IconArrowLeft, IconEdit, IconTrash, IconPlus, IconMail, IconCake,
} from '@tabler/icons-react';
import {
  ContactFormDialog, AddToListDialog,
  type ContactFormValues,
} from '../../components/contacts';
import { useContacts } from '../../hooks/useContacts';
import { useLists }    from '../../hooks/useLists';
import { listTags, type Tag } from '../../lib/api/tags';
import { getContact, type Contact } from '../../lib/api/contacts';
import { addContactsToList, updateMembershipStatus } from '../../lib/api/lists';
import { useAppDispatch } from '../../store/hooks';
import { upsertContact } from '../../store/slices/contactsSlice';
import { bumpMemberCount } from '../../store/slices/listsSlice';
import { withFormToast } from '../../lib/toast';
import styles from '@styles/components/contacts/ContactDetail.module.scss';

function nameOf(c: Contact): string {
  const parts = [c.firstName, c.lastName].filter(Boolean);
  return parts.join(' ') || c.email;
}

function initials(c: Contact): string {
  const n = nameOf(c);
  const parts = n.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return n.slice(0, 2).toUpperCase();
}

function fmtAdded(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function ContactDetail() {
  const { clientId, contactId } = useParams<{ clientId: string; contactId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const contacts = useContacts(clientId ?? null);
  const lists    = useLists(clientId ?? null);

  // Cached copy from the slice (if the user opened this page from the list)
  const cached = useMemo(
    () => contacts.items.find((c) => c.id === contactId),
    [contacts.items, contactId],
  );

  // Local copy for deep-links where the contact isn't in the slice yet —
  // and to reflect post-save changes when the slice's pagination doesn't
  // currently include this id.
  const [fetched,     setFetched]     = useState<Contact | null>(null);
  const [fetching,    setFetching]    = useState(false);
  const [editing,     setEditing]     = useState(false);
  const [addingList,  setAddingList]  = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [tags,        setTags]        = useState<Tag[]>([]);
  const [subBusyListId, setSubBusyListId] = useState<string | null>(null);

  const contact: Contact | null = cached ?? fetched;
  const loading = !contact && fetching;

  // Fetch only when not in slice cache. The loading-flag set is sync-in-effect
  // but it's the standard async-fetch pattern — the rule is too strict here.
  useEffect(() => {
    if (!clientId || !contactId || cached) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFetching(true);
    getContact(clientId, contactId)
      .then((res) => { if (!cancelled) { setFetched(res.data.contact); setFetching(false); } })
      .catch(() => { if (!cancelled) { setFetching(false); navigate(`/clients/${clientId}/contacts`); } });
    return () => { cancelled = true; };
  }, [clientId, contactId, cached, navigate]);

  // Lazy-load tags when the edit dialog opens
  useEffect(() => {
    if (!clientId || !editing) return;
    let cancelled = false;
    listTags(clientId)
      .then((res) => { if (!cancelled) setTags(res.data.items); })
      .catch(() => { /* non-fatal */ });
    return () => { cancelled = true; };
  }, [clientId, editing]);

  if (loading) return <div className={styles.spinner}><Spinner /></div>;
  if (!contact || !clientId || !contactId) return null;

  async function onSave(values: ContactFormValues) {
    if (!contact) return;
    setSubmitting(true);
    setFieldErrors({});
    try {
      const updated = await withFormToast(
        contacts.update(contact.id, {
          firstName: values.firstName || null,
          lastName:  values.lastName  || null,
          phone:     values.phone     || null,
          city:      values.city      || null,
          birthday:  values.birthday  || null,
          tags:      values.tags,
        }),
        {
          loading: 'Saving…',
          success: `Saved ${values.email}`,
          onFieldError: (err) => setFieldErrors({ [err.field!]: err.message }),
        },
      );
      setFetched(updated);
      setEditing(false);
    } catch { /* toast shown */ }
    finally { setSubmitting(false); }
  }

  async function onDelete() {
    if (!contact) return;
    if (!window.confirm(`Delete ${contact.email}? This hides them from the list (full GDPR cascade ships in PR 3).`)) return;
    try {
      await withFormToast(
        contacts.remove(contact.id),
        { loading: 'Deleting…', success: `Deleted ${contact.email}` },
      );
      navigate(`/clients/${clientId}/contacts`);
    } catch { /* toast shown */ }
  }

  async function onAddToLists(listIds: string[]) {
    if (!contact || !clientId) return;
    setSubmitting(true);
    try {
      const res = await withFormToast(
        addContactsToList(clientId, listIds[0]!, [contact.id]),       // V1: backend supports one list per call
        { loading: 'Adding to lists…', success: 'Added to lists' },
      );
      // Apply the rest if multiple picked
      for (let i = 1; i < listIds.length; i++) {
        await addContactsToList(clientId, listIds[i]!, [contact.id]);
      }
      for (const lid of listIds) dispatch(bumpMemberCount({ listId: lid, delta: res.data.added > 0 ? 1 : 0 }));

      // Refresh the contact
      const fresh = await getContact(clientId, contact.id);
      setFetched(fresh.data.contact);
      dispatch(upsertContact(fresh.data.contact));
      setAddingList(false);
    } catch { /* toast shown */ }
    finally { setSubmitting(false); }
  }

  /* Flip per-list subscription status. Toast feedback; optimistic update of
     `fetched` so the pill + button flip instantly without a refetch. */
  async function onToggleSubscription(listId: string, currentStatus: 'subscribed' | 'unsubscribed' | 'pending') {
    if (!contact || !clientId) return;
    const next = currentStatus === 'subscribed' ? 'unsubscribed' : 'subscribed';
    setSubBusyListId(listId);
    try {
      await withFormToast(
        updateMembershipStatus(clientId, listId, contact.id, next),
        {
          loading: next === 'unsubscribed' ? 'Unsubscribing…' : 'Re-subscribing…',
          success: next === 'unsubscribed' ? 'Unsubscribed from list' : 'Re-subscribed to list',
        },
      );
      // Optimistically update the contact's list memberships locally
      const updated: Contact = {
        ...contact,
        lists: contact.lists.map((l) => l.listId === listId ? { ...l, status: next } : l),
      };
      setFetched(updated);
      dispatch(upsertContact(updated));
    } catch { /* toast shown */ }
    finally { setSubBusyListId(null); }
  }

  const subscribedListIds = contact.lists.filter((l) => l.status === 'subscribed').map((l) => l.listId);

  return (
    <>
      <Link to={`/clients/${clientId}/contacts`} className={styles.back}>
        <IconArrowLeft size={14} /> Back to contacts
      </Link>

      <div className={styles.head}>
        <div className={styles.id}>
          <span className={styles.av} aria-hidden="true">{initials(contact)}</span>
          <div>
            <Heading size="xl" className={styles.name}>{nameOf(contact)}</Heading>
            <Text tone="muted" size="sm">
              {contact.email}
              {contact.source ? <> · added {fmtAdded(contact.createdAt)}</> : null}
            </Text>
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="ghost" leading={<IconEdit size={15} />} onClick={() => setEditing(true)}>Edit</Button>
          <Button variant="danger" leading={<IconTrash size={15} />} onClick={onDelete}>Delete</Button>
        </div>
      </div>

      <div className={styles.split}>
        <div className={styles.col}>
          <Card padding="lg">
            <div className={styles.cardTitle}>Profile</div>
            <Kv label="Email"    value={contact.email} />
            <Kv label="Phone"    value={contact.phone ?? '—'} />
            <Kv label="City"     value={contact.city  ?? '—'} />
            <Kv label="Birthday" value={contact.birthday ? new Date(contact.birthday).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'} />
            <Kv label="Source"   value={contact.source ?? '—'} />
            <Kv label="Tags"     value={contact.tags.length === 0 ? '—' : (
              <div className={styles.tags}>
                {contact.tags.map((t) => <Pill key={t} variant="purple">{t}</Pill>)}
              </div>
            )} />
          </Card>

          <Card padding="lg">
            <div className={styles.cardTitleRow}>
              <span className={styles.cardTitle}>Lists &amp; subscriptions</span>
              <Button variant="ghost" size="sm" leading={<IconPlus size={14} />} onClick={() => setAddingList(true)}>Add to list</Button>
            </div>
            {contact.lists.length === 0 ? (
              <Text tone="muted" size="sm">Not in any lists yet.</Text>
            ) : (
              <div className={styles.lists}>
                {contact.lists.map((l) => (
                  <div key={l.listId} className={styles.listRow}>
                    <Link to={`/clients/${clientId}/lists`} className={styles.listName}>{l.listName}</Link>
                    <div className={styles.listRight}>
                      {l.status === 'subscribed'
                        ? <Pill variant="green">Subscribed</Pill>
                        : l.status === 'pending'
                          ? <Pill variant="amber">Pending</Pill>
                          : <Pill variant="gray">Unsubscribed</Pill>
                      }
                      <button
                        type="button"
                        className={styles.subBtn}
                        disabled={subBusyListId === l.listId}
                        onClick={() => onToggleSubscription(l.listId, l.status)}
                      >
                        {l.status === 'subscribed' ? 'Unsubscribe' : 'Re-subscribe'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className={styles.col}>
          <Card padding="lg" className={styles.tlCard}>
            <div className={styles.cardTitle}>Recent activity</div>
            <div className={styles.tlEmpty}>
              <span className={styles.tlIcon}><IconMail size={20} /></span>
              <div>
                <div className={styles.tlEmptyTitle}>Activity will show up here</div>
                <Text tone="muted" size="xs">
                  Sends, opens, clicks, and orders appear once event ingestion ships
                  (<a className={styles.docLink}>Feature 10 — reporting &amp; analytics</a>).
                </Text>
              </div>
            </div>
            <div className={styles.tlSeed}>
              <span className={styles.tlIcon}><IconCake size={20} /></span>
              <div>
                <Text size="sm">Created on <b>{fmtAdded(contact.createdAt)}</b></Text>
                <Text tone="muted" size="xs">via {contact.source ?? 'manual entry'}</Text>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {editing ? (
        <ContactFormDialog
          initial={contact}
          tags={tags}
          lists={lists.items}
          submitting={submitting}
          fieldErrors={fieldErrors}
          onSubmit={onSave}
          onClose={() => { setEditing(false); setFieldErrors({}); }}
        />
      ) : null}

      {addingList ? (
        <AddToListDialog
          contactIds={[contact.id]}
          lists={lists.items}
          excludeListIds={subscribedListIds}
          submitting={submitting}
          onConfirm={onAddToLists}
          onClose={() => setAddingList(false)}
        />
      ) : null}
    </>
  );
}

function Kv({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={styles.kv}>
      <span className={styles.kvK}>{label}</span>
      <span className={styles.kvV}>{value}</span>
    </div>
  );
}
