import type { HTMLAttributes } from 'react';
import styles from '@styles/components/ui/Avatar.module.scss';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface Props extends HTMLAttributes<HTMLSpanElement> {
  size?: AvatarSize;
  /** "PK" / "KS" — first 2 letters of the name. Falls back to "?" if empty. */
  initials?: string;
  /** Image URL — when provided, replaces initials. */
  src?: string;
  /** Optional alt text for the image. */
  alt?: string;
  /** CSS background, typically a `linear-gradient(...)`. */
  gradient?: string;
  /** Round (people) vs squircle (brand/client). Defaults to squircle. */
  round?: boolean;
}

const DEFAULT_GRADIENT = 'linear-gradient(150deg, var(--soft), var(--muted))';

export function Avatar({
  size = 'md',
  initials = '?',
  src,
  alt = '',
  gradient = DEFAULT_GRADIENT,
  round,
  className = '',
  ...rest
}: Props) {
  return (
    <span
      className={`${styles.av} ${styles[size]} ${round ? styles.round : ''} ${className}`}
      style={{ background: src ? undefined : gradient }}
      {...rest}
    >
      {src ? <img src={src} alt={alt} /> : initials.slice(0, 2).toUpperCase()}
    </span>
  );
}
