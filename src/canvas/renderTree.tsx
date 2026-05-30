import type { CSSProperties, MouseEvent } from 'react';
import type { IMjmlNode, NodePath } from '../tree/types';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectNode, setContent, setEditingTextNode } from '../store/slices/editorSlice';
import DropZone from './DropZone';
import SelectionToolbar from './SelectionToolbar';
import ContentEditable from './ContentEditable';
import styles from '@styles/canvas/renderTree.module.css';

/**
 * Recursive React renderer for the canvas. Walks the IMjmlNode tree and
 * produces editable, selectable DOM. NOT a preview of the final email —
 * just an editing approximation. The iframe preview is the source of truth.
 *
 * Drop zones are rendered between/around children in containers that accept
 * drops (mj-body, mj-column, mj-hero). See blocks/categories.ts for accept rules.
 *
 * SelectionToolbar is rendered inside every selectable frame when isSelected,
 * absolutely positioned at top:-34px. Frames must therefore be position: relative.
 */
export function RenderNode({ node, path }: { node: IMjmlNode; path: NodePath }) {
  switch (node.tagName) {
    case 'mjml':
      return (
        <>
          {node.children?.map((child, i) => (
            <RenderNode key={child._id ?? i} node={child} path={[...path, 'children', i]} />
          ))}
        </>
      );

    case 'mj-head':
      return null;

    case 'mj-body':
      return <BodyFrame node={node} path={path} />;
    case 'mj-section':
      return <SectionFrame node={node} path={path} />;
    case 'mj-column':
      return <ColumnFrame node={node} path={path} />;
    case 'mj-hero':
      return <HeroFrame node={node} path={path} />;

    case 'mj-text':
      return <TextLeaf node={node} path={path} />;
    case 'mj-image':
      return <ImageLeaf node={node} path={path} />;
    case 'mj-button':
      return <ButtonLeaf node={node} path={path} />;
    case 'mj-divider':
      return <DividerLeaf node={node} path={path} />;
    case 'mj-spacer':
      return <SpacerLeaf node={node} path={path} />;
    case 'mj-social':
      return <SocialLeaf node={node} path={path} />;
    case 'mj-navbar':
      return <NavbarLeaf node={node} path={path} />;
    case 'mj-raw':
      return <RawHtmlLeaf node={node} path={path} />;

    default:
      return <UnknownLeaf node={node} path={path} />;
  }
}

/* ────────────────────────────────────────────────────────────────────
 * Selection plumbing — every selectable frame uses these.
 * ──────────────────────────────────────────────────────────────────── */

function useIsSelected(id: string | undefined): boolean {
  const selectedId = useAppSelector((s) => s.editor.selectedId);
  return Boolean(id && selectedId === id);
}

function useSelectHandler(id: string | undefined) {
  const dispatch = useAppDispatch();
  return (e: MouseEvent) => {
    e.stopPropagation();
    if (id) dispatch(selectNode(id));
  };
}

/* ────────────────────────────────────────────────────────────────────
 * Containers
 * ──────────────────────────────────────────────────────────────────── */

function BodyFrame({ node, path }: { node: IMjmlNode; path: NodePath }) {
  const style: CSSProperties = {
    backgroundColor: String(node.attributes?.['background-color'] ?? '#ffffff'),
    width: String(node.attributes?.width ?? '600px'),
    maxWidth: '100%',
    margin: '0 auto',
    minHeight: '200px',
  };
  const children = node.children ?? [];

  if (children.length === 0) {
    return (
      <div style={style} className={styles.body}>
        <DropZone parentPath={path} parentTag="mj-body" index={0} large />
      </div>
    );
  }

  return (
    <div style={style} className={styles.body}>
      <DropZone parentPath={path} parentTag="mj-body" index={0} />
      {children.map((child, i) => (
        <div key={child._id ?? i}>
          <RenderNode node={child} path={[...path, 'children', i]} />
          <DropZone parentPath={path} parentTag="mj-body" index={i + 1} />
        </div>
      ))}
    </div>
  );
}

