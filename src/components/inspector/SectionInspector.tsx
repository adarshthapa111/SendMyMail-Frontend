import type { IMjmlNode, NodePath } from '../../tree/types';
import FormSection from './controls/FormSection';
import ColorPicker from './controls/ColorPicker';
import UrlInput from './controls/UrlInput';
import SelectInput from './controls/SelectInput';
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

export default function SectionInspector({ node, path }: Props) {
  const attrs = node.attributes ?? {};
  const set = useAttrSetter(path);

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
      </FormSection>

      <AdvancedPanel node={node} path={path} knownKeys={KNOWN_KEYS} />
    </>
  );
}
