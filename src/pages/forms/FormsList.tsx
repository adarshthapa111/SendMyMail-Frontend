import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  IconPlus, IconForms, IconExternalLink, IconCheck, IconCopy, IconTrash,
  IconDots, IconEdit,
} from '@tabler/icons-react';
import { Heading, Text, Button, Spinner, Pill } from '../../components/ui';
import { useForms } from '../../hooks/useForms';
import { toast } from '../../lib/toast';
import { ApiError } from '../../lib/api/client';
import type { FormSummary } from '../../lib/api/forms';
import styles from '@styles/components/forms/FormsList.module.scss';

const APP_URL = import.meta.env.VITE_PUBLIC_URL || window.location.origin;

/* /clients/:cid/forms — list signup forms.
   ──────────────────────────────────────────
   Capabilities V1:
     - List + cursor-paginated cards
     - Status pill (active / paused)
     - Public URL shown + copyable + opens-in-new-tab
     - Submission count
     - Per-form: edit, view detail, archive
   Out of V1:
     - Filter by status
     - Sort by submission count / created date
     - Bulk operations */
export function FormsList() {
  const { clientId = null } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const forms = useForms(clientId);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <Heading size="xl">Forms</Heading>
          <Text tone="muted" className={styles.subtitle}>
            Capture new contacts via shareable signup forms.
          </Text>
        </div>
        <Button
          variant="primary"
          leading={<IconPlus size={15} />}
          onClick={() => navigate(`/clients/${clientId}/forms/new`)}
        >
          Create form
        </Button>
      </header>

      {forms.loading ? (
        <div className={styles.center}><Spinner /></div>
      ) : forms.error ? (
        <Text tone="muted">Couldn't load forms: {forms.error}</Text>
      ) : forms.items.length === 0 ? (
        <EmptyState clientId={clientId} />
      ) : (
        <div className={styles.grid}>
          {forms.items.map((f) => (
            <FormCard
              key={f.id}
              form={f}
              clientId={clientId!}
              onArchive={async (formId) => {
                try {
                  await forms.archive(formId);
                  toast.success('Form archived');
                } catch (err) {
                  toast.error(err instanceof ApiError ? err.message : 'Failed to archive');
                }
              }}
            />
          ))}
          {forms.hasMore && (
            <button type="button" className={styles.loadMore} onClick={() => forms.loadMore()}>
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Card ────────────────────────────────────────────────────────── */

interface FormCardProps {
  form:      FormSummary;
  clientId:  string;
  onArchive: (formId: string) => Promise<void>;
}

function FormCard({ form, clientId, onArchive }: FormCardProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen]       = useState(false);
  const [confirming, setConfirming]   = useState(false);
  const [copied, setCopied]           = useState(false);
  const publicUrl = `${APP_URL}/f/${form.slug}`;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch { /* user can manually copy */ }
  };

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirming) {
      setConfirming(true);
      window.setTimeout(() => setConfirming(false), 4000);
      return;
    }
    await onArchive(form.id);
    setMenuOpen(false);
  };

  return (
    <article
      className={styles.card}
      data-status={form.status}
      onClick={() => navigate(`/clients/${clientId}/forms/${form.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/clients/${clientId}/forms/${form.id}`); }}
    >
      <header className={styles.cardHead}>
        <div className={styles.cardIcon}><IconForms size={16} /></div>
        <Pill variant={form.status === 'active' ? 'green' : 'amber'} dot>
          {form.status === 'active' ? 'Active' : 'Paused'}
        </Pill>
        <div className={styles.menuWrap}>
          <button
            type="button"
            className={styles.menuBtn}
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            aria-label="Form actions"
          >
            <IconDots size={15} />
          </button>
          {menuOpen && (
            <div className={styles.menu} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className={styles.menuItem}
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); navigate(`/clients/${clientId}/forms/${form.id}/edit`); }}
              >
                <IconEdit size={14} /> Edit
              </button>
              <button
                type="button"
                className={`${styles.menuItem} ${confirming ? styles.menuItemDanger : ''}`}
                onClick={handleArchive}
              >
                <IconTrash size={14} /> {confirming ? 'Confirm archive?' : 'Archive'}
              </button>
            </div>
          )}
        </div>
      </header>

      <h3 className={styles.name}>{form.name}</h3>

      <div className={styles.urlRow}>
        <span className={styles.urlPath} title={publicUrl}>/f/{form.slug}</span>
        <button
          type="button"
          className={styles.urlAction}
          onClick={handleCopy}
          title="Copy URL"
          aria-label="Copy form URL"
        >
          {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
        </button>
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.urlAction}
          onClick={(e) => e.stopPropagation()}
          title="Open in new tab"
        >
          <IconExternalLink size={13} />
        </a>
      </div>

      <footer className={styles.cardFoot}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{form.submissionCount}</span>
          <span className={styles.statLabel}>submissions</span>
        </div>
        {form.list && (
          <div className={styles.listChip}>
            <span className={styles.listChipLabel}>To list:</span>{' '}
            <span className={styles.listChipName}>{form.list.name}</span>
          </div>
        )}
      </footer>
    </article>
  );
}

/* ─── Empty state ────────────────────────────────────────────────── */

function EmptyState({ clientId }: { clientId: string | null }) {
  return (
    <div className={styles.empty}>
      <IconForms size={28} className={styles.emptyIcon} />
      <Heading size="md">No forms yet</Heading>
      <Text tone="muted" size="sm" className={styles.emptyHint}>
        Forms let people subscribe themselves — share the URL in social bios,
        QR codes, or email signatures. Submissions auto-add to the list you
        designate.
      </Text>
      <Link to={`/clients/${clientId}/forms/new`}>
        <Button variant="primary" leading={<IconPlus size={15} />}>
          Create your first form
        </Button>
      </Link>
    </div>
  );
}
