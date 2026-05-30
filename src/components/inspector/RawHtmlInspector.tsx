import { useDebouncedCommit } from './controls/useDebouncedCommit';
import type { IMjmlNode, NodePath } from '../../tree/types';
import FormSection from './controls/FormSection';
import AdvancedPanel from './AdvancedPanel';
import { useContentSetter } from './useInspectorHelpers';
import styles from '@styles/components/inspector/controls/controls.module.css';

interface Props {
  node: IMjmlNode;
  path: NodePath;
}

export default function RawHtmlInspector({ node, path }: Props) {
  const setContent = useContentSetter(path);
  const [local, onChange] = useDebouncedCommit(node.content ?? '', setContent);

  return (
    <>
      <FormSection title="HTML">
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Raw content</span>
          <textarea
            className={styles.textarea}
            value={local}
            onChange={(e) => onChange(e.target.value)}
            rows={10}
            spellCheck={false}
            placeholder="<p>Anything here is passed through verbatim</p>"
          />
          <span className={styles.fieldHint}>
            Merge tags like {`{{firstName}}`}, {`{%liquid%}`}, and {`%%=AMPscript=%%`}
            are preserved on export.
          </span>
        </label>
      </FormSection>

      <AdvancedPanel node={node} path={path} knownKeys={[]} />
    </>
  );
}
