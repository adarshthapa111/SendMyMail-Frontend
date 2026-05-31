import type { ReactNode } from 'react';

interface Props {
  /** Page title — rendered as <h1>, Bricolage Grotesque. */
  title: ReactNode;
  /** Optional one-line subtitle under the title. */
  subtitle?: ReactNode;
  /** Right-aligned action buttons (Button components). */
  actions?: ReactNode;
  /** Optional content above the title (e.g. a "← Back" link). */
  back?: ReactNode;
  className?: string;
}

/* The standard page header — title on the left, actions on the right.
   Used at the top of every screen inside the AppShell main area. */
export function PageHeader({ title, subtitle, actions, back, className = '' }: Props) {
  return (
    <div className={`mb-6 ${className}`}>
      {back && <div className="mb-3">{back}</div>}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="display text-3xl font-semibold text-ink mb-1" style={{ letterSpacing: '-0.022em' }}>
            {title}
          </h1>
          {subtitle && <p className="text-sm text-muted m-0">{subtitle}</p>}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
