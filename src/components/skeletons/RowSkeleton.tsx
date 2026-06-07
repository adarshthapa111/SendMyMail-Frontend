import { Skeleton } from './Skeleton';
import styles from '@styles/components/skeletons/RowSkeleton.module.scss';

interface Props {
  /** How many rows to render. */
  count?:    number;
  /** Render with circular avatar at the left (contacts, clients). */
  withAvatar?: boolean;
  /** Show a trailing pill on the right (status badges). */
  withPill?:   boolean;
}

/* RowSkeleton — generic horizontal row used for tabular lists:
   contacts, lists, suppression, submissions, clients, etc.
   Renders `count` rows in a unified visual style. */
export function RowSkeleton({ count = 6, withAvatar = false, withPill = false }: Props) {
  return (
    <ul className={styles.list} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className={styles.row}>
          {withAvatar && <Skeleton w={32} h={32} radius="full" />}
          <div className={styles.main}>
            <Skeleton w={`${55 + ((i * 7) % 25)}%`} h={13} />
            <Skeleton w={`${30 + ((i * 11) % 20)}%`} h={11} />
          </div>
          {withPill && <Skeleton w={70} h={20} radius="full" />}
          <Skeleton w={60} h={11} />
        </li>
      ))}
    </ul>
  );
}
