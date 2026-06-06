import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IconX, IconSend, IconInfoCircle } from '@tabler/icons-react';
import { Heading, Text, Field, Input, Button } from '../ui';
import { useAppSelector } from '../../store/hooks';
import { testSendTemplate } from '../../lib/api/templates';
import { ApiError } from '../../lib/api/client';
import { toast } from '../../lib/toast';
import styles from '@styles/components/templates/TestSendDialog.module.scss';

interface Props {
  clientId:     string;
  templateId:   string;
  templateName: string;
  onClose:      () => void;
}

/**
 * Modal for sending the saved template to a test recipient.
 *
 * Contract: the parent (TestSendButton) is responsible for ensuring the
 * template is saved before opening this dialog — the backend route reads
 * `mjmlSource` from the database, not from a request body. This dialog
 * just collects the recipient + optional subject override.
 *
 * Resend constraint: with the default `onboarding@resend.dev` sender and
 * no verified domain, Resend ONLY delivers to the email the user signed
 * up with. We surface this as a helper hint rather than blocking — the
 * user might have verified a domain, and the backend's error message is
 * clearer than client-side guesswork.
 */
export function TestSendDialog({ clientId, templateId, templateName, onClose }: Props) {
  const userEmail = useAppSelector((s) => s.auth.user?.email ?? '');

  const [toEmail, setToEmail] = useState(userEmail);
  const [subject, setSubject] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the email input on open + close on Esc.
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !sending) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, sending]);

  const placeholderSubject = `[Test] ${templateName}`;

  const onSend = async () => {
    if (sending || !toEmail.trim()) return;
    setSending(true);
    const id = toast.loading(`Sending test to ${toEmail}…`);
    try {
      const res = await testSendTemplate(clientId, templateId, {
        toEmail: toEmail.trim(),
        subject: subject.trim() || undefined,
      });
      toast.success(`Sent to ${res.data.to} — check your inbox (may take ~10s)`, { id });
      onClose();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message
                : err instanceof Error    ? err.message
                : 'Failed to send test email.';
      toast.error(msg, { id });
      // Stay open so user can adjust + retry
    } finally {
      setSending(false);
    }
  };

  return createPortal(
    <div className={styles.backdrop} onClick={() => { if (!sending) onClose(); }}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className={styles.header}>
          <div>
            <Heading level={3} className={styles.title}>Send test email</Heading>
            <Text tone="muted" size="sm" className={styles.subtitle}>
              Preview <strong>{templateName}</strong> in a real inbox.
            </Text>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            disabled={sending}
            aria-label="Close"
          >
            <IconX size={18} />
          </button>
        </header>

        <div className={styles.body}>
          <Field label="To">
            <Input
              ref={inputRef}
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={sending}
              autoComplete="email"
            />
          </Field>

          <Field label="Subject" hint="Defaults to the template name if left blank.">
            <Input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={placeholderSubject}
              disabled={sending}
              maxLength={200}
            />
          </Field>

          <div className={styles.notice}>
            <IconInfoCircle size={14} className={styles.noticeIcon} />
            <Text size="xs" tone="muted" className={styles.noticeText}>
              Without a verified sending domain, Resend only delivers to the
              email you signed up with. To send to others, verify a domain in
              your Resend dashboard and set <code>EMAIL_FROM</code> on the
              backend.
            </Text>
          </div>
        </div>

        <footer className={styles.footer}>
          <Button variant="ghost" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onSend}
            disabled={sending || !toEmail.trim()}
            leading={<IconSend size={14} />}
          >
            {sending ? 'Sending…' : 'Send test'}
          </Button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
