import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom';
import { AppShell } from '../components/shell/AppShell';
import {
  Public,
  AuthOnly,
  AgencyReady,
  ClientScoped,
  RoleGated,
  RootRedirect,
} from './guards';

/* ─── Lazy chunks, one per code-split boundary in routes.md §5 ─── */

/* Auth chunk */
const Auth = {
  Login:  lazy(() => import('../pages/auth').then(m => ({ default: m.Login }))),
  Signup: lazy(() => import('../pages/auth').then(m => ({ default: m.Signup }))),
  Verify: lazy(() => import('../pages/auth').then(m => ({ default: m.Verify }))),
  Forgot: lazy(() => import('../pages/auth').then(m => ({ default: m.Forgot }))),
  Reset:  lazy(() => import('../pages/auth').then(m => ({ default: m.Reset }))),
  Invite: lazy(() => import('../pages/auth').then(m => ({ default: m.Invite }))),
};

/* Setup chunk */
const Setup = {
  WorkspaceSetup: lazy(() => import('../pages/setup').then(m => ({ default: m.WorkspaceSetup }))),
  Onboarding:     lazy(() => import('../pages/setup').then(m => ({ default: m.Onboarding }))),
};

/* App chunks */
const Dashboard      = lazy(() => import('../pages/dashboard').then(m => ({ default: m.Dashboard })));

const Clients = {
  List:   lazy(() => import('../pages/clients').then(m => ({ default: m.ClientsList }))),
  Create: lazy(() => import('../pages/clients').then(m => ({ default: m.ClientCreate }))),
  Edit:   lazy(() => import('../pages/clients').then(m => ({ default: m.ClientEdit }))),
};

const Contacts = {
  List:       lazy(() => import('../pages/contacts').then(m => ({ default: m.Contacts }))),
  Import:     lazy(() => import('../pages/contacts').then(m => ({ default: m.ContactImport }))),
  Detail:     lazy(() => import('../pages/contacts').then(m => ({ default: m.ContactDetail }))),
  Lists:      lazy(() => import('../pages/contacts').then(m => ({ default: m.Lists }))),
  ListEditor: lazy(() => import('../pages/contacts').then(m => ({ default: m.ListEditor }))),
  Suppression:lazy(() => import('../pages/contacts').then(m => ({ default: m.Suppression }))),
};

const Templates = {
  List:    lazy(() => import('../pages/templates').then(m => ({ default: m.Templates }))),
  Builder: lazy(() => import('../pages/templates/Builder').then(m => ({ default: m.Builder }))),
};

const Campaigns = {
  List:   lazy(() => import('../pages/campaigns').then(m => ({ default: m.CampaignsList }))),
  Wizard: lazy(() => import('../pages/campaigns').then(m => ({ default: m.CampaignWizard }))),
  Report: lazy(() => import('../pages/campaigns').then(m => ({ default: m.CampaignReport }))),
};

const Flows = {
  List:   lazy(() => import('../pages/flows').then(m => ({ default: m.Flows }))),
  Config: lazy(() => import('../pages/flows').then(m => ({ default: m.FlowConfig }))),
};

const Forms = {
  List:    lazy(() => import('../pages/forms').then(m => ({ default: m.Forms }))),
  Builder: lazy(() => import('../pages/forms').then(m => ({ default: m.FormBuilder }))),
};

const Reports      = lazy(() => import('../pages/reports').then(m => ({ default: m.Reports })));
const Team         = lazy(() => import('../pages/team').then(m => ({ default: m.Team })));
const AuditLog     = lazy(() => import('../pages/audit').then(m => ({ default: m.AuditLog })));
const Integrations = lazy(() => import('../pages/integrations').then(m => ({ default: m.Integrations })));
const Billing      = lazy(() => import('../pages/billing').then(m => ({ default: m.Billing })));
const Whitelabel   = lazy(() => import('../pages/whitelabel').then(m => ({ default: m.Whitelabel })));
const Settings     = lazy(() => import('../pages/settings').then(m => ({ default: m.Settings })));
const Help         = lazy(() => import('../pages/help').then(m => ({ default: m.Help })));
const Notifications= lazy(() => import('../pages/notifications').then(m => ({ default: m.Notifications })));

const Unsubscribe  = lazy(() => import('../pages/public/Unsubscribe').then(m => ({ default: m.Unsubscribe })));
const NotFound     = lazy(() => import('../pages/public/NotFound').then(m => ({ default: m.NotFound })));

/* Tiny suspense fallback — keep it minimal so chunk loading feels instant. */
function ChunkLoading() {
  return null;
}
function withSuspense(node: ReactNode) {
  return <Suspense fallback={<ChunkLoading />}>{node}</Suspense>;
}

/* ─── Router ─── */

