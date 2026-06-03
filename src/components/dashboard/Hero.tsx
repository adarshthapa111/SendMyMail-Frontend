import { IconCalendar } from '@tabler/icons-react';
import { Heading, Text, Eyebrow } from '../ui';
import type { OverviewPayload } from '../../lib/api/overview';
import styles from '@styles/components/dashboard/Hero.module.scss';

interface Props {
  greeting: OverviewPayload['greeting'];
  activeClients: number;
  /** Whether send-metrics are available — when false, we soften the subtitle. */
  sendMetricsAvailable: boolean;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS   = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${WEEKDAYS[d.getDay()]} · ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/* Page hero. Eyebrow date + Bricolage H1 + subtitle that adapts to whether
   we have send-side metrics yet. */
export function Hero({ greeting, activeClients, sendMetricsAvailable }: Props) {
  const subtitle = activeClients === 0
    ? <>Your workspace is ready — <b>create your first client</b> to get started.</>
    : sendMetricsAvailable
      ? <>Your <b>{activeClients} {activeClients === 1 ? 'client is' : 'clients are'}</b> active — opens and deliverability are trending strong.</>
      : <>You have <b>{activeClients} active {activeClients === 1 ? 'client' : 'clients'}</b>. Send your first campaign to start seeing real metrics here.</>;

  return (
    <div className={styles.hero}>
      <div>
        <Eyebrow className={styles.eyebrow}>{fmtDate(greeting.date_iso)}</Eyebrow>
        <Heading size="2xl">Namaste, {greeting.name} 👋</Heading>
        <Text tone="muted" size="md" className={styles.sub}>{subtitle}</Text>
      </div>
      <button type="button" className={styles.rangePill} aria-label="Date range">
        <IconCalendar size={15} />
        Last 30 days
      </button>
    </div>
  );
}
