import { useLocation, useParams, Link } from 'react-router-dom';

interface Props {
  title: string;
  subtitle?: string;
  mockup?: string;     // e.g. "agency_dashboard.html"
}

/* In-app placeholder — renders inside AppShell.
   When you wire the real screen, replace `<Placeholder ... />` with the
   actual component. Keeps the chunk in place. */
export function Placeholder({ title, subtitle, mockup }: Props) {
  const { pathname } = useLocation();
  const params = useParams();
  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="display text-3xl font-semibold text-ink mb-1">{title}</h1>
        <p className="text-muted text-sm">
          {subtitle ?? 'Route wired ✓ · UI to come.'}
        </p>
      </div>

      <div className="bg-card border border-line rounded-lg p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-soft mb-2">
              Current route
            </div>
            <div className="font-mono text-sm text-ink bg-surface px-3 py-2 rounded">
              {pathname}
            </div>
          </div>

          {Object.keys(params).length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-soft mb-2">
                URL params
              </div>
              <pre className="font-mono text-xs bg-surface px-3 py-2 rounded m-0">
                {JSON.stringify(params, null, 2)}
              </pre>
            </div>
          )}

          {mockup && (
            <div className="md:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-soft mb-2">
                Reference mockup
              </div>
              <div className="font-mono text-sm text-ink">
                doc/mockups/<span className="text-primary-ink font-semibold">{mockup}</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-line-soft text-xs text-soft">
          ← Try the sidebar links — each navigates to its own lazy-loaded chunk.{' '}
          <Link to="/dashboard" className="text-primary-ink font-semibold no-underline hover:underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
