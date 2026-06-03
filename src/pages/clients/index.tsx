import { Navigate } from 'react-router-dom';

/* /clients page + the edit page (modal version of create is owned by ClientsList).
   /clients/new is now a redirect to /clients?new=1 so the topbar switcher's
   "Create" item + any external bookmarks still land on the create modal. */
export { ClientsList } from './ClientsList';
export { ClientEdit }  from './ClientEdit';

/* The dedicated create page is gone — replaced by ClientFormDialog opened
   inside ClientsList. Old route still resolves so deep links work. */
export function ClientCreate() {
  return <Navigate to="/clients?new=1" replace />;
}
