import { Skeleton } from './Skeleton';
import styles from '@styles/components/skeletons/KpiCardSkeleton.module.scss';

interface Props {
  /** Whether to render the optional rate-subtitle line below the big number.
   *  Matches engaged-tone KPI cards (Opened / Clicked) that show "68.6%". */
  withSubtitle?: boolean;
}

/* KPI card skeleton — single big number + label, optional rate subtitle.
   Used on dashboard, campaign report, client report, form detail. */
export function KpiCardSkeleton({ withSubtitle = false }: Props) {
  return (
    <div className={styles.card} aria-hidden="true">
      <Skeleton w={70} h={28} />
      <Skeleton w={50} h={11} />
      {withSubtitle && <Skeleton w={42} h={13} />}
    </div>
  );
}
