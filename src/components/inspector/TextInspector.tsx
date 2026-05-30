import type { IMjmlNode, NodePath } from '../../tree/types';
import FormSection from './controls/FormSection';
import NumberInput from './controls/NumberInput';
import ColorPicker from './controls/ColorPicker';
import FontPicker from './controls/FontPicker';
import SelectInput from './controls/SelectInput';
import PaddingControl from './controls/PaddingControl';
import AdvancedPanel from './AdvancedPanel';
import { useAttrSetter, useContentSetter } from './useInspectorHelpers';
import styles from '@styles/components/inspector/controls/controls.module.css';

interface Props {
  node: IMjmlNode;
  path: NodePath;
}

const KNOWN_KEYS = [
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'color',
  'align',
  'padding',
];

export default function TextInspector({ node, path }: Props) {
  const attrs = node.attributes ?? {};
  const set = useAttrSetter(path);
  const setContent = useContentSetter(path);

  return (
    <>
      <FormSection title="Content">
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Text (HTML allowed)</span>
          <textarea
            className={styles.textarea}
            value={node.content ?? ''}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
          />
          <span className={styles.fieldHint}>
            Inline tags like &lt;strong&gt;, &lt;em&gt;, &lt;a href&gt; are kept on export.
          </span>
        </label>
      </FormSection>

      <FormSection title="Typography">
        <FontPicker value={attrs['font-family'] as string} onCommit={set('font-family')} />
        <NumberInput
          label="Font size"
          value={attrs['font-size'] as string}
          units={['px', 'em', 'rem']}
          onCommit={set('font-size')}
        />
        <SelectInput
          label="Weight"
          value={(attrs['font-weight'] as string) ?? 'normal'}
          options={[
            { value: 'normal', label: 'Normal' },
            { value: 'bold', label: 'Bold' },
            { value: '500', label: '500' },
            { value: '600', label: '600' },
            { value: '700', label: '700' },
            { value: '800', label: '800' },
          ]}
          onCommit={set('font-weight')}
        />
        <NumberInput
          label="Line height"
          value={(attrs['line-height'] as string) ?? '1.6'}
          units={['none']}
          defaultUnit="none"
          step={0.1}
          onCommit={set('line-height')}
        />
        <ColorPicker label="Color" value={attrs.color as string} onCommit={set('color')} />
        <SelectInput
          label="Align"
          value={(attrs.align as string) ?? 'left'}
          options={['left', 'center', 'right', 'justify']}
          onCommit={set('align')}
        />
      </FormSection>

      <FormSection title="Spacing">
        <PaddingControl value={attrs.padding as string} onCommit={set('padding')} />
      </FormSection>

      <AdvancedPanel node={node} path={path} knownKeys={KNOWN_KEYS} />
    </>
  );
}
