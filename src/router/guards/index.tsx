/* Auth gates from doc/architecture/routes.md §3.
   ─────────────────────────────────────────────
   Real logic — reads from the auth slice, redirects appropriately.

   While the slice is `authenticating` (we're still resolving /me on first load
   with a stored JWT), guards render null instead of redirecting — so the user
   doesn't see a flash of /login before /dashboard. */

import type { ReactNode } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';

interface GuardProps {
  children: ReactNode;
}

const ROLE_RANK = { viewer: 0, member: 1, admin: 2, owner: 3 } as const;

/* Public — for /login /signup /forgot etc.
   If the user is already signed in + verified + agency set up → bounce to /dashboard.
   We do NOT treat status='authenticating' specially here — that status is set during
   the active login submit, and unmounting the form mid-click would flash the page blank
   (looks like a full refresh). The form's own `submitting` state handles loading UI. */
export function Public({ children }: GuardProps) {
  const { status, user, agency } = useAppSelector((s) => s.auth);
  if (status === 'authed' && user?.emailVerified && agency?.setupComplete) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

/* AuthOnly — needs a JWT but accepts un-verified / un-setup users.
   Used by /verify (you need to be signed in to enter a verify code). */
export function AuthOnly({ children }: GuardProps) {
  const { status } = useAppSelector((s) => s.auth);
  const { pathname } = useLocation();
  if (status === 'authenticating') return null;
  if (status === 'anonymous') {
    return <Navigate to={`/login?next=${encodeURIComponent(pathname)}`} replace />;
  }
  return <>{children}</>;
}

/* AgencyReady — AuthOnly + email_verified + agency.setup_complete.
   The standard guard for in-app screens. Redirects unverified → /verify
   and unsetup → /workspace-setup. */
export function AgencyReady({ children }: GuardProps) {
  const { status, user, agency } = useAppSelector((s) => s.auth);
  const { pathname } = useLocation();
  if (status === 'authenticating') return null;
  if (status === 'anonymous') {
    return <Navigate to={`/login?next=${encodeURIComponent(pathname)}`} replace />;
  }
  if (!user?.emailVerified) return <Navigate to="/verify" replace />;
  if (!agency?.setupComplete) return <Navigate to="/workspace-setup" replace />;
  return <>{children}</>;
}

/* ClientScoped — AgencyReady + :clientId in JWT scope (or scope=all).
   Decoded JWT scope isn't in the Redux slice yet (slice only carries user/agency);
   for V1 we read directly from the JWT in localStorage. */
import { decodeJwt } from '../../lib/api/jwt';

export function ClientScoped({ children }: GuardProps) {
  const { status } = useAppSelector((s) => s.auth);
  const { clientId } = useParams();
  if (status === 'authenticating') return null;
  if (status === 'anonymous') return <Navigate to="/login" replace />;
  if (!clientId) return <Navigate to="/clients" replace />;
  const claims = decodeJwt();
  if (!claims) return <Navigate to="/login" replace />;
  if (claims.scope.type === 'all') return <>{children}</>;
  if (claims.scope.ids.includes(clientId)) return <>{children}</>;
  // intentionally / : never leak that the client exists in another agency
  return <Navigate to="/clients" replace />;
}

/* RoleGated — AgencyReady + minimum role. */
interface RoleGatedProps extends GuardProps {
  min: 'owner' | 'admin' | 'member' | 'viewer';
}
export function RoleGated({ children, min }: RoleGatedProps) {
  const { status, user } = useAppSelector((s) => s.auth);
  if (status === 'authenticating') return null;
  if (status === 'anonymous' || !user) return <Navigate to="/login" replace />;
  if (ROLE_RANK[user.role] < ROLE_RANK[min]) {
    return <Navigate to="/dashboard" replace />; // 403-style; UI surfaces a toast
  }
  return <>{children}</>;
}

/* Root "/" → dashboard if signed in, login otherwise. */
export function RootRedirect() {
  const { status } = useAppSelector((s) => s.auth);
  if (status === 'authenticating') return null;
  if (status === 'authed') return <Navigate to="/dashboard" replace />;
  return <Navigate to="/login" replace />;
}
