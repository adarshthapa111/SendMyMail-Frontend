import { Placeholder } from '../_shared/Placeholder';

/* Real pages */
export { ContactsList as Contacts } from './ContactsList';
export { ContactDetail }            from './ContactDetail';
export { ListsList     as Lists }   from './ListsList';
export { ContactImport }            from './ContactImport';
export { SuppressionList as Suppression } from './SuppressionList';

/* Still placeholders — ship in PR 3 (segments) */
export function ListEditor() {
  return <Placeholder title="Edit segment" subtitle="Condition builder with live preview." mockup="list_editor.html" />;
}
