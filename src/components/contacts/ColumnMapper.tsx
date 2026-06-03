import { useEffect, useMemo, useState } from 'react';
import { IconArrowRight } from '@tabler/icons-react';
import { Text } from '../ui';
import type { ColumnMapping, MappingTarget } from '../../lib/api/imports';
import styles from '@styles/components/contacts/ColumnMapper.module.scss';

interface Props {
  headers: string[];
  sampleRows: Record<string, string>[];
  value: ColumnMapping;
  onChange: (mapping: ColumnMapping) => void;
}

interface Option {
  value: MappingTarget;
  label: string;
  group: 'standard' | 'special';
}

const OPTIONS: Option[] = [
  { value: 'skip',       label: "Don't import",       group: 'special' },
  { value: 'email',      label: 'Email · required',   group: 'standard' },
  { value: 'firstName',  label: 'First name',         group: 'standard' },
  { value: 'lastName',   label: 'Last name',          group: 'standard' },
  { value: 'phone',      label: 'Phone',              group: 'standard' },
  { value: 'city',       label: 'City',               group: 'standard' },
  { value: 'birthday',   label: 'Birthday · YYYY-MM-DD', group: 'standard' },
];

/* Best-effort auto-detect: pattern-match common header names case-insensitively.
   Users can override any cell. */
function autoMap(header: string): MappingTarget {
  const h = header.trim().toLowerCase();
  if (/^e[\W_]*mail$|^email[\W_]*address$/.test(h))   return 'email';
  if (/^(first[\W_]*name|fname|given[\W_]*name)$/.test(h)) return 'firstName';
  if (/^(last[\W_]*name|lname|surname|family[\W_]*name)$/.test(h)) return 'lastName';
  if (/^(phone|mobile|tel|telephone)$/.test(h))       return 'phone';
  if (/^(city|location|town)$/.test(h))               return 'city';
  if (/^(birthday|birth[\W_]*date|dob)$/.test(h))     return 'birthday';
  return 'skip';
}

/* Step 3 of the import wizard.
   Renders one row per CSV header: csvColumn → <select>(standard field
   or custom field or skip). Pre-fills the selects via autoMap(). */
export function ColumnMapper({ headers, sampleRows, value, onChange }: Props) {
  /* Track which columns the user has explicitly tagged as "custom:" and the
     custom-key name for each. Lets the user type a key in the inline input. */
  const [customKeys, setCustomKeys] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const [csvCol, target] of Object.entries(value)) {
      if (typeof target === 'string' && target.startsWith('custom:')) {
        init[csvCol] = target.slice('custom:'.length);
      }
    }
    return init;
  });

  /* Auto-prefill when the headers change (e.g. user replaced their file). */
  useEffect(() => {
    if (headers.length === 0) return;
    const fresh: ColumnMapping = {};
    for (const h of headers) fresh[h] = autoMap(h);

    // Don't double-map email — if two headers auto-mapped to email, keep the
    // first and mark the others as skip
    let emailSeen = false;
    for (const h of headers) {
      if (fresh[h] === 'email') {
        if (emailSeen) fresh[h] = 'skip';
        else emailSeen = true;
      }
    }

    onChange(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headers.join('|')]);

  const emailColumns = useMemo(
    () => Object.entries(value).filter(([, t]) => t === 'email').map(([h]) => h),
    [value],
  );

  function setTarget(csvCol: string, target: MappingTarget) {
    const next: ColumnMapping = { ...value, [csvCol]: target };
    onChange(next);
  }

  function setCustomKey(csvCol: string, key: string) {
    setCustomKeys((prev) => ({ ...prev, [csvCol]: key }));
    const target = key.trim() ? (`custom:${key.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_')}` as MappingTarget) : 'skip';
    setTarget(csvCol, target);
  }

  return (
    <div className={styles.wrap}>
      <Text tone="muted" size="sm" className={styles.lede}>
        Match each column from your CSV to a contact field. Only <b>Email</b> is required.
      </Text>

      {emailColumns.length === 0 ? (
        <div className={styles.banner}>
          One column must map to <b>Email</b>.
        </div>
      ) : emailColumns.length > 1 ? (
        <div className={styles.banner}>
          Only one column can map to <b>Email</b> — currently: {emailColumns.map((h) => `"${h}"`).join(', ')}
        </div>
      ) : null}

      <div className={styles.list}>
        {headers.map((h) => {
          const target = value[h] ?? 'skip';
          const isCustom = typeof target === 'string' && target.startsWith('custom:');
          const selectValue = isCustom ? 'custom' : target;
          const sample = sampleRows[0]?.[h];
          return (
            <div key={h} className={styles.row}>
              <div className={styles.csvCol}>
                <code>{h}</code>
                {sample ? <span className={styles.sample}>e.g. {sample}</span> : null}
              </div>
              <IconArrowRight size={14} className={styles.arrow} />
              <div className={styles.target}>
                <select
                  className={styles.select}
                  value={selectValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === 'custom') {
                      const key = customKeys[h] ?? '';
                      setTarget(h, key ? (`custom:${key}` as MappingTarget) : 'skip');
                      if (!customKeys[h]) setCustomKeys((p) => ({ ...p, [h]: h.toLowerCase().replace(/[^a-z0-9_]+/g, '_') }));
                    } else {
                      setTarget(h, v as MappingTarget);
                    }
                  }}
                >
                  {OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                  <option value="custom">Custom field…</option>
                </select>
                {isCustom ? (
                  <input
                    type="text"
                    placeholder="field_name"
                    value={customKeys[h] ?? ''}
                    onChange={(e) => setCustomKey(h, e.target.value)}
                    className={styles.customKey}
                    aria-label="Custom field key"
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
