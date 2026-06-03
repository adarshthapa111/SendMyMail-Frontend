import { useState, type KeyboardEvent } from 'react';
import { IconX } from '@tabler/icons-react';
import type { Tag } from '../../lib/api/tags';
import styles from '@styles/components/contacts/ContactTagInput.module.scss';

interface Props {
  value: string[];                  // selected tag names (lowercased)
  onChange: (next: string[]) => void;
  suggestions?: Tag[];              // existing tags for the client (autocomplete pool)
  placeholder?: string;
  maxTags?: number;
}

/* Chip multi-select for tags.
   - Type → enter / comma → adds the tag (lowercased + trimmed)
   - Backspace on empty input → removes last
   - Click X on a chip → removes that chip
   - Autocomplete from existing tags via a tiny dropdown */
export function ContactTagInput({
  value, onChange, suggestions = [], placeholder = 'Add a tag…', maxTags = 20,
}: Props) {
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);

  function normalize(raw: string): string | null {
    const t = raw.trim().toLowerCase();
    if (!t || t.length > 40) return null;
    return t;
  }

  function addTag(raw: string) {
    const t = normalize(raw);
    if (!t) return;
    if (value.includes(t)) { setDraft(''); return; }
    if (value.length >= maxTags) return;
    onChange([...value, t]);
    setDraft('');
  }

  function removeTag(t: string) {
    onChange(value.filter((x) => x !== t));
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      if (draft.trim()) {
        e.preventDefault();
        addTag(draft);
      }
    } else if (e.key === 'Backspace' && !draft && value.length > 0) {
      removeTag(value[value.length - 1]!);
    } else if (e.key === 'Escape') {
      setDraft('');
    }
  }

  const draftNorm = normalize(draft);
  const filtered = focused && draftNorm
    ? suggestions
        .filter((s) => s.name.includes(draftNorm) && !value.includes(s.name))
        .slice(0, 6)
    : [];
  const draftIsNew = !!draftNorm && !suggestions.some((s) => s.name === draftNorm) && !value.includes(draftNorm);

  return (
    <div className={styles.wrap}>
      <div className={styles.field}>
        {value.map((t) => (
          <span key={t} className={styles.chip}>
            {t}
            <button type="button" onClick={() => removeTag(t)} aria-label={`Remove ${t}`}>
              <IconX size={11} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => {
            setTimeout(() => setFocused(false), 100);    // allow click-on-suggestion to fire first
            if (draft.trim()) addTag(draft);
          }}
          onFocus={() => setFocused(true)}
          placeholder={value.length === 0 ? placeholder : ''}
          className={styles.input}
        />
      </div>

      {(filtered.length > 0 || draftIsNew) ? (
        <div className={styles.menu}>
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              className={styles.menuItem}
              onMouseDown={(e) => { e.preventDefault(); addTag(s.name); }}
            >
              {s.name}
            </button>
          ))}
          {draftIsNew ? (
            <button
              type="button"
              className={`${styles.menuItem} ${styles.menuItemCreate}`}
              onMouseDown={(e) => { e.preventDefault(); addTag(draft); }}
            >
              + Create tag <b>{draftNorm}</b>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
