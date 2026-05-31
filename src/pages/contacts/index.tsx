import { Placeholder } from '../_shared/Placeholder';

export function Contacts() {
  return <Placeholder title="Contacts" subtitle="Per-client contact list — search, filter, tag." mockup="contacts.html" />;
}

export function ContactImport() {
  return <Placeholder title="Import contacts" subtitle="Upload CSV, map columns, confirm consent." mockup="contact_import.html" />;
}

export function ContactDetail() {
  return <Placeholder title="Contact detail" subtitle="Profile + activity timeline + lifetime value." mockup="contact_detail.html" />;
}

export function Lists() {
  return <Placeholder title="Lists & segments" subtitle="Static + dynamic audiences." mockup="lists.html" />;
}

export function ListEditor() {
  return <Placeholder title="Edit segment" subtitle="Condition builder with live preview." mockup="list_editor.html" />;
}

export function Suppression() {
  return <Placeholder title="Suppression list" subtitle="Auto-suppressed addresses by reason (bounce/complaint/manual/unsub/role)." mockup="suppression.html" />;
}
