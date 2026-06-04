import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Heading, Field, Input, Button } from '../ui';
import { IconX } from '@tabler/icons-react';
import type { TemplateSummary } from '../../lib/api/templates';
import styles from '@styles/components/templates/TemplateFormDialog.module.scss';

export interface TemplateFormValues {
  name: string;
  category: string | null;
}

interface Props {
  /** When `initial` is set we're in rename mode — title + submit label adapt. */
  initial?: TemplateSummary;
  submitting: boolean;
  fieldErrors?: Record<string, string>;
  onSubmit: (values: TemplateFormValues) => void;
  onClose: () => void;
}

const CATEGORY_OPTIONS = [
  'Welcome', 'Newsletter', 'Promo', 'Transactional', 'Cart',
  'Birthday', 'Festive', 'Re-engagement',
];

/* Modal for creating a new template OR renaming an existing one.
   Reuses the ClientFormDialog shell: portal-mounted, ESC close,
   body-scroll-lock, click-outside-to-close, terra-themed. */
export function TemplateFormDialog({ initial, submitting, fieldErrors, onSubmit, onClose }: Props) {
  const isEdit = !!initial;
  const [name, setName]         = useState(initial?.name ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [touched, setTouched]   = useState({ name: false });

  // ESC to close (only when not submitting)
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !submitting) onClose(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [submitting, onClose]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const nameTrimmed = name.trim();
  const localErr = touched.name && !nameTrimmed ? 'Name is required' : null;
  const fieldErr = fieldErrors?.name ?? null;
  const nameErr  = fieldErr ?? localErr;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true });
    if (!nameTrimmed || submitting) return;
    onSubmit({
      name:     nameTrimmed,
      category: category.trim() || null,
    });
  }

  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
    >
      <div className={styles.dialog} role="dialog" aria-labelledby="tpl-form-title">
        <div className={styles.header}>
          <Heading id="tpl-form-title" size="lg">
            {isEdit ? `Rename "${initial?.name ?? 'template'}"` : 'New template'}
          </Heading>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close" disabled={submitting}>
            <IconX size={16} />
          </button>
        </div>

        <form className={styles.body} onSubmit={handleSubmit}>
          <Field label="Name" error={nameErr ?? undefined}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              placeholder="Welcome email"
              maxLength={120}
              autoFocus
              disabled={submitting}
            />
          </Field>

          <Field
            label="Category"
            hint="optional"
            helper="Used for the card icon. Pick from common values or type your own."
          >
            <Input
              list="tpl-category-options"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Welcome / Newsletter / Promo …"
              maxLength={40}
              disabled={submitting}
            />
            <datalist id="tpl-category-options">
              {CATEGORY_OPTIONS.map((c) => <option key={c} value={c} />)}
            </datalist>
          </Field>

          <div className={styles.actions}>
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!nameTrimmed} loading={submitting}>
              {isEdit ? 'Save changes' : 'Create template'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
