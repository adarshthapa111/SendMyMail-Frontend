import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { IconArrowLeft, IconCheck, IconAlertCircle, IconLoader2 } from '@tabler/icons-react';
import { Heading, Text, Spinner } from '../../components/ui';
import {
  getCampaign,
  listCampaignSends,
  type Campaign,
  type SendLogEntry,
} from '../../lib/api/campaigns';
import { ApiError } from '../../lib/api/client';
import styles from '@styles/components/campaigns/CampaignReport.module.scss';

const POLL_INTERVAL_MS = 5_000;

/* /clients/:cid/campaigns/:campaignId — post-launch view.
   - For status: 'sending', polls every 5s and shows a live progress bar.
   - For status: 'sent' or 'failed', stops polling, shows final stats +
     paginated per-recipient send log. */
export function CampaignReport() {
  const { clientId = null, campaignId = null } = useParams<{ clientId: string; campaignId: string }>();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loadErr,  setLoadErr]  = useState<string | null>(null);

  const [sends,         setSends]         = useState<SendLogEntry[]>([]);
  const [sendsCursor,   setSendsCursor]   = useState<string | null>(null);
  const [loadingSends,  setLoadingSends]  = useState(false);

  const pollRef = useRef<number | null>(null);

  /* Fetch single campaign + start polling if still sending. */
  const fetchCampaign = useCallback(async () => {
    if (!clientId || !campaignId) return;
    try {
      const res = await getCampaign(clientId, campaignId);
      setCampaign(res.data.campaign);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setLoadErr(err instanceof ApiError ? err.message : 'Failed to load campaign');
    }
  }, [clientId, campaignId]);

  useEffect(() => {
    // Trigger fetch on mount + when dependencies change. Internal awaits
    // call setCampaign / setLoadErr — standard initial-load pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchCampaign();
  }, [fetchCampaign]);

  /* Polling lifecycle. Only re-run when the status changes — re-running
     on every campaign object identity change would tear down + recreate
     the interval whenever counters tick, restarting the timer mid-cycle. */
  const status = campaign?.status;
  useEffect(() => {
    const stop = () => {
      if (pollRef.current !== null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    if (status === 'sending') {
      if (pollRef.current === null) {
        pollRef.current = window.setInterval(() => { void fetchCampaign(); }, POLL_INTERVAL_MS);
      }
    } else {
      stop();
    }
    return stop;
  }, [status, fetchCampaign]);

  /* Load first page of sends once status hits sent/failed. */
  useEffect(() => {
    if (!status || !clientId || !campaignId) return;
    if (status === 'draft' || status === 'scheduled') return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingSends(true);
    listCampaignSends(clientId, campaignId, { limit: 50 })
      .then((res) => {
        if (cancelled) return;
        setSends(res.data.sends);
        setSendsCursor(res.data.nextCursor);
      })
      .catch(() => { /* don't surface — partial data is OK on report page */ })
      .finally(() => { if (!cancelled) setLoadingSends(false); });
    return () => { cancelled = true; };
  }, [status, clientId, campaignId]);

  const onLoadMore = useCallback(async () => {
    if (!clientId || !campaignId || !sendsCursor || loadingSends) return;
    setLoadingSends(true);
    try {
      const res = await listCampaignSends(clientId, campaignId, { cursor: sendsCursor, limit: 50 });
      setSends((prev) => [...prev, ...res.data.sends]);
      setSendsCursor(res.data.nextCursor);
    } finally {
      setLoadingSends(false);
    }
  }, [clientId, campaignId, sendsCursor, loadingSends]);

  if (!campaign && !loadErr) {
    return <div className={styles.center}><Spinner /></div>;
  }
  if (loadErr || !campaign) {
    return (
      <div className={styles.center}>
        <Text tone="muted">Couldn't load campaign: {loadErr ?? 'unknown'}</Text>
      </div>
    );
  }

  /* If the campaign is somehow still a draft, redirect to wizard */
  if (campaign.status === 'draft' || campaign.status === 'scheduled') {
    navigate(`/clients/${clientId}/campaigns/${campaignId}/edit`, { replace: true });
    return null;
  }

  const isSending = campaign.status === 'sending';
  const isSent    = campaign.status === 'sent';
  const isFailed  = campaign.status === 'failed';

  const done = campaign.sentCount + campaign.failedCount;
  const pct  = campaign.totalRecipients > 0
    ? Math.round((done / campaign.totalRecipients) * 100)
    : 0;

  return (
    <div className={styles.page}>
      <div className={styles.crumb}>
        <Link to={`/clients/${clientId}/campaigns`} className={styles.back}>
          <IconArrowLeft size={14} /> Campaigns
        </Link>
      </div>

      <header className={styles.header}>
        <div>
          <Heading size="xl">{campaign.name}</Heading>
          <Text tone="muted" className={styles.subtitle}>
            {isSending && 'Sending in progress…'}
            {isSent    && 'Campaign sent'}
            {isFailed  && 'Campaign send failed'}
          </Text>
        </div>
        <div className={`${styles.statusPill} ${styles['statusPill_' + campaign.status]}`}>
          {isSending && <IconLoader2 size={14} className={styles.spinning} />}
          {isSent    && <IconCheck size={14} />}
          {isFailed  && <IconAlertCircle size={14} />}
          {labelFor(campaign.status)}
        </div>
      </header>

      {isSending && (
        <div className={styles.progressCard}>
          <div className={styles.progressTopRow}>
            <span className={styles.progressLabel}>Sending to {campaign.totalRecipients} recipient{campaign.totalRecipients === 1 ? '' : 's'}</span>
            <span className={styles.progressCount}>{done} / {campaign.totalRecipients}</span>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${pct}%` }} />
          </div>
          <Text tone="muted" size="xs" className={styles.progressHint}>
            Refreshes every 5 seconds.
          </Text>
        </div>
      )}

      <div className={styles.statsRow}>
        <StatCard label="Sent"     value={campaign.sentCount}      tone="ok" />
        <StatCard label="Failed"   value={campaign.failedCount}    tone={campaign.failedCount > 0 ? 'bad' : 'neutral'} />
        <StatCard label="Total"    value={campaign.totalRecipients} tone="neutral" />
      </div>

      <section className={styles.logSection}>
        <Heading size="md" className={styles.logTitle}>Recipient log</Heading>
        {sends.length === 0 && !loadingSends ? (
          <Text tone="muted" size="sm">No sends yet.</Text>
        ) : (
          <>
            <ul className={styles.logList}>
              {sends.map((s) => (
                <li key={s.id} className={styles.logRow}>
                  <span className={`${styles.logDot} ${styles['logDot_' + s.status]}`} aria-hidden="true" />
                  <span className={styles.logEmail}>{s.toEmail}</span>
                  <span className={styles.logStatus}>{s.status}</span>
                  {s.error && <span className={styles.logError} title={s.error}>{truncate(s.error, 60)}</span>}
                  <span className={styles.logTime}>{s.sentAt ? formatTime(s.sentAt) : '—'}</span>
                </li>
              ))}
            </ul>
            {sendsCursor && (
              <button
                type="button"
                className={styles.loadMore}
                onClick={onLoadMore}
                disabled={loadingSends}
              >
                {loadingSends ? 'Loading…' : 'Load more'}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  tone: 'ok' | 'bad' | 'neutral';
}

function StatCard({ label, value, tone }: StatCardProps) {
  return (
    <div className={`${styles.statCard} ${styles['statCard_' + tone]}`}>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

function labelFor(s: Campaign['status']): string {
  return { draft: 'Draft', scheduled: 'Scheduled', sending: 'Sending', sent: 'Sent', failed: 'Failed' }[s];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
