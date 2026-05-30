import { useMemo, useState } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { setAttr } from '../../store/slices/editorSlice';
import type { IMjmlNode, NodePath } from '../../tree/types';
import FormSection from './controls/FormSection';
import styles from '@styles/components/inspector/controls/controls.module.css';

interface Props {
  node: IMjmlNode;
  path: NodePath;
  /**
   * Keys already exposed by the per-block form — they're filtered out so the
   * Advanced panel doesn't duplicate them. Pass an empty array to show all attrs.
   */
  knownKeys: string[];
}

/**
 * Raw key-value editor for attributes not covered by the per-block form.
 * Escape hatch for power users (e.g., css-class, container-background-color).
 * Hidden by default — open the section to use.
 */
export default function AdvancedPanel({ node, path, knownKeys }: Props) {
  const dispatch = useAppDispatch();
  const knownSet = useMemo(() => new Set(knownKeys), [knownKeys]);

  const extraAttrs = useMemo(() => {
    const all = node.attributes ?? {};
    return Object.entries(all).filter(([k]) => !knownSet.has(k));
  }, [node.attributes, knownSet]);

  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const onAdd = () => {
    const k = newKey.trim();
    if (!k) return;
    dispatch(setAttr({ path, key: k, value: newValue }));
    setNewKey('');
    setNewValue('');
  };

  return (
    <FormSection title="Advanced" defaultOpen={false}>
      {extraAttrs.length === 0 && (
        <div className={styles.fieldHint}>No extra attributes set.</div>
      )}

      {extraAttrs.map(([key, value]) => (
        <div key={key} className={styles.field}>
          <span className={styles.fieldLabel}>{key}</span>
          <div className={styles.numberWrap}>
            <input
              type="text"
              className={styles.numberValue}
              value={String(value ?? '')}
              onChange={(e) => dispatch(setAttr({ path, key, value: e.target.value }))}
            />
            <button
              type="button"
              className={styles.paddingModeBtn}
              style={{ width: 40, border: '1px solid #d2d4d8', borderRadius: 4, color: '#d11a2a' }}
              onClick={() => dispatch(setAttr({ path, key, value: undefined }))}
              title="Remove attribute"
            >
              ✕
            </button>
          </div>
        </div>
      ))}

      <div
        className={styles.field}
        style={{ borderTop: '1px solid #f0f2f5', paddingTop: 10, marginTop: 4 }}
      >
        <span className={styles.fieldLabel}>Add attribute</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <input
            type="text"
            className={styles.input}
            placeholder="key (e.g. css-class)"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            style={{ flex: 1 }}
            spellCheck={false}
          />
          <input
            type="text"
            className={styles.input}
            placeholder="value"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onAdd();
            }}
            style={{ flex: 1 }}
            spellCheck={false}
          />
          <button
            type="button"
            className={styles.paddingModeBtn}
            onClick={onAdd}
            disabled={!newKey.trim()}
            style={{
              border: '1px solid #1a73e8',
              borderRadius: 4,
              background: '#1a73e8',
              color: '#fff',
              padding: '0 12px',
            }}
          >
            Add
          </button>
        </div>
      </div>
    </FormSection>
  );
}
