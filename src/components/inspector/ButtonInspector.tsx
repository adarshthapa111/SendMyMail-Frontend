import type { IMjmlNode, NodePath } from '../../tree/types';
import FormSection from './controls/FormSection';
import TextInput from './controls/TextInput';
import UrlInput from './controls/UrlInput';
import NumberInput from './controls/NumberInput';
import ColorPicker from './controls/ColorPicker';
import FontPicker from './controls/FontPicker';
import SelectInput from './controls/SelectInput';
import PaddingControl from './controls/PaddingControl';
import AdvancedPanel from './AdvancedPanel';
import { useAttrSetter, useContentSetter } from './useInspectorHelpers';

interface Props {
  node: IMjmlNode;
  path: NodePath;
}

const KNOWN_KEYS = [
  'href',
  'target',
  'background-color',
  'color',
  'font-family',
  'font-size',
  'font-weight',
  'border-radius',
  'padding',
  'inner-padding',
  'align',
];

export default function ButtonInspector({ node, path }: Props) {
  const attrs = node.attributes ?? {};
  const set = useAttrSetter(path);
  const setContent = useContentSetter(path);

  return (
    <>
      <FormSection title="Content">
        <TextInput label="Label" value={node.content ?? ''} onCommit={setContent} />
        <UrlInput label="Link URL" value={attrs.href as string} onCommit={set('href')} />
        <SelectInput
          label="Open in"
          value={(attrs.target as string) ?? '_self'}
          options={[
            { value: '_self', label: 'Same window' },
            { value: '_blank', label: 'New tab' },
          ]}
          onCommit={set('target')}
        />
      </FormSection>

      <FormSection title="Style">
        <ColorPicker
          label="Background"
          value={attrs['background-color'] as string}
          onCommit={set('background-color')}
        />
        <ColorPicker label="Text color" value={attrs.color as string} onCommit={set('color')} />
        <FontPicker value={attrs['font-family'] as string} onCommit={set('font-family')} />
        <NumberInput
          label="Font size"
          value={(attrs['font-size'] as string) ?? '16px'}
          units={['px', 'em']}
          onCommit={set('font-size')}
        />
        <SelectInput
          label="Weight"
          value={(attrs['font-weight'] as string) ?? '600'}
          options={[
            { value: 'normal', label: 'Normal' },
            { value: 'bold', label: 'Bold' },
            { value: '500', label: '500' },
            { value: '600', label: '600' },
            { value: '700', label: '700' },
          ]}
          onCommit={set('font-weight')}
        />
        <NumberInput
          label="Border radius"
          value={(attrs['border-radius'] as string) ?? '4px'}
          units={['px']}
          onCommit={set('border-radius')}
        />
        <SelectInput
          label="Align"
          value={(attrs.align as string) ?? 'center'}
          options={['left', 'center', 'right']}
          onCommit={set('align')}
        />
      </FormSection>

      <FormSection title="Spacing">
        <PaddingControl
          label="Outer padding"
          value={attrs.padding as string}
          onCommit={set('padding')}
        />
        <PaddingControl
          label="Inner padding"
          value={attrs['inner-padding'] as string}
          onCommit={set('inner-padding')}
        />
      </FormSection>

      <AdvancedPanel node={node} path={path} knownKeys={KNOWN_KEYS} />
    </>
  );
}
