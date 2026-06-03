import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { Button, Heading, Text, Pill, Spinner } from '../ui';
import { IconX, IconFileSpreadsheet } from '@tabler/icons-react';
import { listImports, type ImportJob } from '../../lib/api/imports';
import shellStyles from '@styles/components/contacts/ContactFormDialog.module.scss';
import styles from '@styles/components/contacts/ImportHistoryDialog.module.scss';

interface Props {
  onClose: () => void;
  onOpenJob: (job: ImportJob) => void;
}

const STATUS: Record<ImportJob['status'], { label: string; variant: 'gray' | 'green' | 'amber' | 'red' | 'blue' }> = {
  pending:   { label: 'Pending',   variant: 'gray'   },
  parsing:   { label: 'Reading',   variant: 'blue'   },
  importing: { label: 'Importing', variant: 'blue'   },
  done:      { label: 'Done',      variant: 'green'  },
  failed:    { label: 'Failed',    variant: 'red'    },
};

function fmtRelative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMin = Math.max(0, Math.floor((now - then) / 60_000));
  if (diffMin < 1)   return 'Just now';
  if (diffMin < 60)  return `${diffMin} min ago`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24)    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 14)     return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ImportHistoryDialog({ onClose, onOpenJob }: Props) {
  const { clientId } = useParams<{ clientId: string }>();
  const [items, setItems]     = useState<ImportJob[] | null>(null);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    listImports(clientId)
      .then((res) => { if (!cancelled) setItems(res.data.items); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load history'); });
    return () => { cancelled = true; };
  }, [clientId]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return createPortal(
    <div
      className={shellStyles.backdrop}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={shellStyles.dialog} role="dialog" aria-labelledby="import-history-title">
        <div className={shellStyles.header}>
          <Heading id="import-history-title" size="lg">Import history</Heading>
          <button type="button" className={shellStyles.close} onClick={onClose} aria-label="Close">
            <IconX size={16} />
          </button>
        </div>

        <div className={shellStyles.form}>
          {error ? (
            <Text tone="red" size="sm">{error}</Text>
          ) : items === null ? (
            <div className={styles.spinner}><Spinner /></div>
          ) : items.length === 0 ? (
            <Text tone="muted" size="sm" className={styles.empty}>
              You haven't run a CSV import for this client yet.
            </Text>
          ) : (
            <div className={styles.list}>
              {items.map((j) => {
                const s = STATUS[j.status];
                return (
                  <button
                    key={j.id}
                    type="button"
                    className={styles.row}
                    onClick={() => onOpenJob(j)}
                  >
                    <div className={styles.icon}><IconFileSpreadsheet size={18} /></div>
                    <div className={styles.main}>
                      <div className={styles.filename}>{j.filename}</div>
                      <div className={styles.sub}>
                        {fmtRelative(j.createdAt)}
                        {' · '}
                        {j.importedRows.toLocaleString()} imported
                        {j.skippedRows > 0 ? ` · ${j.skippedRows.toLocaleString()} skipped` : ''}
                        {j.rejectedRows > 0 ? ` · ${j.rejectedRows.toLocaleString()} rejected` : ''}
                      </div>
                    </div>
                    <Pill variant={s.variant}>{s.label}</Pill>
                  </button>
                );
              })}
            </div>
          )}

          <div className={shellStyles.foot}>
            <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