export const router = createBrowserRouter([
  /* Root → /dashboard (or /login when auth lands) */
  { path: '/', element: <RootRedirect /> },

  /* Public pre-auth — no chrome */
  { path: '/login',           element: <Public>{withSuspense(<Auth.Login />)}</Public> },
  { path: '/signup',          element: <Public>{withSuspense(<Auth.Signup />)}</Public> },
  { path: '/verify',          element: <AuthOnly>{withSuspense(<Auth.Verify />)}</AuthOnly> },
  { path: '/forgot',          element: <Public>{withSuspense(<Auth.Forgot />)}</Public> },
  { path: '/reset/:token',    element: <Public>{withSuspense(<Auth.Reset />)}</Public> },
  { path: '/invite/:token',   element: <Public>{withSuspense(<Auth.Invite />)}</Public> },

  /* Setup — auth'd but pre-AgencyReady, no chrome */
  { path: '/workspace-setup', element: <AuthOnly>{withSuspense(<Setup.WorkspaceSetup />)}</AuthOnly> },
  { path: '/onboarding',      element: <AgencyReady>{withSuspense(<Setup.Onboarding />)}</AgencyReady> },

  /* Public deep-link landing pages — no chrome */
  { path: '/u/:unsubToken',   element: withSuspense(<Unsubscribe />) },

  /* ─── Main app — wrapped in AppShell (topbar + sidebar + scrolling main) ─── */
  {
    element: <AgencyReady><AppShell /></AgencyReady>,
    children: [

      { path: '/dashboard',                                    element: withSuspense(<Dashboard />) },

      /* Clients */
      { path: '/clients',                                      element: withSuspense(<Clients.List />) },
      { path: '/clients/new',                                  element: <RoleGated min="admin">{withSuspense(<Clients.Create />)}</RoleGated> },
      { path: '/clients/:clientId/edit',                       element: <RoleGated min="admin"><ClientScoped>{withSuspense(<Clients.Edit />)}</ClientScoped></RoleGated> },

      /* Per-client */
      { path: '/clients/:clientId/contacts',                   element: <ClientScoped>{withSuspense(<Contacts.List />)}</ClientScoped> },
      { path: '/clients/:clientId/contacts/import',            element: <ClientScoped>{withSuspense(<Contacts.Import />)}</ClientScoped> },
      { path: '/clients/:clientId/contacts/:contactId',        element: <ClientScoped>{withSuspense(<Contacts.Detail />)}</ClientScoped> },
      { path: '/clients/:clientId/lists',                      element: <ClientScoped>{withSuspense(<Contacts.Lists />)}</ClientScoped> },
      { path: '/clients/:clientId/lists/:listId/edit',         element: <ClientScoped>{withSuspense(<Contacts.ListEditor />)}</ClientScoped> },
      { path: '/clients/:clientId/suppression',                element: <RoleGated min="admin">{withSuspense(<Contacts.Suppression />)}</RoleGated> },

      { path: '/clients/:clientId/templates',                  element: <ClientScoped>{withSuspense(<Templates.List />)}</ClientScoped> },
      /* Note: /templates/:tid/edit moved OUT of AppShell — see "Full-screen
         editor routes" below. Builder takes over the entire viewport. */

      { path: '/clients/:clientId/campaigns',                          element: <ClientScoped>{withSuspense(<Campaigns.List />)}</ClientScoped> },
      { path: '/clients/:clientId/campaigns/new',                      element: <RoleGated min="admin"><ClientScoped>{withSuspense(<Campaigns.Wizard />)}</ClientScoped></RoleGated> },
      { path: '/clients/:clientId/campaigns/:campaignId/edit',         element: <RoleGated min="admin"><ClientScoped>{withSuspense(<Campaigns.Wizard />)}</ClientScoped></RoleGated> },
      { path: '/clients/:clientId/campaigns/:campaignId',              element: <ClientScoped>{withSuspense(<Campaigns.Report />)}</ClientScoped> },

      { path: '/clients/:clientId/flows',                      element: <ClientScoped>{withSuspense(<Flows.List />)}</ClientScoped> },
      { path: '/clients/:clientId/flows/:flowId',              element: <ClientScoped>{withSuspense(<Flows.Config />)}</ClientScoped> },

      { path: '/clients/:clientId/forms',                      element: <ClientScoped>{withSuspense(<Forms.List />)}</ClientScoped> },
      { path: '/clients/:clientId/forms/:formId/edit',         element: <ClientScoped>{withSuspense(<Forms.Builder />)}</ClientScoped> },

      { path: '/clients/:clientId/reports',                    element: <ClientScoped>{withSuspense(<Reports />)}</ClientScoped> },

      /* Agency-level */
      { path: '/team',             element: <RoleGated min="admin">{withSuspense(<Team />)}</RoleGated> },
      { path: '/audit',            element: <RoleGated min="admin">{withSuspense(<AuditLog />)}</RoleGated> },
      { path: '/integrations',     element: withSuspense(<Integrations />) },
      { path: '/billing',          element: <RoleGated min="owner">{withSuspense(<Billing />)}</RoleGated> },
      { path: '/whitelabel',       element: <RoleGated min="owner">{withSuspense(<Whitelabel />)}</RoleGated> },

      /* Cross-cutting (reached from user menu / chrome) */
      { path: '/settings',         element: withSuspense(<Settings />) },
      { path: '/settings/:tab',    element: withSuspense(<Settings />) },
      { path: '/help',             element: withSuspense(<Help />) },
      { path: '/notifications',    element: withSuspense(<Notifications />) },

      /* Catch-all inside the shell — 404 with chrome */
      { path: '*', element: <Outlet /> /* falls through to top-level 404 */ },
    ],
  },

  /* ─── Full-screen editor routes — auth gated, but NO AppShell ─── */
  /* These routes take over the whole viewport. The builder renders its own
     focused chrome (BuilderTopBar + Palette + Canvas + Inspector). Used by
     template editing, and later by campaign content step and form builder. */
  {
    element: <AgencyReady><Outlet /></AgencyReady>,
    children: [
      { path: '/clients/:clientId/templates/:templateId/edit', element: <ClientScoped>{withSuspense(<Templates.Builder />)}</ClientScoped> },
    ],
  },

  /* Top-level 404 — no chrome */
  { path: '*', element: withSuspense(<NotFound />) },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
