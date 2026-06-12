import type { ReactNode } from 'react';
import {
  IconTypography, IconRectangle, IconPhoto, IconMinus, IconArrowsVertical,
  IconLayoutColumns, IconLayoutGrid, IconStar, IconBrandFacebook,
  IconLayoutNavbar, IconCode, IconCursorText, IconClick, IconTrash,
  IconPointer,
} from '@tabler/icons-react';
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

/* feature-editor-premium-polish V1 — block icon for the inspector
   header. Matches the palette's icon vocabulary so block identity is
   consistent across surfaces. */
function blockIconFor(tagName: string): ReactNode {
  switch (tagName) {
    case 'mj-text':           return <IconCursorText  size={15} stroke={1.7} />;
    case 'mj-button':         return <IconClick       size={15} stroke={1.7} />;
    case 'mj-image':          return <IconPhoto       size={15} stroke={1.7} />;
    case 'mj-divider':        return <IconMinus       size={15} stroke={2}   />;
    case 'mj-spacer':         return <IconArrowsVertical size={15} stroke={1.7} />;
    case 'mj-section':        return <IconLayoutGrid  size={15} stroke={1.7} />;
    case 'mj-column':         return <IconLayoutColumns size={15} stroke={1.7} />;
    case 'mj-hero':           return <IconRectangle   size={15} stroke={1.7} />;
    case 'mj-social':         return <IconBrandFacebook size={15} stroke={1.7} />;
    case 'mj-social-element': return <IconStar        size={15} stroke={1.7} />;
    case 'mj-navbar':         return <IconLayoutNavbar size={15} stroke={1.7} />;
    case 'mj-raw':            return <IconCode        size={15} stroke={1.7} />;
    default:                  return <IconTypography  size={15} stroke={1.7} />;
  }
}

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

  /* feature-editor-premium-polish V1 — Friendly empty state with an
     icon + helper text instead of a bare "select a block" line. */
  if (!selection) {
    return (
      <aside className={styles.inspector}>
        <div className={styles.header}>
          <span className={styles.headerTitle}>Properties</span>
        </div>
        <div className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden="true">
            <IconPointer size={28} stroke={1.4} />
          </span>
          <div className={styles.emptyTitle}>Nothing selected</div>
          <div className={styles.emptyHint}>
            Click any block on the canvas to edit its properties here.
          </div>
        </div>
      </aside>
    );
  }

  const { node, path } = selection;
  const label = LABELS[node.tagName] ?? node.tagName;

  /* feature-editor-premium-polish V1 — header redesigned with block
     icon + name; Delete button moved to the bottom footer so it stops
     competing with property edits for attention. */
  return (
    <aside className={styles.inspector} key={node._id /* slide-in on selection change */}>
      <div className={styles.header}>
        <span className={styles.headerIcon} aria-hidden="true">
          {blockIconFor(node.tagName)}
        </span>
        <span className={styles.headerTitle}>{label}</span>
        <span className={styles.headerTag} title={node.tagName}>{node.tagName}</span>
      </div>
      <div className={styles.scroll}>
        <FormForNode node={node} path={path} />
      </div>
      <div className={styles.footer}>
        <button
          type="button"
          className={styles.deleteBtn}
          onClick={() => dispatch(deleteBlock({ path }))}
          title="Delete this block (Del)"
        >
          <IconTrash size={14} stroke={1.7} />
          Delete block
        </button>
      </div>
    </aside>
  );
}
