import type { ReactNode } from 'react';
import type { OverviewKpi } from '../../lib/api/overview';
import styles from '@styles/components/dashboard/KPIRow.module.scss';

interface Props {
  icon: ReactNode;
  label: string;
  metric: OverviewKpi;
  /** How to format `value` when present. */
  format: 'integer' | 'percent' | 'currency-npr';
  /** Tint the value in primary — used for the revenue tile. */
  accent?: boolean;
}

function formatValue(n: number, format: Props['format']): string {
  if (format === 'percent') return `${n.toFixed(1)}%`;
  if (format === 'currency-npr') {
    // Format Nepali-rupee figures with lakh/crore shorthand
    if (n >= 10_000_000) return `रू ${(n / 10_000_000).toFixed(1)}Cr`;
    if (n >= 100_000)    return `रू ${(n / 100_000).toFixed(1)}L`;
    if (n >= 1_000)      return `रू ${(n / 1_000).toFixed(1)}K`;
    return `रू ${n.toLocaleString()}`;
  }
  // integer
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatDelta(n: number, format: Props['format']): string {
  const abs = Math.abs(n);
  const sign = n >= 0 ? '+' : '−';
  if (format === 'percent') return `${sign}${abs.toFixed(1)}%`;
  return `${sign}${abs}`;
}

export function KPITile({ icon, label, metric, format, accent }: Props) {
  const available = metric.available && metric.value !== null;

  if (!available) {
    return (
      <div className={`${styles.tile} ${styles.tileEmpty}`}>
        <div className={styles.lbl}>
          {icon}
          <span>{label}</span>
        </div>
        <div className={styles.notAdded}>Not added yet</div>
      </div>
    );
  }

  return (
    <div className={`${styles.tile} ${accent ? styles.accent : ''}`}>
      <div className={styles.lbl}>
        {icon}
        <span>{label}</span>
      </div>
      <div className={styles.num}>{formatValue(metric.value!, format)}</div>
      <div className={styles.foot}>
        {metric.change_30d !== null && metric.change_30d !== 0 ? (
          <>
            <span className={metric.change_30d >= 0 ? styles.up : styles.down}>
              {formatDelta(metric.change_30d, format)}
            </span>
            {' vs last month'}
          </>
        ) : (
          <span className={styles.footMuted}>So far this month</span>
        )}
      </div>
    </div>
  );
}
