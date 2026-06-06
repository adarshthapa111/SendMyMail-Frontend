import { IconClock, IconCalendar } from '@tabler/icons-react';
import { Text } from '../ui';
import type { Campaign, CampaignUpdateBody } from '../../lib/api/campaigns';
import styles from '@styles/components/campaigns/CampaignWizard.module.scss';

interface Props {
  draft: Campaign;
  onChange: (patch: Partial<CampaignUpdateBody>) => void;
}

/* Step 5 — schedule. V1: only "Send now" is functional. The
   "Schedule for later" option exists but is disabled with a tooltip —
   functional scheduling needs a queue (BullMQ or cron) which is V2. */
export function Step5Schedule({ draft }: Props) {
  void draft;
  return (
    <div className={styles.scheduleGroup}>
      <div className={`${styles.scheduleRow} ${styles.scheduleRowSelected}`}>
        <span className={styles.scheduleIcon}><IconClock size={18} /></span>
        <div className={styles.scheduleText}>
          <strong>Send now</strong>
          <Text tone="muted" size="xs">
            Campaign starts immediately after you launch from the review step.
          </Text>
        </div>
        <span className={styles.scheduleRadio} aria-hidden="true" />
      </div>

      <div className={`${styles.scheduleRow} ${styles.scheduleRowDisabled}`} title="Coming soon — needs queue infra">
        <span className={styles.scheduleIcon}><IconCalendar size={18} /></span>
        <div className={styles.scheduleText}>
          <strong>Schedule for later</strong>
          <Text tone="muted" size="xs">
            Pick a future date and time. Available when the queue lands (V2).
          </Text>
        </div>
        <span className={styles.scheduleComing}>Coming soon</span>
      </div>
    </div>
  );
}
