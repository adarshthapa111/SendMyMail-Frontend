import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  IconArrowLeft, IconEdit, IconExternalLink, IconCheck, IconCopy,
  IconPlayerPause, IconPlayerPlay, IconTrash, IconUserPlus, IconRefresh,
} from '@tabler/icons-react';
import { Heading, Text, Button, Spinner, Pill } from '../../components/ui';
import { getForm, updateForm, archiveForm, type FormDetailResponse } from '../../lib/api/forms';
import { toast } from '../../lib/toast';
import { ApiError } from '../../lib/api/client';
import styles from '@styles/components/forms/FormDetail.module.scss';

const APP_URL = import.meta.env.VITE_PUBLIC_URL || window.location.origin;

/* /clients/:cid/forms/:formId — detail + submission stats. */
export function FormDetail() {
  const { clientId = null, formId = null } = useParams<{ clientId: string; formId: string }>();
  const navigate = useNavigate();

  const [detail,  setDetail]  = useState<FormDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [acting,  setActing]  = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [copied,  setCopied]  = useState(false);

  const fetchDetail = async () => {
    if (!clientId || !formId) return;
    try {
      const res = await getForm(clientId, formId);
      setDetail(res.data);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setError(err instanceof Error ? err.message : 'Failed to load form');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    void fetchDetail();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, formId]);

  if (loading) return <div className={styles.center}><Spinner /></div>;
  if (error || !detail) {
    return (
      <div className={styles.center}>
        <Text tone="muted">Couldn't load form: {error ?? 'unknown'}</Text>
      </div>
    );
  }

  const { form, list, newContactCount, recentSubmissions } = detail;
  const publicUrl = `${APP_URL}/f/${form.slug}`;
  const duplicateCount = recentSubmissions.length - recentSubmissions.filter((s) => s.isNewContact).length;

  const handleTogglePause = async () => {
    if (!clientId || !formId) return;
    setActing(true);
    try {
      const next = form.status === 'active' ? 'paused' : 'active';
      const res = await updateForm(clientId, formId, { status: next });
      setDetail({ ...detail, form: res.data.form });
      toast.success(next === 'paused' ? 'Form paused' : 'Form activated');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update');
    } finally {
      setActing(false);
    }
  };

  const handleArchive = async () => {
    if (!confirming) {
      setConfirming(true);
      window.setTimeout(() => setConfirming(false), 4000);
      return;
    }
    if (!clientId || !formId) return;
    setActing(true);
    try {
      await archiveForm(clientId, formId);
      toast.success('Form archived');
      navigate(`/clients/${clientId}/forms`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to archive');
      setActing(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch { /* manual */ }
  };

  return (
    <div className={styles.page}>
      <div className={styles.crumb}>
        <Link to={`/clients/${clientId}/forms`} className={styles.back}>
          <IconArrowLeft size={14} /> Forms
        </Link>
      </div>

      <header className={styles.header}>
        <div className={styles.headerMain}>
          <div className={styles.titleRow}>
            <Heading size="xl">{form.name}</Heading>
            <Pill variant={form.status === 'active' ? 'green' : 'amber'} dot>
              {form.status === 'active' ? 'Active' : 'Paused'}
            </Pill>
          </div>
          <div className={styles.urlRow}>
            <code className={styles.urlCode}>{publicUrl}</code>
            <button type="button" className={styles.urlBtn} onClick={handleCopy} title="Copy URL">
              {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.urlBtn}
              title="Open in new tab"
            >
              <IconExternalLink size={13} />
            </a>
          </div>
        </div>
        <div className={styles.headerActions}>
          <Button
            variant="ghost"
            leading={<IconRefresh size={14} />}
            onClick={() => { setLoading(true); void fetchDetail(); }}
          >
            Refresh
          </Button>
          <Button
            variant="ghost"
            leading={form.status === 'active' ? <IconPlayerPause size={14} /> : <IconPlayerPlay size={14} />}
            onClick={handleTogglePause}
            disabled={acting}
          >
            {form.status === 'active' ? 'Pause' : 'Activate'}
          </Button>
          <Button
            variant={confirming ? 'danger' : 'ghost'}
            leading={<IconTrash size={14} />}
            onClick={handleArchive}
            disabled={acting}
          >
            {confirming ? 'Confirm archive?' : 'Archive'}
          </Button>
          <Button
            variant="primary"
            leading={<IconEdit size={14} />}
            onClick={() => navigate(`/clients/${clientId}/forms/${formId}/edit`)}
          >
            Edit
          </Button>
        </div>
      </header>

      {/* Stats row */}
      <div className={styles.statsRow}>
        <Stat label="Submissions" value={form.submissionCount}             tone="neutral" />
        <Stat label="New contacts" value={newContactCount}                  tone="engaged" />
        <Stat label="Duplicates"   value={form.submissionCount - newContactCount} tone="muted" />
        <Stat label="To list"      value={list?.name ?? '—'}                tone="muted" isText />
      </div>

      {/* Recent submissions */}
      <section className={styles.section}>
        <Heading size="md" className={styles.sectionTitle}>Recent submissions</Heading>
        {recentSubmissions.length === 0 ? (
          <div className={styles.empty}>
            <IconUserPlus size={24} className={styles.emptyIcon} />
            <Text tone="muted" size="sm">
              No submissions yet. Share <code>{publicUrl}</code> to start collecting signups.
            </Text>
          </div>
        ) : (
          <>
            <ul className={styles.list}>
              {recentSubmissions.slice(0, 20).map((s) => (
                <li key={s.id} className={styles.row}>
                  <span className={`${styles.rowIcon} ${s.isNewContact ? styles.rowIconNew : styles.rowIconDup}`}>
                    {s.isNewContact ? '✨' : '↻'}
                  </span>
                  <span className={styles.rowEmail}>{s.email}</span>
                  {(s.firstName || s.lastName) && (
                    <span className={styles.rowName}>
                      {[s.firstName, s.lastName].filter(Boolean).join(' ')}
                    </span>
                  )}
                  <Pill variant={s.isNewContact ? 'green' : 'gray'}>
                    {s.isNewContact ? 'new' : 'dup'}
                  </Pill>
                  {s.consentGiven && (
                    <span className={styles.consentBadge} title="Consent given">✓ consent</span>
                  )}
                  <span className={styles.rowTime}>{formatTime(s.createdAt)}</span>
                </li>
              ))}
            </ul>
            {recentSubmissions.length > 20 && (
              <Text size="xs" tone="muted" className={styles.moreHint}>
                Showing 20 of {recentSubmissions.length}. Full submission log coming in V2.
              </Text>
            )}
            <Text size="xs" tone="muted" className={styles.duplicateHint}>
              {duplicateCount > 0 && `${duplicateCount} of these were already contacts — auto-detected by email.`}
            </Text>
          </>
        )}
      </section>
    </div>
  );
}

/* ─── Stat card ──────────────────────────────────────────────────── */

interface StatProps {
  label:  string;
  value:  number | string;
  tone:   'engaged' | 'muted' | 'neutral';
  isText?: boolean;
}

function Stat({ label, value, tone, isText }: StatProps) {
  return (
    <div className={`${styles.statCard} ${styles['statCard_' + tone]}`}>
      <div className={`${styles.statValue} ${isText ? styles.statValueText : ''}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
