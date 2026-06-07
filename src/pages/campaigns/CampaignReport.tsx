import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { IconArrowLeft, IconCheck, IconAlertCircle, IconLoader2, IconEye, IconClick } from '@tabler/icons-react';
import { Heading, Text } from '../../components/ui';
import { KpiCardSkeleton, RowSkeleton, Skeleton } from '../../components/skeletons';
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
    /* Skeleton mirrors the real report: title + 4 KPI cards +
       recipient log rows. Zero-shift transition when data lands. */
    return (
      <div className={styles.page} aria-busy="true">
        <Skeleton w={120} h={11} style={{ marginBottom: 12 }} />
        <Skeleton w={240} h={28} style={{ marginBottom: 22 }} />
        <div className={styles.statsRow}>
          <KpiCardSkeleton />
          <KpiCardSkeleton withSubtitle />
          <KpiCardSkeleton withSubtitle />
          <KpiCardSkeleton />
        </div>
        <div style={{ marginTop: 22 }}>
          <RowSkeleton count={8} />
        </div>
      </div>
    );
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
        <StatCard
          label="Sent"
          value={campaign.sentCount}
          tone="ok"
        />
        <StatCard
          label="Opened"
          value={campaign.uniqueOpens}
          subtitle={formatRate(campaign.openRate)}
          tone={campaign.uniqueOpens > 0 ? 'engaged' : 'neutral'}
        />
        <StatCard
          label="Clicked"
          value={campaign.uniqueClicks}
          subtitle={formatRate(campaign.clickRate)}
          tone={campaign.uniqueClicks > 0 ? 'engaged' : 'neutral'}
        />
        <StatCard
          label="Failed"
          value={campaign.failedCount}
          tone={campaign.failedCount > 0 ? 'bad' : 'neutral'}
        />
      </div>

      {campaign.topLinks.length > 0 && (
        <section className={styles.topLinksSection}>
          <Heading size="md" className={styles.logTitle}>Top links</Heading>
          <ul className={styles.linksList}>
            {campaign.topLinks.map((link, i) => (
              <li key={i} className={styles.linkRow}>
                <span className={styles.linkRank}>{i + 1}</span>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.linkUrl}
                  title={link.url}
                >
                  {link.url}
                </a>
                <span className={styles.linkCount}>
                  {link.count} {link.count === 1 ? 'click' : 'clicks'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

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
                  {s.firstOpenedAt && (
                    <span className={`${styles.logPill} ${styles.logPill_opened}`} title={`First opened ${formatTime(s.firstOpenedAt)}`}>
                      <IconEye size={11} /> Opened{s.openCount > 1 ? ` ×${s.openCount}` : ''}
                    </span>
                  )}
                  {s.clickCount > 0 && (
                    <span className={`${styles.logPill} ${styles.logPill_clicked}`} title={`Last clicked ${s.lastClickedAt ? formatTime(s.lastClickedAt) : ''}`}>
                      <IconClick size={11} /> Clicked{s.clickCount > 1 ? ` ×${s.clickCount}` : ''}
                    </span>
                  )}
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
  label:     string;
  value:     number;
  /** Optional rate / sub-label shown below the big number, e.g. "68.6%". */
  subtitle?: string;
  tone:      'ok' | 'bad' | 'neutral' | 'engaged';
}

function StatCard({ label, value, subtitle, tone }: StatCardProps) {
  return (
    <div className={`${styles.statCard} ${styles['statCard_' + tone]}`}>
      <div className={styles.statValue}>{value.toLocaleString()}</div>
      <div className={styles.statLabel}>{label}</div>
      {subtitle && <div className={styles.statSubtitle}>{subtitle}</div>}
    </div>
  );
}

/** Format a rate (0.0 - 1.0) as a percentage string. Returns em-dash
 *  for null (sentCount is 0 — no data to compute from). */
function formatRate(rate: number | null): string {
  if (rate === null) return '—';
  const pct = rate * 100;
  // 1 decimal place for sub-10%, no decimals above. Caps at 100%.
  const clamped = Math.min(pct, 100);
  return clamped < 10
    ? `${clamped.toFixed(1)}%`
    : `${Math.round(clamped)}%`;
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
