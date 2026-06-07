import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { IconPlus, IconSearch, IconTrash, IconAlertCircle } from '@tabler/icons-react';
import { Heading, Text, Button, Input, Field } from '../../components/ui';
import { RowSkeleton } from '../../components/skeletons';
import { useSuppression } from '../../hooks/useSuppression';
import { toast } from '../../lib/toast';
import { ApiError } from '../../lib/api/client';
import type { Suppression } from '../../lib/api/suppression';
import styles from '@styles/components/contacts/SuppressionList.module.scss';

/* /clients/:cid/suppression — manage the agency's do-not-mail list.
   ────────────────────────────────────────────────────────────────────
   Per-agency in storage (the impl plumbing), per-client in UX (URL is
   client-scoped so admins manage from the contacts area). Suppression
   applies across ALL the agency's clients regardless of which one was
   used to add it.

   Capabilities V1:
     - List + paginated (cursor) + search by email
     - Manually add an email (with optional note)
     - Remove a suppression (lets you re-mail that recipient)
   Out of V1:
     - Bulk CSV import
     - Filter by reason (manual / unsubscribe / hard_bounce / complaint)
     - Per-list suppression view */
export function SuppressionList() {
  const { clientId = null } = useParams<{ clientId: string }>();
  const sup = useSuppression(clientId);
  const [adding, setAdding] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addNote,  setAddNote]  = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError]   = useState<string | null>(null);

  const onAdd = async () => {
    if (!addEmail.trim()) return;
    setSubmitting(true);
    setAddError(null);
    try {
      await sup.add(addEmail.trim(), addNote.trim() || undefined);
      toast.success(`Suppressed ${addEmail.trim()}`);
      setAddEmail('');
      setAddNote('');
      setAdding(false);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message
                : err instanceof Error    ? err.message
                : 'Failed to add suppression';
      setAddError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const onRemove = async (s: Suppression) => {
    try {
      await sup.remove(s.id);
      toast.success(`Removed ${s.email} from suppression list`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to remove');
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <Heading size="xl">Suppression list</Heading>
          <Text tone="muted" className={styles.subtitle}>
            Emails we'll never mail across this agency. Unsubscribes add
            themselves automatically.
          </Text>
        </div>
        <Button
          variant="primary"
          leading={<IconPlus size={15} />}
          onClick={() => setAdding(true)}
        >
          Add manually
        </Button>
      </header>

      <div className={styles.searchRow}>
        <div className={styles.searchInput}>
          <IconSearch size={15} className={styles.searchIcon} />
          <Input
            type="search"
            placeholder="Search by email…"
            value={sup.search}
            onChange={(e) => sup.setSearch(e.target.value)}
          />
        </div>
      </div>

      {sup.loading ? (
        <RowSkeleton count={6} withPill />
      ) : sup.error ? (
        <Text tone="muted">Couldn't load: {sup.error}</Text>
      ) : sup.items.length === 0 ? (
        <div className={styles.empty}>
          <IconAlertCircle size={28} className={styles.emptyIcon} />
          <Heading size="md">
            {sup.search ? 'No matches' : 'No suppressed emails'}
          </Heading>
          <Text tone="muted" size="sm" className={styles.emptyHint}>
            {sup.search
              ? `No suppressed emails contain "${sup.search}".`
              : 'When a recipient unsubscribes, their email lands here automatically.'}
          </Text>
        </div>
      ) : (
        <div className={styles.list}>
          {sup.items.map((s) => (
            <SuppressionRow key={s.id} suppression={s} onRemove={() => onRemove(s)} />
          ))}
          {sup.hasMore && (
            <button
              type="button"
              className={styles.loadMore}
              onClick={() => sup.loadMore()}
            >
              Load more
            </button>
          )}
        </div>
      )}

      {adding && (
        <div className={styles.modalBackdrop} onClick={() => { if (!submitting) setAdding(false); }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <Heading size="md" className={styles.modalTitle}>Add to suppression list</Heading>
            <Text tone="muted" size="sm" className={styles.modalSub}>
              The email won't receive any campaign or transactional mail
              from this agency until you remove it.
            </Text>
            <Field label="Email" error={addError ?? undefined}>
              <Input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="user@example.com"
                autoFocus
                invalid={Boolean(addError)}
                disabled={submitting}
              />
            </Field>
            <Field label="Reason (optional)" helper="For your records — e.g. 'Reported as spam'">
              <Input
                type="text"
                value={addNote}
                onChange={(e) => setAddNote(e.target.value)}
                placeholder="Why is this email suppressed?"
                maxLength={280}
                disabled={submitting}
              />
            </Field>
            <div className={styles.modalFooter}>
              <Button variant="ghost" type="button" onClick={() => setAdding(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="button"
                onClick={onAdd}
                disabled={submitting || !addEmail.trim()}
              >
                {submitting ? 'Adding…' : 'Add suppression'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Row ────────────────────────────────────────────────────────── */

function SuppressionRow({ suppression: s, onRemove }: { suppression: Suppression; onRemove: () => void }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className={styles.row}>
      <div className={styles.rowMain}>
        <div className={styles.email}>{s.email}</div>
        <div className={styles.meta}>
          <span className={`${styles.pill} ${styles['pill_' + s.reason]}`}>{labelFor(s.reason)}</span>
          {s.note && <span className={styles.note} title={s.note}>{s.note}</span>}
          <span className={styles.date}>{formatDate(s.createdAt)}</span>
        </div>
      </div>
      <button
        type="button"
        className={`${styles.removeBtn} ${confirming ? styles.removeBtnConfirm : ''}`}
        onClick={() => {
          if (!confirming) {
            setConfirming(true);
            window.setTimeout(() => setConfirming(false), 4000);
          } else {
            onRemove();
          }
        }}
        title={confirming ? 'Click again to confirm' : 'Remove from list'}
      >
        <IconTrash size={14} />
        {confirming ? 'Confirm?' : 'Remove'}
      </button>
    </div>
  );
}

function labelFor(reason: Suppression['reason']): string {
  switch (reason) {
    case 'unsubscribe': return 'Unsubscribed';
    case 'manual':      return 'Manual';
    case 'hard_bounce': return 'Hard bounce';
    case 'complaint':   return 'Complaint';
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}
