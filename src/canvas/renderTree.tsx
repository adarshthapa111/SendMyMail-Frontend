import type { CSSProperties, MouseEvent } from 'react';
import type { IMjmlNode, NodePath } from '../tree/types';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectNode, setContent, setEditingTextNode, hoverNode } from '../store/slices/editorSlice';
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
    case 'mj-wrapper':
      return <WrapperFrame node={node} path={path} />;
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

/* feature-editor-premium-polish V1 — hover state + handlers.
   The hover toolbar shows actions BEFORE the user clicks (Mailchimp
   pattern). Selection still wins z-index when both could apply. */
function useIsHovered(id: string | undefined): boolean {
  const hoveredId = useAppSelector((s) => s.editor.hoveredId);
  return Boolean(id && hoveredId === id);
}

function useHoverHandlers(id: string | undefined) {
  const dispatch = useAppDispatch();
  return {
    onMouseEnter: (e: MouseEvent) => {
      e.stopPropagation();
      if (id) dispatch(hoverNode(id));
    },
    onMouseLeave: (e: MouseEvent) => {
      e.stopPropagation();
      if (id) dispatch(hoverNode(null));
    },
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
  const isHovered  = useIsHovered(node._id);
  const hoverHandlers = useHoverHandlers(node._id);
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
      onMouseEnter={hoverHandlers.onMouseEnter}
      onMouseLeave={hoverHandlers.onMouseLeave}
    >
      {isSelected && <SelectionToolbar path={path} />}
      {!isSelected && isHovered && <SelectionToolbar path={path} variant="hover" />}
      {node.children?.map((child, i) => (
        <RenderNode key={child._id ?? i} node={child} path={[...path, 'children', i]} />
      ))}
    </div>
  );
}

