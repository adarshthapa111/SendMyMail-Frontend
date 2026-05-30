import type { IMjmlNode, NodePath } from '../../tree/types';
import FormSection from './controls/FormSection';
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

const KNOWN_KEYS = ['base-url', 'hamburger', 'align', 'padding'];

export default function NavbarInspector({ node, path }: Props) {
  const attrs = node.attributes ?? {};
  const set = useAttrSetter(path);

  return (
    <>
      <FormSection title="Navigation">
        <UrlInput
          label="Base URL"
          value={attrs['base-url'] as string}
          onCommit={set('base-url')}
        />
        <label className={styles.toggleRow}>
          <input
            type="checkbox"
            checked={attrs.hamburger === 'hamburger'}
            onChange={(e) =>
              set('hamburger')(e.target.checked ? 'hamburger' : undefined)
            }
          />
          Show hamburger menu on mobile
        </label>
        <SelectInput
          label="Align"
          value={(attrs.align as string) ?? 'center'}
          options={['left', 'center', 'right']}
          onCommit={set('align')}
        />
        <span className={styles.fieldHint}>
          Edit individual links via the Advanced panel for now.
        </span>
      </FormSection>

      <FormSection title="Spacing">
        <PaddingControl value={attrs.padding as string} onCommit={set('padding')} />
      </FormSection>

      <AdvancedPanel node={node} path={path} knownKeys={KNOWN_KEYS} />
    </>
  );
}
