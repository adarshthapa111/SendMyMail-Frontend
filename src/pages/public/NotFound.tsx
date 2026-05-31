import { Link, useLocation } from 'react-router-dom';

export function NotFound() {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-bg">
      <div className="w-full max-w-md text-center">
        <div
          className="display text-soft mb-2"
          style={{ fontSize: 72, fontWeight: 600, letterSpacing: '-0.03em' }}
        >
          404
        </div>
        <h1 className="display text-2xl font-semibold text-ink mb-2">
          Page not found
        </h1>
        <p className="text-muted text-sm mb-6">
          We couldn't find <span className="font-mono text-ink">{pathname}</span>.
          It may have moved, or the link might be stale.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-white font-semibold text-sm no-underline shadow-sm hover:-translate-y-px transition-transform"
          style={{ color: '#FFF7EE', border: '1px solid var(--primary-dark)' }}
        >
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}
