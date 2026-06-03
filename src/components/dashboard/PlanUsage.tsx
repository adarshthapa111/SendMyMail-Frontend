import type { OverviewPayload } from '../../lib/api/overview';
import styles from '@styles/components/dashboard/DeliverabilityGauge.module.scss';
import bar from '@styles/components/dashboard/PlanUsage.module.scss';

interface Props {
  plan: OverviewPayload['plan_usage'];
}

const PLAN_LABELS: Record<OverviewPayload['plan_usage']['plan'], string> = {
  trial:    'Trial',
  starter:  'Starter',
  growth:   'Growth',
  scale:    'Scale',
};

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

/* Plan name + monthly send usage bar. `sent_this_month` is 0 until Feature 14
   (billing) wires the real monthly counter. */
export function PlanUsage({ plan }: Props) {
  const pct = plan.monthly_quota > 0
    ? Math.min(100, (plan.sent_this_month / plan.monthly_quota) * 100)
    : 0;
  return (
    <div className={bar.wrap}>
      <div className={styles.kv} style={{ border: 0, padding: '0 0 2px' }}>
        <span>Plan usage · {PLAN_LABELS[plan.plan]}</span>
        <b className={styles.tnum}>{fmtCount(plan.sent_this_month)} / {fmtCount(plan.monthly_quota)}</b>
      </div>
      <div className={bar.track}>
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
