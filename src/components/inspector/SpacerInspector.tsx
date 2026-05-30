import type { IMjmlNode, NodePath } from '../../tree/types';
import FormSection from './controls/FormSection';
import NumberInput from './controls/NumberInput';
import AdvancedPanel from './AdvancedPanel';
import { useAttrSetter } from './useInspectorHelpers';

interface Props {
  node: IMjmlNode;
  path: NodePath;
}

const KNOWN_KEYS = ['height'];

export default function SpacerInspector({ node, path }: Props) {
  const attrs = node.attributes ?? {};
  const set = useAttrSetter(path);

  return (
    <>
      <FormSection title="Size">
        <NumberInput
          label="Height"
          value={(attrs.height as string) ?? '20px'}
          units={['px']}
          min={0}
          onCommit={set('height')}
        />
      </FormSection>

      <AdvancedPanel node={node} path={path} knownKeys={KNOWN_KEYS} />
    </>
  );
}
