import type { IMjmlNode, NodePath } from '../../tree/types';
import FormSection from './controls/FormSection';
import NumberInput from './controls/NumberInput';
import ColorPicker from './controls/ColorPicker';
import UrlInput from './controls/UrlInput';
import SelectInput from './controls/SelectInput';
import PaddingControl from './controls/PaddingControl';
import AdvancedPanel from './AdvancedPanel';
import { useAttrSetter } from './useInspectorHelpers';

interface Props {
  node: IMjmlNode;
  path: NodePath;
}

const KNOWN_KEYS = [
  'background-url',
  'background-color',
  'mode',
  'height',
  'vertical-align',
  'padding',
];

export default function HeroInspector({ node, path }: Props) {
  const attrs = node.attributes ?? {};
  const set = useAttrSetter(path);

  return (
    <>
      <FormSection title="Background">
        <UrlInput
          label="Image URL"
          value={attrs['background-url'] as string}
          onCommit={set('background-url')}
        />
        <ColorPicker
          label="Fallback color"
          value={attrs['background-color'] as string}
          onCommit={set('background-color')}
        />
      </FormSection>

      <FormSection title="Size">
        <SelectInput
          label="Mode"
          value={(attrs.mode as string) ?? 'fixed-height'}
          options={[
            { value: 'fixed-height', label: 'Fixed height' },
            { value: 'fluid-height', label: 'Fluid (content-driven)' },
          ]}
          onCommit={set('mode')}
        />
        <NumberInput
          label="Height"
          value={(attrs.height as string) ?? '300px'}
          units={['px']}
          onCommit={set('height')}
        />
        <SelectInput
          label="Vertical align"
          value={(attrs['vertical-align'] as string) ?? 'middle'}
          options={['top', 'middle', 'bottom']}
          onCommit={set('vertical-align')}
        />
      </FormSection>

      <FormSection title="Spacing">
        <PaddingControl value={attrs.padding as string} onCommit={set('padding')} />
      </FormSection>

      <AdvancedPanel node={node} path={path} knownKeys={KNOWN_KEYS} />
    </>
  );
}
