import { Heading } from '../ui';
import type { OverviewPayload } from '../../lib/api/overview';
import styles from '@styles/components/dashboard/DeliverabilityGauge.module.scss';

interface Props {
  deliverability: OverviewPayload['deliverability'];
}

const RADIUS = 35;
const CIRC = 2 * Math.PI * RADIUS;     // ≈ 219.9

function scoreChip(score: number): { label: string; cls: string } {
  if (score >= 90) return { label: 'Excellent deliverability', cls: 'good' };
  if (score >= 75) return { label: 'Healthy',                  cls: 'good' };
  if (score >= 50) return { label: 'Watch closely',            cls: 'warn' };
  return                    { label: 'At risk',                cls: 'bad'  };
}

/* Circular SVG gauge (score 0-100) + chip + 3 kv rows.
   When deliverability data is unavailable, shows EmptyMetric inline. */
export function DeliverabilityGauge({ deliverability }: Props) {
  const available = deliverability.available && deliverability.score !== null;
  const score = deliverability.score ?? 0;
  const offset = CIRC * (1 - score / 100);
  const chip = scoreChip(score);

  return (
    <div className={styles.panel}>
      <Heading size="md" className={styles.title}>How you're landing</Heading>

      {available ? (
        <>
          <div className={styles.gaugeWrap}>
            <svg width="86" height="86" viewBox="0 0 86 86" aria-label={`Deliverability score ${score}`}>
              <circle cx="43" cy="43" r={RADIUS} fill="none" stroke="var(--green-bg)" strokeWidth="9" />
              <circle
                cx="43" cy="43" r={RADIUS}
                fill="none"
                stroke="var(--green)"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={CIRC.toFixed(2)}
                strokeDashoffset={offset.toFixed(2)}
                transform="rotate(-90 43 43)"
              />
            </svg>
            <div>
              <div className={styles.gnum}>{score}</div>
              <span className={`${styles.chip} ${styles[chip.cls]}`}>{chip.label}</span>
            </div>
          </div>

          <div className={styles.kvList}>
            <Kv label="Gmail inbox rate" value={fmtPercent(deliverability.gmail_inbox_rate)} />
            <Kv label="Hard bounce"      value={fmtPercent(deliverability.hard_bounce_rate)} />
            <Kv label="Complaint rate"   value={fmtPercent(deliverability.complaint_rate)} />
          </div>
        </>
      ) : (
        <div className={styles.notAdded}>Not added yet</div>
      )}
    </div>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.kv}>
      <span>{label}</span>
      <b className={styles.tnum}>{value}</b>
    </div>
  );
}

function fmtPercent(n: number | null): string {
  return n === null ? '—' : `${n.toFixed(1)}%`;
}
