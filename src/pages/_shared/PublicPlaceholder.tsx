import { Link, useLocation, useParams } from 'react-router-dom';

interface Props {
  title: string;
  subtitle?: string;
  mockup?: string;
}

/* Public placeholder — no chrome. Used for /login /signup /verify /forgot /reset
   /invite/:token /u/:unsubToken etc. before the real auth pages are built. */
export function PublicPlaceholder({ title, subtitle, mockup }: Props) {
  const { pathname } = useLocation();
  const params = useParams();
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-bg">
      <div className="w-full max-w-md bg-card border border-line rounded-lg p-8 shadow-lg">
        <div className="flex items-center gap-2 mb-6">
          <span
            className="inline-grid place-items-center w-8 h-8 rounded-lg text-white font-bold"
            style={{ background: 'var(--indigo)', fontFamily: 'Bricolage Grotesque' }}
          >
            S
          </span>
          <span className="font-semibold text-ink">SendMyMail</span>
        </div>

        <h1 className="display text-2xl font-semibold text-ink mb-2">{title}</h1>
        <p className="text-muted text-sm mb-4">
          {subtitle ?? 'Public route wired ✓ · UI to come.'}
        </p>

        <div className="bg-surface rounded-lg p-3 font-mono text-xs text-ink">
          {pathname}
        </div>

        {Object.keys(params).length > 0 && (
          <pre className="bg-surface rounded-lg p-3 font-mono text-xs text-ink mt-2 m-0">
            {JSON.stringify(params, null, 2)}
          </pre>
        )}

        {mockup && (
          <div className="mt-4 text-xs text-soft">
            Reference mockup:{' '}
            <span className="font-mono text-ink">doc/mockups/{mockup}</span>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-line-soft text-center text-sm text-muted">
          <Link to="/login" className="text-primary-ink font-semibold no-underline hover:underline">
            Go to /login
          </Link>
          {' · '}
          <Link to="/dashboard" className="text-primary-ink font-semibold no-underline hover:underline">
            Go to /dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
