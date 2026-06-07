import type { ReportRange } from '../../lib/api/clientReport';
import styles from '@styles/components/clients/RangePicker.module.scss';

interface Props {
  value:    ReportRange;
  onChange: (next: ReportRange) => void;
  disabled?: boolean;
}

const OPTIONS: Array<{ value: ReportRange; label: string }> = [
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

/* RangePicker — segmented control for the report page. Keeps state in
   the URL search param so refreshes preserve the user's selection. */
export function RangePicker({ value, onChange, disabled }: Props) {
  return (
    <div className={styles.wrap} role="radiogroup" aria-label="Date range">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          className={`${styles.option} ${value === opt.value ? styles.active : ''}`}
          onClick={() => onChange(opt.value)}
          disabled={disabled}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
