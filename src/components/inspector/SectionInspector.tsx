import type { IMjmlNode, NodePath } from '../../tree/types';
import { useAppDispatch } from '../../store/hooks';
import { setColumnGap } from '../../store/slices/editorSlice';
import FormSection from './controls/FormSection';
import ColorPicker from './controls/ColorPicker';
import UrlInput from './controls/UrlInput';
import SelectInput from './controls/SelectInput';
import NumberInput from './controls/NumberInput';
import PaddingControl from './controls/PaddingControl';
import AdvancedPanel from './AdvancedPanel';
import { useAttrSetter } from './useInspectorHelpers';
import styles from '@styles/components/inspector/controls/controls.module.css';

interface Props {
  node: IMjmlNode;
  path: NodePath;
}

const KNOWN_KEYS = [
  'background-color',
  'background-url',
  'background-size',
  'padding',
  'full-width',
  'text-align',
];

/* Read the section's column gap back from its first mj-column:
   gap = padding-left × 2 (how setColumnGap writes it). */
function readColumnGap(node: IMjmlNode): string {
  const firstCol = node.children?.find((c) => c.tagName === 'mj-column');
  const pl = firstCol?.attributes?.['padding-left'];
  if (!pl) return '';
  const n = parseFloat(String(pl));
  return Number.isFinite(n) && n > 0 ? `${n * 2}px` : '';
}

export default function SectionInspector({ node, path }: Props) {
  const dispatch = useAppDispatch();
  const attrs = node.attributes ?? {};
  const set = useAttrSetter(path);
  const columnCount = node.children?.filter((c) => c.tagName === 'mj-column').length ?? 0;

  return (
    <>
      <FormSection title="Background">
        <ColorPicker
          label="Color"
          value={attrs['background-color'] as string}
          onCommit={set('background-color')}
        />
        <UrlInput
          label="Image URL (optional)"
          value={attrs['background-url'] as string}
          onCommit={set('background-url')}
        />
        <SelectInput
          label="Image size"
          value={(attrs['background-size'] as string) ?? 'cover'}
          options={['cover', 'contain', 'auto']}
          onCommit={set('background-size')}
        />
      </FormSection>

      <FormSection title="Layout">
        <label className={styles.toggleRow}>
          <input
            type="checkbox"
            checked={attrs['full-width'] === 'full-width'}
            onChange={(e) =>
              set('full-width')(e.target.checked ? 'full-width' : undefined)
            }
          />
          Full-width on mobile
        </label>
        <SelectInput
          label="Text align"
          value={(attrs['text-align'] as string) ?? 'center'}
          options={['left', 'center', 'right']}
          onCommit={set('text-align')}
        />
      </FormSection>

      <FormSection title="Spacing">
        <PaddingControl value={attrs.padding as string} onCommit={set('padding')} />
        {columnCount > 0 && (
          <>
            {/* MJML has no native gap attr — this writes padding-left/right
                = gap/2 onto every child column (the email-safe way). */}
            <NumberInput
              label="Column gap"
              value={readColumnGap(node)}
              units={['px']}
              min={0}
              step={2}
              placeholder="0"
              onCommit={(v) => {
                const n = v ? parseFloat(v) : undefined;
                dispatch(setColumnGap({
                  path,
                  gapPx: Number.isFinite(n as number) && (n as number) > 0 ? n : undefined,
                }));
              }}
            />
            <span className={styles.fieldHint}>
              Space between columns (applied as padding on each column).
            </span>
          </>
        )}
      </FormSection>

      <AdvancedPanel node={node} path={path} knownKeys={KNOWN_KEYS} />
    </>
  );
}
