import { Skeleton } from './Skeleton';
import styles from '@styles/components/skeletons/FormCardSkeleton.module.scss';

/* Form card skeleton — mirrors src/pages/forms/FormsList.tsx card layout. */
export function FormCardSkeleton() {
  return (
    <div className={styles.card} aria-hidden="true">
      <header className={styles.head}>
        <Skeleton w={28} h={28} radius="md" />
        <Skeleton w={56} h={18} radius="full" />
        <Skeleton w={28} h={28} radius="md" className={styles.kebab} />
      </header>

      <div className={styles.name}>
        <Skeleton w="80%" h={16} />
      </div>

      <div className={styles.urlRow}>
        <Skeleton w="55%" h={11} />
      </div>

      <footer className={styles.foot}>
        <div className={styles.stat}>
          <Skeleton w={36} h={22} />
          <Skeleton w={70} h={10} />
        </div>
        <Skeleton w={90} h={20} radius="full" />
      </footer>
    </div>
  );
}
