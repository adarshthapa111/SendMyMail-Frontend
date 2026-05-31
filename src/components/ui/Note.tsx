import type { HTMLAttributes, ReactNode } from 'react';
import {
  IconInfoCircle,
  IconCircleCheck,
  IconAlertTriangle,
  IconCircleX,
  IconNote as IconNeutralNote,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import styles from '@styles/components/ui/Note.module.scss';

type NoteVariant = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

const DEFAULT_ICONS: Record<NoteVariant, TablerIcon> = {
  info:    IconInfoCircle,
  success: IconCircleCheck,
  warning: IconAlertTriangle,
  danger:  IconCircleX,
  neutral: IconNeutralNote,
};

interface Props extends HTMLAttributes<HTMLDivElement> {
  variant?: NoteVariant;
  /** Override the auto-picked icon. */
  icon?: TablerIcon;
  /** Hide the icon entirely (text-only note). */
  hideIcon?: boolean;
  children: ReactNode;
}

/* Inline alert / hint box. Use the warm semantic palette so it slots into
   any page without competing with content. For prominent attention-grabbing
   alerts (e.g. trial expiry banner) compose Card + Note inside it. */
export function Note({
  variant = 'info',
  icon: IconOverride,
  hideIcon,
  className = '',
  children,
  ...rest
}: Props) {
  const Icon = IconOverride ?? DEFAULT_ICONS[variant];
  return (
    <div className={`${styles.note} ${styles[variant]} ${className}`} {...rest}>
      {!hideIcon && <Icon size={16} />}
      <span>{children}</span>
    </div>
  );
}
