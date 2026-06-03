import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Heading, Text } from '../ui';
import {
  IconX, IconCheck, IconAlertTriangle, IconLoader2,
  IconFileSpreadsheet,
} from '@tabler/icons-react';
import { getImport, type ImportJob } from '../../lib/api/imports';
import styles from '@styles/components/contacts/ImportProgressDialog.module.scss';
import shellStyles from '@styles/components/contacts/ContactFormDialog.module.scss';

interface Props {
  jobId: string;
  /** Optional initial job (returned from the upload call) — avoids a render-flash. */
  initial?: ImportJob;
  onClose: () => void;
}

const POLL_INTERVAL_MS = 1000;
const TERMINAL: ReadonlySet<ImportJob['status']> = new Set(['done', 'failed']);

function fmtPct(processed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, (processed / total) * 100);
}

const REJECTED_REASON_COPY: Record<string, string> = {
  too_many_role_accounts:
    "Too many of your contacts are role accounts (info@, admin@, etc.). Importing them tanks deliverability for everyone — edit the list and try again.",
  invalid_csv:
    "We couldn't read the CSV. The most common cause is a missing header row or the wrong column mapped to Email.",
  parse_error:
    "Something went wrong while parsing the file. Try re-exporting from your spreadsheet as UTF-8 CSV.",
};

export function ImportProgressDialog({ jobId, initial, onClose }: Props) {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<ImportJob | null>(initial ?? null);
  const timer = useRef<number | null>(null);

  /* Poll until terminal. */
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    async function tick() {
      if (cancelled || !clientId) return;
      try {
        const res = await getImport(clientId, jobId);
        if (cancelled) return;
        setJob(res.data.job);
        if (!TERMINAL.has(res.data.job.status)) {
          timer.current = window.setTimeout(tick, POLL_INTERVAL_MS);
        }
      } catch {
        // Silent — next tick retries
        timer.current = window.setTimeout(tick, POLL_INTERVAL_MS * 2);
      }
    }
    tick();
    return () => {
      cancelled = true;
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [clientId, jobId]);

  /* ESC to close (only when terminal — don't let the user cancel a running import) */
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && job && TERMINAL.has(job.status)) onClose();
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [job, onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (!job) return null;

  const isTerminal = TERMINAL.has(job.status);
  const pct = fmtPct(job.processedRows, job.totalRows);
  const isDone   = job.status === 'done';
  const isFailed = job.status === 'failed';

  return createPortal(
    <div
      className={shellStyles.backdrop}
      onMouseDown={(e) => { if (e.target === e.currentTarget && isTerminal) onClose(); }}
    >
      <div className={shellStyles.dialog} role="dialog" aria-labelledby="import-progress-title">
        <div className={shellStyles.header}>
          <div className={styles.titleRow}>
            <div className={`${styles.statusIcon} ${isDone ? styles.statusDone : isFailed ? styles.statusFailed : ''}`}>
              {isDone ? <IconCheck size={18} />
                : isFailed ? <IconAlertTriangle size={18} />
                : <IconLoader2 size={18} className={styles.spin} />}
            </div>
            <div className={styles.titleMeta}>
              <Heading id="import-progress-title" size="md" className={styles.title}>
                {isDone   ? 'Import complete'
                 : isFailed ? 'Import failed'
                 : job.status === 'parsing'  ? 'Reading your file…'
                 : job.status === 'pending'  ? 'Starting…'
                 : 'Importing…'}
              </Heading>
              <Text tone="soft" size="xs">
                <IconFileSpreadsheet size={11} style={{ verticalAlign: -1, marginRight: 3 }} />
                {job.filename}
              </Text>
            </div>
          </div>
          {isTerminal ? (
            <button type="button" className={shellStyles.close} onClick={onClose} aria-label="Close">
              <IconX size={16} />
            </button>
          ) : null}
        </div>

        <div className={shellStyles.form}>
          {/* Progress bar */}
          {!isFailed ? (
            <>
              <div className={styles.progressMeta}>
                <span>{job.processedRows.toLocaleString()} of {job.totalRows.toLocaleString()} rows</span>
                <span className={styles.pct}>{Math.round(pct)}%</span>
              </div>
              <div className={styles.bar}>
                <i style={{ width: `${pct}%` }} className={isDone ? styles.barDone : ''} />
              </div>
            </>
          ) : null}

          {/* Counters */}
          {!isFailed ? (
            <div className={styles.counters}>
              <Counter label="Imported"  value={job.importedRows} tone="good" />
              <Counter label="Skipped"   value={job.skippedRows}  tone="muted" hint="duplicates within file or against existing contacts" />
              <Counter label="Rejected"  value={job.rejectedRows} tone={job.rejectedRows > 0 ? 'warn' : 'muted'} hint="invalid email format / empty" />
            </div>
          ) : null}

          {/* Failure block */}
          {isFailed ? (
            <div className={styles.failBlock}>
              <Text size="sm" className={styles.failTitle}>What went wrong</Text>
              <Text tone="muted" size="sm" className={styles.failBody}>
                {REJECTED_REASON_COPY[job.rejectedReason ?? ''] ?? job.rejectedReason ?? 'Unknown error.'}
              </Text>
            </div>
          ) : null}

          {/* Errors list (when present) — first 3 visible, scroll for more */}
          {job.errors && job.errors.length > 0 ? (
            <div className={styles.errors}>
              <Text size="sm" className={styles.errorsTitle}>
                {job.errors.length} {job.errors.length === 1 ? 'row issue' : 'row issues'}
                {job.errors.length >= 100 ? ' (first 100 shown)' : ''}
              </Text>
              <ul>
                {job.errors.slice(0, 6).map((e, i) => (
                  <li key={i}>
                    <code>row {e.row}</code>
                    {e.email ? <span className={styles.errEmail}>{e.email}</span> : null}
                    <span className={styles.errReason}>{e.reason}</span>
                  </li>
                ))}
              </ul>
              {job.errors.length > 6 ? (
                <Text tone="soft" size="xs" className={styles.errorsMore}>
                  + {job.errors.length - 6} more…
                </Text>
              ) : null}
            </div>
          ) : null}

          <div className={shellStyles.foot}>
            {isDone ? (
              <>
                <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    onClose();
                    if (clientId) {
                      const qs = job.listId ? `?listId=${job.listId}` : '';
                      navigate(`/clients/${clientId}/contacts${qs}`);
                    }
                  }}
                >
                  View {job.importedRows.toLocaleString()} imported {job.importedRows === 1 ? 'contact' : 'contacts'}
                </Button>
              </>
            ) : isFailed ? (
              <>
                <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => { onClose(); if (clientId) navigate(`/clients/${clientId}/contacts/import`); }}
                >
                  Try again
                </Button>
              </>
            ) : (
              <Text tone="soft" size="xs">Don't close this window until it finishes.</Text>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Counter({ label, value, tone, hint }: {
  label: string; value: number; tone: 'good' | 'muted' | 'warn'; hint?: string;
}) {
  return (
    <div className={`${styles.counter} ${tone === 'good' ? styles.counterGood : tone === 'warn' ? styles.counterWarn : ''}`}
         title={hint}>
      <div className={styles.counterValue}>{value.toLocaleString()}</div>
      <div className={styles.counterLabel}>{label}</div>
    </div>
  );
}
