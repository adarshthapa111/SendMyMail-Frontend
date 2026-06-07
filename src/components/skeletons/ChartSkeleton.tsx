import { Skeleton } from './Skeleton';
import styles from '@styles/components/skeletons/ChartSkeleton.module.scss';

interface Props {
  height?: number;
}

/* ChartSkeleton — mirrors the SendingChart layout. Wide rectangular
   block with a few horizontal gridline placeholders + axis labels. */
export function ChartSkeleton({ height = 200 }: Props) {
  return (
    <div className={styles.chart} style={{ height }} aria-hidden="true">
      {/* Gridlines — pure visual decoration */}
      <div className={styles.grid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.gridLine} />
        ))}
      </div>

      {/* Main shape — a big block that ALMOST fills the chart area */}
      <div className={styles.area}>
        <Skeleton h="100%" w="100%" radius="sm" />
      </div>

      {/* Axis labels — small thin bars at the bottom */}
      <div className={styles.axis}>
        <Skeleton w={32} h={9} />
        <Skeleton w={32} h={9} />
        <Skeleton w={32} h={9} />
      </div>
    </div>
  );
}
