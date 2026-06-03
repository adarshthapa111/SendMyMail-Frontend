import { Placeholder } from '../_shared/Placeholder';

/* Real pages (feature-contacts-lists PR 1) */
export { ContactsList as Contacts } from './ContactsList';
export { ContactDetail } from './ContactDetail';
export { ListsList     as Lists }    from './ListsList';

/* Still placeholders — ship in PR 2 / PR 3 */
export function ContactImport() {
  return <Placeholder title="Import contacts" subtitle="Upload CSV, map columns, confirm consent." mockup="contact_import.html" />;
}
export function ListEditor() {
  return <Placeholder title="Edit segment" subtitle="Condition builder with live preview." mockup="list_editor.html" />;
}
export function Suppression() {
  return <Placeholder title="Suppression list" subtitle="Auto-suppressed addresses by reason (bounce/complaint/manual/unsub/role)." mockup="suppression.html" />;
}
