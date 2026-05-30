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

const KNOWN_KEYS = ['border-color', 'border-width', 'border-style', 'width', 'align', 'padding'];

export default function DividerInspector({ node, path }: Props) {
  const attrs = node.attributes ?? {};
  const set = useAttrSetter(path);

  return (
    <>
      <FormSection title="Line">
        <ColorPicker
          label="Color"
          value={attrs['border-color'] as string}
          onCommit={set('border-color')}
        />
        <NumberInput
          label="Width"
          value={(attrs['border-width'] as string) ?? '1px'}
          units={['px']}
          onCommit={set('border-width')}
        />
        <SelectInput
          label="Style"
          value={(attrs['border-style'] as string) ?? 'solid'}
          options={['solid', 'dashed', 'dotted']}
          onCommit={set('border-style')}
        />
        <NumberInput
          label="Length"
          value={(attrs.width as string) ?? '100%'}
          units={['%', 'px']}
          onCommit={set('width')}
        />
        <SelectInput
          label="Align"
          value={(attrs.align as string) ?? 'center'}
          options={['left', 'center', 'right']}
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
