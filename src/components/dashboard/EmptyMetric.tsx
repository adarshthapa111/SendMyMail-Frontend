import type { ReactNode } from 'react';
import styles from '@styles/components/dashboard/EmptyMetric.module.scss';

interface InlineProps {
  inline: true;
  /** Optional override; defaults to a muted em-dash. */
  children?: ReactNode;
}

interface BlockProps {
  inline?: false;
  icon: ReactNode;
  title: string;
  body: ReactNode;
  ctaLabel?: string;
  onCta?: () => void;
}

type Props = InlineProps | BlockProps;

/* The same component used for every "we don't have this data yet" block.
   - inline: a muted '—' for table/grid cells (KPI tiles, row metrics)
   - block:  a soft card with icon + title + body + optional CTA (chart,
     gauge, "no clients yet" hero) */
export function EmptyMetric(props: Props) {
  if (props.inline) {
    return <span className={styles.inlineDash}>{props.children ?? '—'}</span>;
  }
  return (
    <div className={styles.block}>
      <div className={styles.icon}>{props.icon}</div>
      <div className={styles.body}>
        <div className={styles.title}>{props.title}</div>
        <div className={styles.message}>{props.body}</div>
      </div>
      {props.ctaLabel && props.onCta ? (
        <button type="button" className={styles.cta} onClick={props.onCta}>
          {props.ctaLabel} →
        </button>
      ) : null}
    </div>
  );
}
