import { useEffect, useRef, useState } from 'react';
import { updateTemplate } from '../../lib/api/templates';
import { useAppDispatch } from '../../store/hooks';
import { upsertTemplate } from '../../store/slices/templatesSlice';
import { toast } from '../../lib/toast';
import { ApiError } from '../../lib/api/client';
import styles from '@styles/components/templates/BuilderInlineName.module.scss';

interface Props {
  clientId: string;
  templateId: string;
  /** Current name shown + edited. Parent passes the latest from local state. */
  name: string;
  /** Optional category — rendered as a small `· {category}` suffix. */
  category: string | null;
  /** Callback so parent stays the source of truth when the API resolves. */
  onChange: (name: string) => void;
}

/* Click-to-rename template name in the top bar. Blur or Enter commits via
   PATCH; Escape reverts. Mirrors Figma / Notion / Mailchimp pattern. */
export function BuilderInlineName({ clientId, templateId, name, category, onChange }: Props) {
  const dispatch = useAppDispatch();
  const ref = useRef<HTMLSpanElement>(null);
  const [busy, setBusy] = useState(false);

  // Keep the DOM in sync when `name` changes externally (e.g. after PATCH).
  useEffect(() => {
    if (ref.current && ref.current.textContent !== name) {
      ref.current.textContent = name;
    }
  }, [name]);

  async function commit() {
    if (!ref.current) return;
    const next = (ref.current.textContent ?? '').trim();
    if (!next) {
      // Empty — revert.
      ref.current.textContent = name;
      return;
    }
    if (next === name) return;       // no change
    if (next.length > 120) {
      ref.current.textContent = name;
      toast.error('Name must be 120 characters or fewer');
      return;
    }
    setBusy(true);
    try {
      const res = await updateTemplate(clientId, templateId, { name: next });
      onChange(res.data.template.name);
      // Strip mjmlSource for the list-cache row (TemplateSummary shape).
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
      toast.success(`Renamed to ${next}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Rename failed';
      toast.error(msg);
      if (ref.current) ref.current.textContent = name;     // revert
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLSpanElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      ref.current?.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (ref.current) ref.current.textContent = name;
      ref.current?.blur();
    }
  }

  return (
    <div className={styles.wrap}>
      <span
        ref={ref}
        className={`${styles.name} ${busy ? styles.busy : ''}`}
        contentEditable={!busy}
        suppressContentEditableWarning
        spellCheck={false}
        onBlur={commit}
        onKeyDown={onKeyDown}
        title="Click to rename"
      >
        {name}
      </span>
      {category ? <small className={styles.cat}>· {category}</small> : null}
    </div>
  );
}