function ColumnFrame({ node, path }: { node: IMjmlNode; path: NodePath }) {
  const isSelected = useIsSelected(node._id);
  const isHovered  = useIsHovered(node._id);
  const hoverHandlers = useHoverHandlers(node._id);
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
      onMouseEnter={hoverHandlers.onMouseEnter}
      onMouseLeave={hoverHandlers.onMouseLeave}
    >
      {isSelected && <SelectionToolbar path={path} />}
      {!isSelected && isHovered && <SelectionToolbar path={path} variant="hover" />}
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
  const isHovered  = useIsHovered(node._id);
  const hoverHandlers = useHoverHandlers(node._id);
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
      onMouseEnter={hoverHandlers.onMouseEnter}
      onMouseLeave={hoverHandlers.onMouseLeave}
    >
      {isSelected && <SelectionToolbar path={path} />}
      {!isSelected && isHovered && <SelectionToolbar path={path} variant="hover" />}
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

/* mj-wrapper groups multiple sections under shared styles (background-color,
   padding, border-radius). Structurally it sits between mj-body and
   mj-section. Real-world MJML (EmailLove / mjml.io / Stripo) uses this
   constantly for full-width banners and visual grouping. Rendering: a
   styled, selectable container that contains its child sections vertically,
   with drop zones so sections can still be reordered/added inside. */
function WrapperFrame({ node, path }: { node: IMjmlNode; path: NodePath }) {
  const isSelected = useIsSelected(node._id);
  const isHovered  = useIsHovered(node._id);
  const hoverHandlers = useHoverHandlers(node._id);
  const onClick = useSelectHandler(node._id);
  const style: CSSProperties = {
    backgroundColor: String(node.attributes?.['background-color'] ?? 'transparent'),
    padding: String(node.attributes?.padding ?? '0'),
    borderRadius: String(node.attributes?.['border-radius'] ?? '0'),
    position: 'relative',
  };
  const children = node.children ?? [];
  return (
    <div
      style={style}
      className={`${styles.section} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      onMouseEnter={hoverHandlers.onMouseEnter}
      onMouseLeave={hoverHandlers.onMouseLeave}
    >
      {isSelected && <SelectionToolbar path={path} />}
      {!isSelected && isHovered && <SelectionToolbar path={path} variant="hover" />}
      {children.length === 0 ? (
        <DropZone parentPath={path} parentTag="mj-wrapper" index={0} large />
      ) : (
        <>
          <DropZone parentPath={path} parentTag="mj-wrapper" index={0} />
          {children.map((child, i) => (
            <div key={child._id ?? i}>
              <RenderNode node={child} path={[...path, 'children', i]} />
              <DropZone parentPath={path} parentTag="mj-wrapper" index={i + 1} />
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
  const isHovered  = useIsHovered(node._id);
  const hoverHandlers = useHoverHandlers(node._id);
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
      onMouseEnter={hoverHandlers.onMouseEnter}
      onMouseLeave={hoverHandlers.onMouseLeave}
      onDoubleClick={enterEdit}
    >
      {isSelected && !isEditing && <SelectionToolbar path={path} />}
      {!isSelected && !isEditing && isHovered && <SelectionToolbar path={path} variant="hover" />}
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
  const isHovered  = useIsHovered(node._id);
  const hoverHandlers = useHoverHandlers(node._id);
  const onClick = useSelectHandler(node._id);
  return (
    <div
      className={`${styles.imageWrap} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      onMouseEnter={hoverHandlers.onMouseEnter}
      onMouseLeave={hoverHandlers.onMouseLeave}
      style={{
        padding: String(node.attributes?.padding ?? '0'),
        textAlign: (node.attributes?.align as CSSProperties['textAlign']) ?? 'center',
      }}
    >
      {isSelected && <SelectionToolbar path={path} />}
      {!isSelected && isHovered && <SelectionToolbar path={path} variant="hover" />}
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
  const isHovered  = useIsHovered(node._id);
  const hoverHandlers = useHoverHandlers(node._id);
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
      onMouseEnter={hoverHandlers.onMouseEnter}
      onMouseLeave={hoverHandlers.onMouseLeave}
      onDoubleClick={enterEdit}
      style={{
        padding: String(node.attributes?.padding ?? '10px 25px'),
        textAlign: (node.attributes?.align as CSSProperties['textAlign']) ?? 'center',
      }}
    >
      {isSelected && !isEditing && <SelectionToolbar path={path} />}
      {!isSelected && !isEditing && isHovered && <SelectionToolbar path={path} variant="hover" />}
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
  const isHovered  = useIsHovered(node._id);
  const hoverHandlers = useHoverHandlers(node._id);
  const onClick = useSelectHandler(node._id);
  return (
    <div
      className={`${styles.dividerWrap} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      onMouseEnter={hoverHandlers.onMouseEnter}
      onMouseLeave={hoverHandlers.onMouseLeave}
      style={{ padding: String(node.attributes?.padding ?? '10px 25px') }}
    >
      {isSelected && <SelectionToolbar path={path} />}
      {!isSelected && isHovered && <SelectionToolbar path={path} variant="hover" />}
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
  const isHovered  = useIsHovered(node._id);
  const hoverHandlers = useHoverHandlers(node._id);
  const onClick = useSelectHandler(node._id);
  return (
    <div
      className={`${styles.spacer} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      onMouseEnter={hoverHandlers.onMouseEnter}
      onMouseLeave={hoverHandlers.onMouseLeave}
      style={{ height: String(node.attributes?.height ?? '20px') }}
    >
      {isSelected && <SelectionToolbar path={path} />}
      {!isSelected && isHovered && <SelectionToolbar path={path} variant="hover" />}
    </div>
  );
}

function SocialLeaf({ node, path }: { node: IMjmlNode; path: NodePath }) {
  const isSelected = useIsSelected(node._id);
  const isHovered  = useIsHovered(node._id);
  const hoverHandlers = useHoverHandlers(node._id);
  const onClick    = useSelectHandler(node._id);
  const mode       = String(node.attributes?.mode ?? 'horizontal');
  const iconSize   = String(node.attributes?.['icon-size'] ?? '32px');
  return (
    <div
      className={`${styles.socialWrap} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      onMouseEnter={hoverHandlers.onMouseEnter}
      onMouseLeave={hoverHandlers.onMouseLeave}
      style={{
        padding: String(node.attributes?.padding ?? '10px 25px'),
        textAlign: (node.attributes?.align as CSSProperties['textAlign']) ?? 'center',
      }}
    >
      {isSelected && <SelectionToolbar path={path} />}
      {!isSelected && isHovered && <SelectionToolbar path={path} variant="hover" />}
      <div
        style={{
          display: 'inline-flex',
          flexDirection: mode === 'vertical' ? 'column' : 'row',
          gap: '8px',
        }}
      >
        {node.children?.map((c, i) => (
          <SocialIconElement key={c._id ?? i} node={c} size={iconSize} />
        ))}
      </div>
    </div>
  );
}

/* Individual mj-social-element. Clickable so the user can select a single
   icon and edit it (icon image, network name, href, padding) via the
   dedicated SocialElementInspector. Renders <img> when src is set (always
   the case for fresh nodes — see blocks/social.ts), falls back to a letter
   chip otherwise so legacy / partial templates don't render as blanks.

   Padding model mirrors MJML's structural separation:
   - `padding` (outer wrapper span)  — space between this element and its
     siblings in the social row.
   - `icon-padding` (inner element)  — space around the icon inside the
     wrapper, useful for adding visual breathing room without affecting
     row alignment. */
function SocialIconElement({ node, size }: { node: IMjmlNode; size: string }) {
  const dispatch   = useAppDispatch();
  const isSelected = useIsSelected(node._id);
  const name       = String(node.attributes?.name ?? '?');
  const src        = node.attributes?.src as string | undefined;
  const padding    = node.attributes?.padding as string | undefined;
  const iconPad    = node.attributes?.['icon-padding'] as string | undefined;

  const onSelect = (e: MouseEvent) => {
    e.stopPropagation();
    if (node._id) dispatch(selectNode(node._id));
  };

  return (
    <span
      onClick={onSelect}
      style={{ display: 'inline-block', padding, cursor: 'pointer' }}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          title={name}
          className={`${styles.socialIconImg} ${isSelected ? styles.selected : ''}`}
          style={{
            width: size,
            height: size,
            padding: iconPad,
            boxSizing: 'content-box',
          }}
        />
      ) : (
        <span
          className={`${styles.socialIcon} ${isSelected ? styles.selected : ''}`}
          title={name}
          style={{ padding: iconPad }}
        >
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}

function NavbarLeaf({ node, path }: { node: IMjmlNode; path: NodePath }) {
  const dispatch  = useAppDispatch();
  const isSelected = useIsSelected(node._id);
  const isHovered  = useIsHovered(node._id);
  const hoverHandlers = useHoverHandlers(node._id);
  const editingId  = useAppSelector((s) => s.editor.editingTextId);
  const onSelect   = useSelectHandler(node._id);

  return (
    <div
      className={`${styles.navbarWrap} ${isSelected ? styles.selected : ''}`}
      onClick={onSelect}
      onMouseEnter={hoverHandlers.onMouseEnter}
      onMouseLeave={hoverHandlers.onMouseLeave}
      style={{ padding: String(node.attributes?.padding ?? '10px 25px') }}
    >
      {isSelected && <SelectionToolbar path={path} />}
      {!isSelected && isHovered && <SelectionToolbar path={path} variant="hover" />}
      <nav className={styles.navbar}>
        {node.children?.map((c, i) => {
          const linkPath  = [...path, 'children', i];
          const isEditing = editingId === c._id;
          const linkStyle: CSSProperties = {
            color: String(c.attributes?.color ?? '#333'),
            fontSize: String(c.attributes?.['font-size'] ?? '14px'),
            cursor: 'text',
          };

          if (isEditing) {
            return (
              <ContentEditable
                key={c._id ?? i}
                initialValue={c.content ?? ''}
                multiline={false}
                className={styles.navbarLink}
                style={linkStyle}
                onCommit={(text) => dispatch(setContent({ path: linkPath, content: text }))}
                onExit={() => dispatch(setEditingTextNode(null))}
              />
            );
          }

          return (
            <span
              key={c._id ?? i}
              className={styles.navbarLink}
              style={linkStyle}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (c._id) dispatch(setEditingTextNode(c._id));
              }}
            >
              {c.content ?? 'Link'}
            </span>
          );
        })}
      </nav>
    </div>
  );
}

function RawHtmlLeaf({ node, path }: { node: IMjmlNode; path: NodePath }) {
  const isSelected = useIsSelected(node._id);
  const isHovered  = useIsHovered(node._id);
  const hoverHandlers = useHoverHandlers(node._id);
  const onClick = useSelectHandler(node._id);
  return (
    <div
      className={`${styles.rawHtml} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      onMouseEnter={hoverHandlers.onMouseEnter}
      onMouseLeave={hoverHandlers.onMouseLeave}
    >
      {isSelected && <SelectionToolbar path={path} />}
      {!isSelected && isHovered && <SelectionToolbar path={path} variant="hover" />}
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
