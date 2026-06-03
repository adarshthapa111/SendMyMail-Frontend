import { Placeholder } from '../_shared/Placeholder';

/* Real pages */
export { ContactsList as Contacts } from './ContactsList';
export { ContactDetail }            from './ContactDetail';
export { ListsList     as Lists }   from './ListsList';
export { ContactImport }            from './ContactImport';

/* Still placeholders — ship in PR 3 (segments + suppression) */
export function ListEditor() {
  return <Placeholder title="Edit segment" subtitle="Condition builder with live preview." mockup="list_editor.html" />;
}
export function Suppression() {
  return <Placeholder title="Suppression list" subtitle="Auto-suppressed addresses by reason (bounce/complaint/manual/unsub/role)." mockup="suppression.html" />;
}
