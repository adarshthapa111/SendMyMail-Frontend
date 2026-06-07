import { Skeleton } from './Skeleton';
import styles from '@styles/components/skeletons/CampaignCardSkeleton.module.scss';

/* Campaign card skeleton — mirrors the status-driven body in
   src/components/campaigns/CampaignCard.tsx. */
export function CampaignCardSkeleton() {
  return (
    <div className={styles.card} aria-hidden="true">
      {/* Status strip */}
      <div className={styles.strip} />

      {/* Header — status icon + label + meta */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Skeleton w={12} h={12} radius="full" />
          <Skeleton w={50} h={11} />
        </div>
        <Skeleton w={70} h={11} />
      </header>

      {/* Title */}
      <div className={styles.title}>
        <Skeleton w="75%" h={15} />
      </div>

      {/* Body — 3-column stats placeholder */}
      <div className={styles.body}>
        <div className={styles.statCol}>
          <Skeleton w={50} h={22} />
          <Skeleton w={40} h={10} />
        </div>
        <div className={styles.statCol}>
          <Skeleton w={60} h={22} />
          <Skeleton w={56} h={10} />
        </div>
        <div className={styles.statCol}>
          <Skeleton w={30} h={22} />
          <Skeleton w={36} h={10} />
        </div>
      </div>
    </div>
  );
}