function SectionFrame({ node, path }: { node: IMjmlNode; path: NodePath }) {
  const isSelected = useIsSelected(node._id);
  const onClick = useSelectHandler(node._id);
  const style: CSSProperties = {
    backgroundColor: String(node.attributes?.['background-color'] ?? 'transparent'),
    padding: String(node.attributes?.padding ?? '20px 0'),
    display: 'flex',
    flexDirection: 'row',
    position: 'relative',
  };
  return (
    <div
      style={style}
      className={`${styles.section} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
    >
      {isSelected && <SelectionToolbar path={path} />}
      {node.children?.map((child, i) => (
        <RenderNode key={child._id ?? i} node={child} path={[...path, 'children', i]} />
      ))}
    </div>
  );
}

function ColumnFrame({ node, path }: { node: IMjmlNode; path: NodePath }) {
  const isSelected = useIsSelected(node._id);
  const onClick = useSelectHandler(node._id);
  const width = String(node.attributes?.width ?? '100%');
  const style: CSSProperties = {
    flex: width.endsWith('%') ? `0 0 ${width}` : undefined,
    width: width.endsWith('%') ? undefined : width,
    minWidth: 0,
    position: 'relative',
  };
  const children = node.children ?? [];
  return (
    <div
      style={style}
      className={`${styles.column} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
    >
      {isSelected && <SelectionToolbar path={path} />}
      {children.length === 0 ? (
        <DropZone parentPath={path} parentTag="mj-column" index={0} large />
      ) : (
        <>
          <DropZone parentPath={path} parentTag="mj-column" index={0} />
          {children.map((child, i) => (
            <div key={child._id ?? i}>
              <RenderNode node={child} path={[...path, 'children', i]} />
              <DropZone parentPath={path} parentTag="mj-column" index={i + 1} />
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function HeroFrame({ node, path }: { node: IMjmlNode; path: NodePath }) {
  const isSelected = useIsSelected(node._id);
  const onClick = useSelectHandler(node._id);
  const bgUrl = node.attributes?.['background-url'];
  const style: CSSProperties = {
    backgroundColor: String(node.attributes?.['background-color'] ?? '#1a73e8'),
    backgroundImage: bgUrl ? `url(${String(bgUrl)})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    minHeight: String(node.attributes?.height ?? '300px'),
    padding: String(node.attributes?.padding ?? '40px 30px'),
    display: 'flex',
    flexDirection: 'column',
    justifyContent:
      String(node.attributes?.['vertical-align'] ?? 'middle') === 'middle'
        ? 'center'
        : node.attributes?.['vertical-align'] === 'top'
        ? 'flex-start'
        : 'flex-end',
    position: 'relative',
  };
  const children = node.children ?? [];
  return (
    <div
      style={style}
      className={`${styles.hero} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
    >
      {isSelected && <SelectionToolbar path={path} />}
      {children.length === 0 ? (
        <DropZone parentPath={path} parentTag="mj-hero" index={0} large />
      ) : (
        <>
          <DropZone parentPath={path} parentTag="mj-hero" index={0} />
          {children.map((child, i) => (
            <div key={child._id ?? i}>
              <RenderNode node={child} path={[...path, 'children', i]} />
              <DropZone parentPath={path} parentTag="mj-hero" index={i + 1} />
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Leaves
 * ──────────────────────────────────────────────────────────────────── */

function TextLeaf({ node, path }: { node: IMjmlNode; path: NodePath }) {
  const dispatch = useAppDispatch();
  const isSelected = useIsSelected(node._id);
  const isEditing = useAppSelector((s) => s.editor.editingTextId === node._id);
  const onSelectClick = useSelectHandler(node._id);

  const style: CSSProperties = {
    fontSize: String(node.attributes?.['font-size'] ?? '14px'),
    lineHeight: String(node.attributes?.['line-height'] ?? '1.6'),
    color: String(node.attributes?.color ?? '#333'),
    padding: String(node.attributes?.padding ?? '10px 25px'),
    fontFamily: String(node.attributes?.['font-family'] ?? 'Arial, sans-serif'),
    textAlign: (node.attributes?.align as CSSProperties['textAlign']) ?? undefined,
    fontWeight: node.attributes?.['font-weight'] as CSSProperties['fontWeight'],
  };

  const enterEdit = (e: MouseEvent) => {
    e.stopPropagation();
    if (node._id) dispatch(setEditingTextNode(node._id));
  };

  // Single click on already-selected text → enter edit mode (same as double-click).
  const onClick = (e: MouseEvent) => {
    if (isSelected && !isEditing && node._id) {
      e.stopPropagation();
      dispatch(setEditingTextNode(node._id));
      return;
    }
    onSelectClick(e);
  };

  return (
    <div
      style={style}
      className={`${styles.text} ${isSelected ? styles.selected : ''} ${isEditing ? styles.editing : ''}`}
      onClick={onClick}
      onDoubleClick={enterEdit}
    >
      {isSelected && !isEditing && <SelectionToolbar path={path} />}
      {isEditing ? (
        <ContentEditable
          initialValue={node.content ?? ''}
          multiline
          onCommit={(html) => dispatch(setContent({ path, content: html }))}
          onExit={() => dispatch(setEditingTextNode(null))}
        />
      ) : (
        <div dangerouslySetInnerHTML={{ __html: node.content ?? '' }} />
      )}
    </div>
  );
}

function ImageLeaf({ node, path }: { node: IMjmlNode; path: NodePath }) {
  const isSelected = useIsSelected(node._id);
  const onClick = useSelectHandler(node._id);
  return (
    <div
      className={`${styles.imageWrap} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      style={{
        padding: String(node.attributes?.padding ?? '0'),
        textAlign: (node.attributes?.align as CSSProperties['textAlign']) ?? 'center',
      }}
    >
      {isSelected && <SelectionToolbar path={path} />}
      <img
        src={String(node.attributes?.src ?? '')}
        alt={String(node.attributes?.alt ?? '')}
        style={{
          width: String(node.attributes?.width ?? '100%'),
          maxWidth: '100%',
          display: 'inline-block',
        }}
      />
    </div>
  );
}

function ButtonLeaf({ node, path }: { node: IMjmlNode; path: NodePath }) {
  const dispatch = useAppDispatch();
  const isSelected = useIsSelected(node._id);
  const isEditing = useAppSelector((s) => s.editor.editingTextId === node._id);
  const onSelectClick = useSelectHandler(node._id);

  const enterEdit = (e: MouseEvent) => {
    e.stopPropagation();
    if (node._id) dispatch(setEditingTextNode(node._id));
  };

  const onClick = (e: MouseEvent) => {
    if (isSelected && !isEditing && node._id) {
      e.stopPropagation();
      dispatch(setEditingTextNode(node._id));
      return;
    }
    onSelectClick(e);
  };

  const buttonStyle: CSSProperties = {
    backgroundColor: String(node.attributes?.['background-color'] ?? '#1a73e8'),
    color: String(node.attributes?.color ?? '#ffffff'),
    fontSize: String(node.attributes?.['font-size'] ?? '16px'),
    fontWeight: node.attributes?.['font-weight'] as CSSProperties['fontWeight'],
    borderRadius: String(node.attributes?.['border-radius'] ?? '4px'),
    padding: String(node.attributes?.['inner-padding'] ?? '12px 32px'),
    display: 'inline-block',
  };

  return (
    <div
      className={`${styles.buttonWrap} ${isSelected ? styles.selected : ''} ${isEditing ? styles.editing : ''}`}
      onClick={onClick}
      onDoubleClick={enterEdit}
      style={{
        padding: String(node.attributes?.padding ?? '10px 25px'),
        textAlign: (node.attributes?.align as CSSProperties['textAlign']) ?? 'center',
      }}
    >
      {isSelected && !isEditing && <SelectionToolbar path={path} />}
      {isEditing ? (
        <ContentEditable
          initialValue={node.content ?? 'Button'}
          multiline={false}
          onCommit={(text) => dispatch(setContent({ path, content: text }))}
          onExit={() => dispatch(setEditingTextNode(null))}
          className={styles.button}
          style={buttonStyle}
        />
      ) : (
        <span className={styles.button} style={buttonStyle}>
          {node.content ?? 'Button'}
        </span>
      )}
    </div>
  );
}

function DividerLeaf({ node, path }: { node: IMjmlNode; path: NodePath }) {
  const isSelected = useIsSelected(node._id);
  const onClick = useSelectHandler(node._id);
  return (
    <div
      className={`${styles.dividerWrap} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      style={{ padding: String(node.attributes?.padding ?? '10px 25px') }}
    >
      {isSelected && <SelectionToolbar path={path} />}
      <hr
        style={{
          border: 'none',
          borderTopWidth: String(node.attributes?.['border-width'] ?? '1px'),
          borderTopStyle:
            (node.attributes?.['border-style'] as CSSProperties['borderTopStyle']) ?? 'solid',
          borderTopColor: String(node.attributes?.['border-color'] ?? '#dddddd'),
          margin: 0,
          width: String(node.attributes?.width ?? '100%'),
        }}
      />
    </div>
  );
}

function SpacerLeaf({ node, path }: { node: IMjmlNode; path: NodePath }) {
  const isSelected = useIsSelected(node._id);
  const onClick = useSelectHandler(node._id);
  return (
    <div
      className={`${styles.spacer} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      style={{ height: String(node.attributes?.height ?? '20px') }}
    >
      {isSelected && <SelectionToolbar path={path} />}
    </div>
  );
}

function SocialLeaf({ node, path }: { node: IMjmlNode; path: NodePath }) {
  const isSelected = useIsSelected(node._id);
  const onClick = useSelectHandler(node._id);
  const mode = String(node.attributes?.mode ?? 'horizontal');
  return (
    <div
      className={`${styles.socialWrap} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      style={{
        padding: String(node.attributes?.padding ?? '10px 25px'),
        textAlign: (node.attributes?.align as CSSProperties['textAlign']) ?? 'center',
      }}
    >
      {isSelected && <SelectionToolbar path={path} />}
      <div
        style={{
          display: 'inline-flex',
          flexDirection: mode === 'vertical' ? 'column' : 'row',
          gap: '8px',
        }}
      >
        {node.children?.map((c, i) => {
          const name = String(c.attributes?.name ?? '?');
          const initial = name.charAt(0).toUpperCase();
          return (
            <span key={c._id ?? i} className={styles.socialIcon} title={name}>
              {initial}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function NavbarLeaf({ node, path }: { node: IMjmlNode; path: NodePath }) {
  const isSelected = useIsSelected(node._id);
  const onClick = useSelectHandler(node._id);
  return (
    <div
      className={`${styles.navbarWrap} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      style={{ padding: String(node.attributes?.padding ?? '10px 25px') }}
    >
      {isSelected && <SelectionToolbar path={path} />}
      <nav className={styles.navbar}>
        {node.children?.map((c, i) => (
          <span
            key={c._id ?? i}
            className={styles.navbarLink}
            style={{
              color: String(c.attributes?.color ?? '#333'),
              fontSize: String(c.attributes?.['font-size'] ?? '14px'),
            }}
          >
            {c.content ?? 'Link'}
          </span>
        ))}
      </nav>
    </div>
  );
}

function RawHtmlLeaf({ node, path }: { node: IMjmlNode; path: NodePath }) {
  const isSelected = useIsSelected(node._id);
  const onClick = useSelectHandler(node._id);
  return (
    <div className={`${styles.rawHtml} ${isSelected ? styles.selected : ''}`} onClick={onClick}>
      {isSelected && <SelectionToolbar path={path} />}
      <div className={styles.rawHtmlLabel}>Raw HTML</div>
      <code className={styles.rawHtmlSnippet}>
        {(node.content ?? '').slice(0, 120)}
        {(node.content?.length ?? 0) > 120 ? '…' : ''}
      </code>
    </div>
  );
}

function UnknownLeaf({ node }: { node: IMjmlNode; path: NodePath }) {
  return (
    <div className={styles.unknown}>
      Unsupported block: <code>{node.tagName}</code>
    </div>
  );
}
