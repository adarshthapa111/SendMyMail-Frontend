import { Skeleton, SkeletonBlock } from './Skeleton';
import styles from '@styles/components/skeletons/TemplateCardSkeleton.module.scss';

/* Template card skeleton — matches the phone-frame product card.
   See src/components/templates/TemplateCard.tsx for the real layout
   we're mirroring. */
export function TemplateCardSkeleton() {
  return (
    <div className={styles.card} aria-hidden="true">
      {/* Stage — soft tinted area the phone "sits on" */}
      <div className={styles.stage}>
        {/* Phone body shape */}
        <div className={styles.phone}>
          <SkeletonBlock h="100%" radius="lg" />
        </div>
      </div>

      {/* Meta footer — name + category dot + relative time */}
      <div className={styles.meta}>
        <Skeleton w="65%" h={14} />
        <div className={styles.metaSub}>
          <Skeleton w={6} h={6} radius="full" />
          <Skeleton w={70} h={11} />
          <Skeleton w={70} h={11} />
        </div>
      </div>
    </div>
  );
}
