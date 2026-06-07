import { Skeleton } from './Skeleton';
import styles from '@styles/components/skeletons/DomainCardSkeleton.module.scss';

/* DomainCardSkeleton — mirrors the verified-sending-domain card on
   /settings/sending. */
export function DomainCardSkeleton() {
  return (
    <article className={styles.card} aria-hidden="true">
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <Skeleton w={16} h={16} radius="full" />
          <Skeleton w={180} h={15} />
          <Skeleton w={70} h={18} radius="full" />
        </div>
        <div className={styles.actions}>
          <Skeleton w={90} h={26} radius="md" />
          <Skeleton w={70} h={26} radius="md" />
        </div>
      </header>

      <div className={styles.body}>
        <Skeleton w="100%" h={13} />
        <Skeleton w="70%" h={13} />
        <Skeleton w="100%" h={120} radius="md" />
      </div>
    </article>
  );
}
