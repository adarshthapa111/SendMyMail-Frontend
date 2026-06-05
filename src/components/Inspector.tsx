import type { IMjmlNode, NodePath } from '../tree/types';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectSelectedNode } from '../store/selectors';
import { deleteBlock } from '../store/slices/editorSlice';
import TextInspector from './inspector/TextInspector';
import ButtonInspector from './inspector/ButtonInspector';
import ImageInspector from './inspector/ImageInspector';
import DividerInspector from './inspector/DividerInspector';
import SpacerInspector from './inspector/SpacerInspector';
import SectionInspector from './inspector/SectionInspector';
import ColumnInspector from './inspector/ColumnInspector';
import HeroInspector from './inspector/HeroInspector';
import SocialInspector from './inspector/SocialInspector';
import SocialElementInspector from './inspector/SocialElementInspector';
import NavbarInspector from './inspector/NavbarInspector';
import RawHtmlInspector from './inspector/RawHtmlInspector';
import AdvancedPanel from './inspector/AdvancedPanel';
import styles from '@styles/components/Inspector.module.css';

const LABELS: Record<string, string> = {
  'mj-text': 'Text',
  'mj-button': 'Button',
  'mj-image': 'Image',
  'mj-divider': 'Divider',
  'mj-spacer': 'Spacer',
  'mj-section': 'Section',
  'mj-column': 'Column',
  'mj-hero': 'Hero',
  'mj-social': 'Social',
  'mj-social-element': 'Social Icon',
  'mj-navbar': 'Navbar',
  'mj-raw': 'Raw HTML',
};

function FormForNode({ node, path }: { node: IMjmlNode; path: NodePath }) {
  switch (node.tagName) {
    case 'mj-text':
      return <TextInspector node={node} path={path} />;
    case 'mj-button':
      return <ButtonInspector node={node} path={path} />;
    case 'mj-image':
      return <ImageInspector node={node} path={path} />;
    case 'mj-divider':
      return <DividerInspector node={node} path={path} />;
    case 'mj-spacer':
      return <SpacerInspector node={node} path={path} />;
    case 'mj-section':
      return <SectionInspector node={node} path={path} />;
    case 'mj-column':
      return <ColumnInspector node={node} path={path} />;
    case 'mj-hero':
      return <HeroInspector node={node} path={path} />;
    case 'mj-social':
      return <SocialInspector node={node} path={path} />;
    case 'mj-social-element':
      return <SocialElementInspector node={node} path={path} />;
    case 'mj-navbar':
      return <NavbarInspector node={node} path={path} />;
    case 'mj-raw':
      return <RawHtmlInspector node={node} path={path} />;
    default:
      // Fallback: just show the Advanced raw-attribute editor.
      return (
        <div className={styles.fallback}>
          <p>No dedicated form for <code>{node.tagName}</code>.</p>
          <AdvancedPanel node={node} path={path} knownKeys={[]} />
        </div>
      );
  }
}

export default function Inspector() {
  const dispatch = useAppDispatch();
  const selection = useAppSelector(selectSelectedNode);

  if (!selection) {
    return (
      <aside className={styles.inspector}>
        <div className={styles.header}>
          <span>Properties</span>
        </div>
        <div className={styles.placeholder}>Select a block to edit its properties.</div>
      </aside>
    );
  }

  const { node, path } = selection;
  const label = LABELS[node.tagName] ?? node.tagName;

  return (
    <aside className={styles.inspector}>
      <div className={styles.header}>
        <span>{label}</span>
        <button
          type="button"
          className={styles.deleteBtn}
          onClick={() => dispatch(deleteBlock({ path }))}
          title="Delete block (Del)"
        >
          Delete
        </button>
      </div>
      <div className={styles.scroll}>
        <FormForNode node={node} path={path} />
      </div>
    </aside>
  );
}
