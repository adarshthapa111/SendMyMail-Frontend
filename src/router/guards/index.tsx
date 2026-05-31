/* Auth gates from doc/architecture/routes.md §3.
   ─────────────────────────────────────────────
   STUB IMPLEMENTATION — every gate returns true for now.
   Real logic lands with the auth feature PR (tasks/feature-auth/),
   which adds:
     - JWT read from localStorage['sendmymail_jwt']
     - JWT decode (sub, role, scope, agency_id, email_verified, agency_setup)
     - The `auth` Redux slice that hydrates from the JWT
     - The actual scope / role / agency-readiness checks
   These stubs let the router land + every route resolve, without
   blocking on the backend.
*/

import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface GuardProps {
  children: ReactNode;
}

/* Public — always allowed. Real logic: if already signed-in, redirect to /dashboard. */
export function Public({ children }: GuardProps) {
  return <>{children}</>;
}

/* AuthOnly — JWT present + valid + email verified.
   Real logic: redirect → /login?next=<path> if no JWT. */
export function AuthOnly({ children }: GuardProps) {
  // const auth = useAppSelector(s => s.auth);
  // if (auth.status === 'anonymous') return <Navigate to={`/login?next=${pathname}`} />;
  return <>{children}</>;
}

/* AgencyReady — AuthOnly + agency workspace-setup complete.
   Real logic: redirect → /workspace-setup if !agency_setup. */
export function AgencyReady({ children }: GuardProps) {
  // const auth = useAppSelector(s => s.auth);
  // if (!auth.agency?.setup_complete) return <Navigate to="/workspace-setup" />;
  return <>{children}</>;
}

/* ClientScoped — AgencyReady + :clientId exists + user has access to that client.
   Real logic: 404 if client doesn't exist; redirect → /clients if no access. */
export function ClientScoped({ children }: GuardProps) {
  // const { clientId } = useParams();
  // const auth = useAppSelector(s => s.auth);
  // if (!auth.scope.canAccess(clientId)) return <Navigate to="/clients" />;
  return <>{children}</>;
}

/* RoleGated — AgencyReady + user's role meets the route's minimum.
   Use as <RoleGated min="admin"><Page /></RoleGated>. */
interface RoleGatedProps extends GuardProps {
  min: 'owner' | 'admin' | 'member' | 'viewer';
}
export function RoleGated({ children, min: _min }: RoleGatedProps) {
  // const auth = useAppSelector(s => s.auth);
  // if (!roleAtLeast(auth.user.role, min)) return <NoPermission />;
  return <>{children}</>;
}

/* Tiny placeholder for "/" → routed based on auth state. */
export function RootRedirect() {
  const _loc = useLocation();
  /* Real logic: dashboard if signed-in, /login otherwise. */
  return <Navigate to="/dashboard" replace />;
}
