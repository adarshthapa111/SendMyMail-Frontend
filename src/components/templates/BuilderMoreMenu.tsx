import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconDots, IconCopy, IconArchive, IconDownload } from '@tabler/icons-react';
import { duplicateTemplate, archiveTemplate } from '../../lib/api/templates';
import { useAppDispatch } from '../../store/hooks';
import { addTemplate, upsertTemplate } from '../../store/slices/templatesSlice';
import { toast } from '../../lib/toast';
import { ApiError } from '../../lib/api/client';
import { ConfirmDialog } from '../contacts';
import styles from '@styles/components/templates/BuilderMoreMenu.module.scss';

interface Props {
  clientId: string;
  templateId: string;
  templateName: string;
}

/* Kebab menu in BuilderTopBar's right cluster. Duplicate / Archive / Export.
   Archive confirms via ConfirmDialog (reused from feature-contacts-lists);
   after archive succeeds we navigate back to the template list. */
export function BuilderMoreMenu({ clientId, templateId, templateName }: Props) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // Close on Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  async function onDuplicate() {
    setOpen(false);
    const id = toast.loading('Duplicating…');
    try {
      const res = await duplicateTemplate(clientId, templateId);
      dispatch(addTemplate({
        id:           res.data.template.id,
        agencyId:     res.data.template.agencyId,
        clientId:     res.data.template.clientId,
        name:         res.data.template.name,
        thumbnailUrl: res.data.template.thumbnailUrl,
        category:     res.data.template.category,
        isStarter:    res.data.template.isStarter,
        archived:     res.data.template.archived,
        createdBy:    res.data.template.createdBy,
        createdAt:    res.data.template.createdAt,
        updatedAt:    res.data.template.updatedAt,
      }));
      toast.success(`Created ${res.data.template.name}`, { id });
      // Land in the new clone so the user can keep editing without navigation friction
      navigate(`/clients/${clientId}/templates/${res.data.template.id}/edit`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Duplicate failed';
      toast.error(msg, { id });
    }
  }

  async function onArchiveConfirm() {
    setArchiving(true);
    const id = toast.loading('Archiving…');
    try {
      const res = await archiveTemplate(clientId, templateId);
      dispatch(upsertTemplate({
        id:           res.data.template.id,
        agencyId:     res.data.template.agencyId,
        clientId:     res.data.template.clientId,
        name:         res.data.template.name,
        thumbnailUrl: res.data.template.thumbnailUrl,
        category:     res.data.template.category,
        isStarter:    res.data.template.isStarter,
        archived:     res.data.template.archived,
        createdBy:    res.data.template.createdBy,
        createdAt:    res.data.template.createdAt,
        updatedAt:    res.data.template.updatedAt,
      }));
      toast.success(`Archived ${templateName}`, { id });
      navigate(`/clients/${clientId}/templates`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Archive failed';
      toast.error(msg, { id });
    } finally {
      setArchiving(false);
      setConfirming(false);
    }
  }

  function onExport() {
    setOpen(false);
    toast('Export coming with PR 4 (test-send & HTML export)');
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="More actions"
      >
        <IconDots size={16} />
      </button>

      {open ? (
        <div className={styles.menu} role="menu">
          <button type="button" className={styles.item} onClick={onDuplicate}>
            <IconCopy size={14} /> Duplicate template
          </button>
          <button type="button" className={styles.item} onClick={onExport}>
            <IconDownload size={14} /> Export HTML
          </button>
          <div className={styles.divider} />
          <button
            type="button"
            className={`${styles.item} ${styles.itemDanger}`}
            onClick={() => { setOpen(false); setConfirming(true); }}
          >
            <IconArchive size={14} /> Archive template
          </button>
        </div>
      ) : null}

      {confirming ? (
        <ConfirmDialog
          title="Archive template?"
          body={
            <>
              <b>{templateName}</b> will move to the archived section. You can
              restore it later. Existing campaigns that reference this template
              are unaffected.
            </>
          }
          confirmLabel="Archive"
          submitting={archiving}
          onConfirm={onArchiveConfirm}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </div>
  );
}
