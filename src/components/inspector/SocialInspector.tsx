import type { IMjmlNode, NodePath } from '../../tree/types';
import FormSection from './controls/FormSection';
import NumberInput from './controls/NumberInput';
import SelectInput from './controls/SelectInput';
import PaddingControl from './controls/PaddingControl';
import AdvancedPanel from './AdvancedPanel';
import { useAttrSetter } from './useInspectorHelpers';
import styles from '@styles/components/inspector/controls/controls.module.css';

interface Props {
  node: IMjmlNode;
  path: NodePath;
}

const KNOWN_KEYS = ['icon-size', 'mode', 'inner-padding', 'align', 'padding'];

export default function SocialInspector({ node, path }: Props) {
  const attrs = node.attributes ?? {};
  const set = useAttrSetter(path);

  return (
    <>
      <FormSection title="Icons">
        <NumberInput
          label="Icon size"
          value={(attrs['icon-size'] as string) ?? '24px'}
          units={['px']}
          onCommit={set('icon-size')}
        />
        <NumberInput
          label="Icon spacing"
          value={attrs['inner-padding'] as string}
          units={['px']}
          onCommit={set('inner-padding')}
        />
        <SelectInput
          label="Layout"
          value={(attrs.mode as string) ?? 'horizontal'}
          options={[
            { value: 'horizontal', label: 'Horizontal' },
            { value: 'vertical', label: 'Vertical' },
          ]}
          onCommit={set('mode')}
        />
        <SelectInput
          label="Align"
          value={(attrs.align as string) ?? 'center'}
          options={['left', 'center', 'right']}
          onCommit={set('align')}
        />
        <span className={styles.fieldHint}>
          Click an icon on the canvas to edit it (image, URL, network name).
        </span>
      </FormSection>

      <FormSection title="Spacing">
        <PaddingControl value={attrs.padding as string} onCommit={set('padding')} />
      </FormSection>

      <AdvancedPanel node={node} path={path} knownKeys={KNOWN_KEYS} />
    </>
  );
}
