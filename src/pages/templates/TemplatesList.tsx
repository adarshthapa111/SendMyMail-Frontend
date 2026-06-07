import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Heading, Text, Button } from '../../components/ui';
import { TemplateCardSkeleton } from '../../components/skeletons';
import { IconPlus, IconCloudUpload } from '@tabler/icons-react';
import {
  TemplateCard, TemplateFormDialog, TemplatesEmptyState, ImportMjmlDialog,
  type TemplateFormValues, type ImportMjmlValues,
} from '../../components/templates';
import { ConfirmDialog } from '../../components/contacts';
import { useTemplates } from '../../hooks/useTemplates';
import { useClients } from '../../hooks/useClients';
import { newTemplate } from '../../tree/newTemplate';
import type { TemplateSummary } from '../../lib/api/templates';
import { withFormToast, successWithUndo, toast } from '../../lib/toast';
import { ApiError } from '../../lib/api/client';
import styles from '@styles/components/templates/TemplatesList.module.scss';

/* /clients/:clientId/templates — the reusable-designs grid.
   Card-grid layout per doc/mockups/templates.html. PR 2 ships the
   "All / Client" axis; "Agency" + "Starter library" tabs land in PR 3
   when agency-level + starter templates exist. */
export function TemplatesList() {
  const { clientId = null } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const clients  = useClients();
  const tpls     = useTemplates(clientId);

  const activeClient = clients.items.find((c) => c.id === clientId) ?? null;

  // ── Modal state ───────────────────────────────────────────────
  const [creating, setCreating]       = useState(false);
  const [importing, setImporting]     = useState(false);
  const [renaming, setRenaming]       = useState<TemplateSummary | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Archive confirm state
  const [archiveCand, setArchiveCand] = useState<TemplateSummary | null>(null);
  const [archiving, setArchiving]     = useState(false);

  // ── Filter only non-archived for the V1 grid (Archived tab is PR 3) ──
  const visible = useMemo(
    () => tpls.items.filter((t) => !t.archived),
    [tpls.items],
  );

  // ── Create ────────────────────────────────────────────────────
  async function onCreate(values: TemplateFormValues) {
    if (!clientId) return;
    setSubmitting(true);
    setFieldErrors({});
    try {
      const tpl = await withFormToast(
        tpls.create({
          name:       values.name,
          category:   values.category,
          mjmlSource: newTemplate(),     // fresh empty MJML tree
        }),
        {
          loading: 'Creating template…',
          success: `Created ${values.name}`,
          onFieldError: (err) => setFieldErrors({ [err.field!]: err.message }),
        },
      );
      setCreating(false);
      // Land in the builder immediately so the user starts designing right away
      navigate(`/clients/${clientId}/templates/${tpl.id}/edit`);
    } catch (err) {
      if (!(err instanceof ApiError && err.field)) {
        /* generic error toast already shown by withFormToast */
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ── Import MJML ───────────────────────────────────────────────
  async function onImport(values: ImportMjmlValues) {
    if (!clientId) return;
    setSubmitting(true);
    setFieldErrors({});
    try {
      const tpl = await withFormToast(
        tpls.create({
          name:       values.name,
          category:   values.category,
          mjmlSource: values.tree,
        }),
        {
          loading: 'Importing…',
          success: `Imported ${values.name}`,
          onFieldError: (err) => setFieldErrors({ [err.field!]: err.message }),
        },
      );
      setImporting(false);
      navigate(`/clients/${clientId}/templates/${tpl.id}/edit`);
    } catch (err) {
      if (!(err instanceof ApiError && err.field)) {
        /* generic error toast already shown */
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ── Rename (PATCH name) ───────────────────────────────────────
  async function onRenameSubmit(values: TemplateFormValues) {
    if (!clientId || !renaming) return;
    setSubmitting(true);
    setFieldErrors({});
    try {
      await withFormToast(
        tpls.update(renaming.id, {
          name:     values.name,
          category: values.category,
        }),
        {
          loading: 'Saving…',
          success: `Renamed to ${values.name}`,
          onFieldError: (err) => setFieldErrors({ [err.field!]: err.message }),
        },
      );
      setRenaming(null);
    } catch { /* toast already shown */ }
    finally { setSubmitting(false); }
  }

  // ── Duplicate ─────────────────────────────────────────────────
  async function onDuplicate(t: TemplateSummary) {
    await withFormToast(
      tpls.duplicate(t.id),
      {
        loading: 'Duplicating…',
        success: `Created ${t.name} (copy)`,
      },
    ).catch(() => { /* toast shown */ });
  }

  // ── Archive (with confirm) ────────────────────────────────────
  /* feature-empty-states-and-undo V1 — archive is optimistic (hook
     updates UI immediately), so we skip the loading toast and go
     straight to successWithUndo for the 6-second escape hatch. */
  async function onArchiveConfirm() {
    if (!archiveCand) return;
    const cand = archiveCand;
    setArchiving(true);
    setArchiveCand(null);                            // close modal immediately
    try {
      await tpls.archive(cand.id);
      successWithUndo(
        `Archived ${cand.name}`,
        () => {
          tpls.unarchive(cand.id)
            .then(() => toast.success(`Restored ${cand.name}`))
            .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to restore'));
        },
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to archive');
    } finally {
      setArchiving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────
  if (!clientId) {
    return <div className={styles.empty}><Text tone="muted">No client selected.</Text></div>;
  }

  if (tpls.status === 'loading' || tpls.status === 'idle') {
    return (
      <div className={styles.grid} aria-busy="true">
        {Array.from({ length: 8 }).map((_, i) => <TemplateCardSkeleton key={i} />)}
      </div>
    );
  }

  if (tpls.status === 'error') {
    return (
      <div className={styles.empty}>
        <Text tone="muted">Couldn't load templates: {tpls.error}</Text>
      </div>
    );
  }

  // FTUX — zero templates for this client
  if (visible.length === 0) {
    return (
      <>
        <TemplatesEmptyState
          onAdd={() => setCreating(true)}
          onImport={() => setImporting(true)}
        />
        {creating ? (
          <TemplateFormDialog
            submitting={submitting}
            fieldErrors={fieldErrors}
            onSubmit={onCreate}
            onClose={() => setCreating(false)}
          />
        ) : null}
        {importing ? (
          <ImportMjmlDialog
            submitting={submitting}
            fieldErrors={fieldErrors}
            onSubmit={onImport}
            onClose={() => setImporting(false)}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <div className={styles.head}>
        <div>
          <Heading size="xl">Templates</Heading>
          <Text tone="muted" className={styles.sub}>
            Reusable designs{activeClient ? ` for ${activeClient.name}` : ''}
          </Text>
        </div>
        <div className={styles.actions}>
          <Button
            variant="secondary"
            leading={<IconCloudUpload size={16} />}
            onClick={() => setImporting(true)}
          >
            Import MJML
          </Button>
          <Button
            variant="primary"
            leading={<IconPlus size={16} />}
            onClick={() => setCreating(true)}
          >
            New template
          </Button>
        </div>
      </div>

      <div className={styles.grid}>
        {visible.map((t) => (
          <TemplateCard
            key={t.id}
            template={t}
            onOpen={(tpl) => navigate(`/clients/${clientId}/templates/${tpl.id}/edit`)}
            onRename={(tpl) => setRenaming(tpl)}
            onDuplicate={onDuplicate}
            onArchive={(tpl) => setArchiveCand(tpl)}
          />
        ))}
      </div>

      {creating ? (
        <TemplateFormDialog
          submitting={submitting}
          fieldErrors={fieldErrors}
          onSubmit={onCreate}
          onClose={() => setCreating(false)}
        />
      ) : null}

      {importing ? (
        <ImportMjmlDialog
          submitting={submitting}
          fieldErrors={fieldErrors}
          onSubmit={onImport}
          onClose={() => setImporting(false)}
        />
      ) : null}

      {renaming ? (
        <TemplateFormDialog
          initial={renaming}
          submitting={submitting}
          fieldErrors={fieldErrors}
          onSubmit={onRenameSubmit}
          onClose={() => setRenaming(null)}
        />
      ) : null}

      {archiveCand ? (
        <ConfirmDialog
          title="Archive template?"
          body={
            <>
              <b>{archiveCand.name}</b> will move to the archived section. You
              can restore it later. Existing campaigns that reference this
              template are unaffected.
            </>
          }
          confirmLabel="Archive"
          submitting={archiving}
          onConfirm={onArchiveConfirm}
          onCancel={() => setArchiveCand(null)}
        />
      ) : null}
    </>
  );
}
