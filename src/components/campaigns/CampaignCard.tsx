import {
  IconPencil, IconClock, IconLoader2, IconCheck, IconAlertCircle,
  IconArrowRight, IconCalendar,
} from '@tabler/icons-react';
import type { CampaignSummary } from '../../lib/api/campaigns';
import styles from '@styles/components/campaigns/CampaignCard.module.scss';

interface Props {
  campaign: CampaignSummary;
  onClick: () => void;
}

/**
 * Status-driven campaign card. Each status renders a different body:
 *
 *   draft     → wizard progress (X of 6 steps complete)
 *   scheduled → scheduled-for timestamp + recipient count
 *   sending   → live progress bar (sentCount / totalRecipients)
 *   sent      → big sent-count + failed-count + open-rate placeholder
 *   failed    → failed-state with counts
 *
 * The frame stays consistent — colored status header strip with icon +
 * label, then the campaign name, then the status-specific body. Cards
 * remain comparable at a glance: same height, same hover, same hierarchy.
 */
export function CampaignCard({ campaign, onClick }: Props) {
  return (
    <button
      type="button"
      className={styles.card}
      onClick={onClick}
      data-status={campaign.status}
    >
      <CardHeader campaign={campaign} />

      <div className={styles.body}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{campaign.name || 'Untitled campaign'}</span>
        </div>
        <CardContent campaign={campaign} />
      </div>
    </button>
  );
}

/* ─── Header (status strip) ─────────────────────────────────────── */

function CardHeader({ campaign }: { campaign: CampaignSummary }) {
  const { Icon, label } = headerInfoFor(campaign.status);
  return (
    <div className={styles.header}>
      <span className={styles.headerIcon}><Icon size={14} /></span>
      <span className={styles.headerLabel}>{label}</span>
      <span className={styles.headerMeta}>{headerMetaFor(campaign)}</span>
    </div>
  );
}

function headerInfoFor(status: CampaignSummary['status']) {
  switch (status) {
    case 'draft':     return { Icon: IconPencil,       label: 'Draft' };
    case 'scheduled': return { Icon: IconCalendar,     label: 'Scheduled' };
    case 'sending':   return { Icon: IconLoader2,      label: 'Sending' };
    case 'sent':      return { Icon: IconCheck,        label: 'Sent' };
    case 'failed':    return { Icon: IconAlertCircle,  label: 'Failed' };
  }
}

function headerMetaFor(c: CampaignSummary): string {
  switch (c.status) {
    case 'draft':     return `Started ${formatRelative(c.createdAt)}`;
    case 'scheduled': return c.scheduleAt ? formatAbsolute(c.scheduleAt) : 'Scheduled';
    case 'sending':   return 'In progress';
    case 'sent':      return formatRelative(c.updatedAt);
    case 'failed':    return formatRelative(c.updatedAt);
  }
}

/* ─── Body (status-specific) ────────────────────────────────────── */

function CardContent({ campaign }: { campaign: CampaignSummary }) {
  switch (campaign.status) {
    case 'draft':     return <DraftBody campaign={campaign} />;
    case 'scheduled': return <ScheduledBody campaign={campaign} />;
    case 'sending':   return <SendingBody campaign={campaign} />;
    case 'sent':      return <SentBody campaign={campaign} />;
    case 'failed':    return <FailedBody campaign={campaign} />;
  }
}

/* Draft — surface wizard progress so the user knows where they left off.
   Required-fields count: name, listId, fromName+fromEmail+subject (as one),
   templateId. Step 5 schedule + step 6 review are always "default ready". */
function DraftBody({ campaign }: { campaign: CampaignSummary }) {
  // We count completed REQUIRED steps from the summary (which doesn't carry
  // fromName/email/subject — those need the full record). For the list-page
  // approximation, infer from what we have: name + list + template.
  // It's a hint, not a guarantee; report-quality progress lives in the
  // wizard itself.
  const completed =
    (campaign.name && campaign.name !== 'Untitled campaign' ? 1 : 0) +
    (campaign.listId     ? 1 : 0) +
    (campaign.templateId ? 1 : 0);
  // We can identify name + list + template from summary (3 of 6). From + subject
  // would need the full record — for V1 we just show 3-step approximation
  // capped at 5 so it never reads "6 of 6" without a real launch.
  const total = 5;
  const pct = Math.round((completed / total) * 100);

  return (
    <>
      <div className={styles.progressLabel}>
        <span>{completed} of {total} steps</span>
        <span className={styles.progressCta}>
          Continue editing <IconArrowRight size={12} />
        </span>
      </div>
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${pct}%` }} />
      </div>
    </>
  );
}

function ScheduledBody({ campaign }: { campaign: CampaignSummary }) {
  return (
    <div className={styles.kvRow}>
      <span className={styles.kvIcon}><IconClock size={14} /></span>
      <div className={styles.kvText}>
        <span className={styles.kvLabel}>Goes out</span>
        <span className={styles.kvValue}>
          {campaign.scheduleAt ? formatAbsolute(campaign.scheduleAt) : '—'}
        </span>
      </div>
      {campaign.totalRecipients > 0 && (
        <span className={styles.kvSecondary}>
          {campaign.totalRecipients} recipient{campaign.totalRecipients === 1 ? '' : 's'}
        </span>
      )}
    </div>
  );
}

function SendingBody({ campaign }: { campaign: CampaignSummary }) {
  const done = campaign.sentCount + campaign.failedCount;
  const pct  = campaign.totalRecipients > 0
    ? Math.round((done / campaign.totalRecipients) * 100)
    : 0;

  return (
    <>
      <div className={styles.progressLabel}>
        <span>{done} of {campaign.totalRecipients} sent</span>
        <span className={styles.progressPct}>{pct}%</span>
      </div>
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${pct}%` }} />
      </div>
    </>
  );
}

function SentBody({ campaign }: { campaign: CampaignSummary }) {
  return (
    <div className={styles.statsRow}>
      <Stat value={campaign.sentCount}      label="sent" tone="ok" />
      <Stat value={campaign.totalRecipients} label="recipients" tone="muted" />
      {campaign.failedCount > 0 && (
        <Stat value={campaign.failedCount} label="failed" tone="bad" />
      )}
    </div>
  );
}

function FailedBody({ campaign }: { campaign: CampaignSummary }) {
  return (
    <div className={styles.statsRow}>
      <Stat value={campaign.sentCount}    label="sent"   tone="muted" />
      <Stat value={campaign.failedCount}  label="failed" tone="bad" />
      <Stat value={campaign.totalRecipients} label="total" tone="muted" />
    </div>
  );
}

interface StatProps {
  value: number;
  label: string;
  tone: 'ok' | 'bad' | 'muted';
}

function Stat({ value, label, tone }: StatProps) {
  return (
    <div className={`${styles.stat} ${styles['stat_' + tone]}`}>
      <span className={styles.statValue}>{value.toLocaleString()}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

/* ─── Formatting helpers ────────────────────────────────────────── */

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1)    return 'just now';
  if (m < 60)   return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24)   return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30)   return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function formatAbsolute(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

