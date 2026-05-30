import type { IMjmlNode, NodePath } from '../../tree/types';
import FormSection from './controls/FormSection';
import NumberInput from './controls/NumberInput';
import ColorPicker from './controls/ColorPicker';
import SelectInput from './controls/SelectInput';
import PaddingControl from './controls/PaddingControl';
import AdvancedPanel from './AdvancedPanel';
import { useAttrSetter } from './useInspectorHelpers';

interface Props {
  node: IMjmlNode;
  path: NodePath;
}

const KNOWN_KEYS = ['width', 'background-color', 'vertical-align', 'padding', 'border-radius'];

export default function ColumnInspector({ node, path }: Props) {
  const attrs = node.attributes ?? {};
  const set = useAttrSetter(path);

  return (
    <>
      <FormSection title="Layout">
        <NumberInput
          label="Width"
          value={(attrs.width as string) ?? '100%'}
          units={['%', 'px']}
          onCommit={set('width')}
        />
        <SelectInput
          label="Vertical align"
          value={(attrs['vertical-align'] as string) ?? 'top'}
          options={['top', 'middle', 'bottom']}
          onCommit={set('vertical-align')}
        />
      </FormSection>

      <FormSection title="Style">
        <ColorPicker
          label="Background"
          value={attrs['background-color'] as string}
          onCommit={set('background-color')}
        />
        <NumberInput
          label="Border radius"
          value={attrs['border-radius'] as string}
          units={['px']}
          onCommit={set('border-radius')}
        />
      </FormSection>

      <FormSection title="Spacing">
        <PaddingControl value={attrs.padding as string} onCommit={set('padding')} />
      </FormSection>

      <AdvancedPanel node={node} path={path} knownKeys={KNOWN_KEYS} />
    </>
  );
}
