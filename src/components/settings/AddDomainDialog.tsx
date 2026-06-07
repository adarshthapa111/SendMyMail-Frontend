import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconX, IconInfoCircle } from '@tabler/icons-react';
import { Heading, Text, Field, Input, Button } from '../ui';
import { ApiError } from '../../lib/api/client';
import { toast } from '../../lib/toast';
import styles from '@styles/components/settings/AddDomainDialog.module.scss';

interface Props {
  onAdd:   (name: string) => Promise<void>;
  onClose: () => void;
}

/**
 * Modal for adding a new sending domain. Validates a basic domain
 * format client-side before submitting (the backend re-validates).
 * Suggests using a subdomain in the helper copy because that's the
 * Resend best practice.
 */
export function AddDomainDialog({ onAdd, onClose }: Props) {
  const [name,    setName]    = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !submitting) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, submitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim().toLowerCase();
    if (!isValidDomain(trimmed)) {
      setError('That doesn\'t look like a valid domain. Use something like mail.yourcompany.com');
      return;
    }
    setSubmitting(true);
    try {
      await onAdd(trimmed);
      toast.success(`Added ${trimmed}`);
      onClose();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message
                : err instanceof Error    ? err.message
                : 'Failed to add domain';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className={styles.backdrop} onClick={() => { if (!submitting) onClose(); }}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className={styles.header}>
          <div>
            <Heading level={3} className={styles.title}>Add sending domain</Heading>
            <Text tone="muted" size="sm" className={styles.subtitle}>
              Verify a domain so campaigns send from your address, not
              <code>onboarding@resend.dev</code>.
            </Text>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
          >
            <IconX size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className={styles.body}>
          <Field
            label="Domain name"
            helper="Use a subdomain like mail.yourcompany.com — keeps your main DNS clean."
            error={error ?? undefined}
          >
            <Input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="mail.yourcompany.com"
              disabled={submitting}
              autoComplete="off"
              spellCheck={false}
              invalid={Boolean(error)}
            />
          </Field>

          <div className={styles.notice}>
            <IconInfoCircle size={14} className={styles.noticeIcon} />
            <Text size="xs" tone="muted" className={styles.noticeText}>
              Resend free tier allows <strong>1 verified domain</strong>. Pro
              ($20/mo) raises this to 10. After you add the domain here,
              you'll get DNS records to paste into your DNS provider — DNS
              changes take 5–30 minutes to propagate.
            </Text>
          </div>

          <footer className={styles.footer}>
            <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={submitting || !name.trim()}
            >
              {submitting ? 'Adding…' : 'Add domain'}
            </Button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Lightweight domain validation — strict enough to catch typos, loose
 * enough that we don't reject anything Resend would accept. Backend
 * Zod schema re-validates more strictly.
 */
function isValidDomain(s: string): boolean {
  if (s.length < 3 || s.length > 253) return false;
  // Must contain at least one dot (rule out single-label like "localhost")
  if (!s.includes('.')) return false;
  // Each label: 1-63 chars, a-z/0-9/-, no leading/trailing dash
  return /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)+$/.test(s);
}
