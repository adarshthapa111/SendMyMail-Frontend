import type { ReactNode } from 'react';
import type { Icon as TablerIcon } from '@tabler/icons-react';

interface Props {
  /** A Tabler icon — large hollow circle behind it. */
  icon?: TablerIcon;
  title: ReactNode;
  description?: ReactNode;
  /** Optional CTA (Button) below the description. */
  action?: ReactNode;
  className?: string;
}

/* The friendly empty-list state. Use anywhere the user has no data yet
   (no contacts, no campaigns sent, no integrations connected). */
export function EmptyState({ icon: Icon, title, description, action, className = '' }: Props) {
  return (
    <div className={`text-center py-16 px-6 ${className}`}>
      {Icon && (
        <div
          className="inline-grid place-items-center w-16 h-16 rounded-full bg-surface text-soft mb-4"
          style={{ fontSize: 28 }}
        >
          <Icon size={28} />
        </div>
      )}
      <h3 className="display text-xl font-semibold text-ink mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-muted mx-auto max-w-md leading-relaxed mb-5">
          {description}
        </p>
      )}
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
}
