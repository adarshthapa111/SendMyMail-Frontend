import { IconMail, IconSend, IconLoader2, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import type { CampaignSummary } from '../../lib/api/campaigns';
import styles from '@styles/components/campaigns/CampaignCard.module.scss';

interface Props {
  campaign: CampaignSummary;
  onClick: () => void;
}

const STATUS_LABEL: Record<CampaignSummary['status'], string> = {
  draft:     'Draft',
  scheduled: 'Scheduled',
  sending:   'Sending…',
  sent:      'Sent',
  failed:    'Failed',
};

/* Single campaign card on the list page. Status-themed pill in the
   corner, name + meta line + send stats below. Click navigates to
   the wizard (drafts) or the report (anything else). */
export function CampaignCard({ campaign, onClick }: Props) {
  return (
    <button
      type="button"
      className={styles.card}
      onClick={onClick}
      data-status={campaign.status}
    >
      <div className={styles.head}>
        <div className={styles.iconWrap}><StatusIcon status={campaign.status} /></div>
        <span className={`${styles.pill} ${styles['pill_' + campaign.status]}`}>
          {STATUS_LABEL[campaign.status]}
        </span>
      </div>

      <div className={styles.body}>
        <div className={styles.name}>{campaign.name}</div>
        <div className={styles.meta}>
          {metaLineFor(campaign)}
        </div>
      </div>

      {(campaign.status === 'sent' || campaign.status === 'sending') && (
        <div className={styles.stats}>
          <span className={styles.stat}>
            <strong>{campaign.sentCount}</strong>
            <span className={styles.statLabel}>sent</span>
          </span>
          <span className={styles.stat}>
            <strong>{campaign.totalRecipients}</strong>
            <span className={styles.statLabel}>total</span>
          </span>
          {campaign.failedCount > 0 && (
            <span className={`${styles.stat} ${styles.statFailed}`}>
              <strong>{campaign.failedCount}</strong>
              <span className={styles.statLabel}>failed</span>
            </span>
          )}
        </div>
      )}
    </button>
  );
}

function StatusIcon({ status }: { status: CampaignSummary['status'] }) {
  switch (status) {
    case 'sending':   return <IconLoader2 size={18} />;
    case 'sent':      return <IconCheck size={18} />;
    case 'failed':    return <IconAlertCircle size={18} />;
    case 'scheduled': return <IconSend size={18} />;
    default:          return <IconMail size={18} />;
  }
}

function metaLineFor(c: CampaignSummary): string {
  if (c.status === 'sent' || c.status === 'sending') {
    return `${c.totalRecipients} recipient${c.totalRecipients === 1 ? '' : 's'}`;
  }
  if (c.status === 'draft') {
    return `Last edited ${formatRelative(c.updatedAt)}`;
  }
  if (c.status === 'scheduled' && c.scheduleAt) {
    return `Scheduled for ${formatAbsolute(c.scheduleAt)}`;
  }
  return `Created ${formatRelative(c.createdAt)}`;
}

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
