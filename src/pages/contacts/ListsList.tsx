import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Heading, Text, Button, Note } from '../../components/ui';
import { RowSkeleton } from '../../components/skeletons';
import { IconPlus, IconMailOff } from '@tabler/icons-react';
import { ListsTable, ListFormDialog } from '../../components/contacts';
import { useLists } from '../../hooks/useLists';
import type { ContactList } from '../../lib/api/lists';
import { withFormToast } from '../../lib/toast';
import styles from '@styles/components/contacts/ListsList.module.scss';

export function ListsList() {
  const { clientId } = useParams<{ clientId: string }>();
  const cid = clientId ?? null;
  const lists = useLists(cid);

  const [creating,    setCreating]    = useState(false);
  const [editing,     setEditing]     = useState<ContactList | null>(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onCreate({ name, description }: { name: string; description: string }) {
    setSubmitting(true);
    setFieldErrors({});
    try {
      await withFormToast(
        lists.create({ name, description: description || null }),
        {
          loading: 'Creating list…',
          success: `Created ${name}`,
          onFieldError: (err) => setFieldErrors({ [err.field!]: err.message }),
        },
      );
      setCreating(false);
    } catch { /* toast shown */ }
    finally { setSubmitting(false); }
  }

  async function onRename({ name, description }: { name: string; description: string }) {
    if (!editing) return;
    setSubmitting(true);
    setFieldErrors({});
    try {
      await withFormToast(
        lists.update(editing.id, {
          name:        name !== editing.name ? name : undefined,
          description: (description || null) !== editing.description ? (description || null) : undefined,
        }),
        {
          loading: 'Saving…',
          success: `Saved ${name}`,
          onFieldError: (err) => setFieldErrors({ [err.field!]: err.message }),
        },
      );
      setEditing(null);
    } catch { /* toast shown */ }
    finally { setSubmitting(false); }
  }

  const loading = lists.status === 'idle' || lists.status === 'loading';
  const hasNone = lists.status === 'loaded' && lists.items.length === 0;

  return (
    <>
      <div className={styles.head}>
        <div>
          <Heading size="xl">Lists &amp; segments</Heading>
          <Text tone="muted" className={styles.sub}>
            {lists.items.length} {lists.items.length === 1 ? 'list' : 'lists'}
            <span className={styles.dim}> · dynamic segments + suppression ship in PR 3</span>
          </Text>
        </div>
        <div className={styles.actions}>
          <Button
            variant="ghost"
            leading={<IconMailOff size={15} />}
            disabled
            title="Suppression list ships in feature-contacts-lists PR 3"
          >
            Suppression list
          </Button>
          <Button variant="primary" leading={<IconPlus size={16} />} onClick={() => setCreating(true)}>
            New list
          </Button>
        </div>
      </div>

      {loading ? (
        <RowSkeleton count={5} />
      ) : hasNone ? (
        <div className={styles.empty}>
          <Heading size="md">No lists yet</Heading>
          <Text tone="muted" className={styles.emptyLede}>
            Lists are how you group contacts for sending — Newsletter, VIP buyers, Cart abandoners. Create your first one.
          </Text>
          <Button variant="primary" leading={<IconPlus size={16} />} onClick={() => setCreating(true)}>
            New list
          </Button>
        </div>
      ) : (
        <>
          <ListsTable items={lists.items} onEdit={(l) => setEditing(l)} />
          <Note className={styles.note}>
            <b>Static vs Dynamic</b> — Static lists are fixed snapshots, grown by hand or via forms.
            Dynamic lists are filter-rules that auto-update as contacts match. Dynamic ships in PR 3.
          </Note>
        </>
      )}

      {creating ? (
        <ListFormDialog
          submitting={submitting}
          fieldErrors={fieldErrors}
          onSubmit={onCreate}
          onClose={() => { setCreating(false); setFieldErrors({}); }}
        />
      ) : null}

      {editing ? (
        <ListFormDialog
          initial={editing}
          submitting={submitting}
          fieldErrors={fieldErrors}
          onSubmit={onRename}
          onClose={() => { setEditing(null); setFieldErrors({}); }}
        />
      ) : null}
    </>
  );
}
