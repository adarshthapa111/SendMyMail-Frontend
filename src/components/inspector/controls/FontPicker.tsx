import SelectInput from './SelectInput';

interface Props {
  label?: string;
  value: string | undefined;
  onCommit: (value: string) => void;
}

/**
 * Web-safe fonts that render reliably across mail clients.
 * Google Fonts can be added per template via mj-attributes/mj-font; we don't
 * expose that in v1 — pick from this list for now.
 */
const FONT_OPTIONS = [
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Helvetica, Arial, sans-serif', label: 'Helvetica' },
  { value: '"Segoe UI", Tahoma, sans-serif', label: 'Segoe UI' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: 'Tahoma, sans-serif', label: 'Tahoma' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: '"Times New Roman", Times, serif', label: 'Times New Roman' },
  { value: '"Courier New", Courier, monospace', label: 'Courier New' },
  { value: 'system-ui, -apple-system, sans-serif', label: 'System UI' },
];

export default function FontPicker({ label = 'Font family', value, onCommit }: Props) {
  return <SelectInput label={label} value={value} options={FONT_OPTIONS} onCommit={onCommit} />;
}
