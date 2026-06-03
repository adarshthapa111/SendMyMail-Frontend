import { useState, type FormEvent } from 'react';
import { Field, Input, Button } from '../ui';
import { IconArrowRight } from '@tabler/icons-react';
import { BrandColorPicker } from './BrandColorPicker';
import { DEFAULT_BRAND_COLOR } from '../../lib/clientColor';
import type { Client } from '../../lib/api/clients';
import styles from '@styles/components/clients/ClientForm.module.scss';

export interface ClientFormValues {
  name: string;
  avatarColor: string;
  domain: string;     // empty string = null on the wire
}

interface Props {
  initial?: Client;
  submitLabel: string;
  submitting: boolean;
  fieldErrors?: Record<string, string>;
  onSubmit: (values: ClientFormValues) => void;
  onCancel?: () => void;
  /* Render a sub-footer in the danger zone (used by edit page for archive). */
  trailing?: React.ReactNode;
}

/* Shared form for Create + Edit. The form has no slug field — slugs are
   server-generated and never exposed in V1. Backend returns 409 name_taken
   on collision, surfaced as a field error on the `name` input. */
export function ClientForm({
  initial, submitLabel, submitting, fieldErrors, onSubmit, onCancel, trailing,
}: Props) {
  const [name,        setName]        = useState(initial?.name ?? '');
  const [avatarColor, setAvatarColor] = useState(initial?.avatarColor ?? DEFAULT_BRAND_COLOR);
  const [domain,      setDomain]      = useState(initial?.domain ?? '');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({ name: name.trim(), avatarColor, domain: domain.trim() });
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <Field label="Client name" error={fieldErrors?.name}>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Khukri Spices"
          required
          maxLength={100}
          invalid={!!fieldErrors?.name}
          autoFocus
        />
      </Field>

      <Field label="Brand colour" helper="Shows up in the client switcher and on every campaign card.">
        <BrandColorPicker value={avatarColor} onChange={setAvatarColor} />
      </Field>

      <Field
        label={<>Sending domain <span className={styles.optional}>(you'll verify this next)</span></>}
        helper="Don't have it yet? You can add it later."
        error={fieldErrors?.domain}
      >
        <Input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="mail.yourclient.com"
          maxLength={253}
          invalid={!!fieldErrors?.domain}
        />
      </Field>

      <div className={styles.foot}>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>Cancel</Button>
        ) : null}
        <Button
          type="submit"
          variant="primary"
          loading={submitting}
          trailing={!submitting ? <IconArrowRight size={16} /> : undefined}
        >
          {submitting ? `${submitLabel}…` : submitLabel}
        </Button>
      </div>

      {trailing}
    </form>
  );
}
