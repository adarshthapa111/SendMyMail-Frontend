import type { CSSProperties, ReactNode } from 'react';
import type { IMjmlNode } from '../../tree/types';
import styles from '@styles/components/palette/SectionPreview.module.scss';

/* feature-section-library V1 — pure presentational mini-renderer.

   Walks an IMjmlNode subtree and renders a CSS approximation of the
   email at BASE_W (600px, the email canvas width), then scales the
   whole thing down with transform:scale() to fit the flyout card.
   Display only: no hooks, no dnd, no selection, no editing. It exists
   so the flyout can show "what you'll get" instead of an icon.

   Deliberately approximate — the same philosophy as canvas/renderTree:
   close enough to recognize, not a compile. Unknown tags render as a
   gray bar so a future composite never renders as nothing. */

const BASE_W = 600;

type Attrs = NonNullable<IMjmlNode['attributes']>;

/** Read an attribute as a string ('' / undefined → undefined). */
function attr(a: Attrs, key: string): string | undefined {
  const v = a[key];
  if (v === undefined || v === '') return undefined;
  return String(v);
}

function styleFromAttrs(a: Attrs): CSSProperties {
  const s: CSSProperties = {};
  const g = (k: string) => attr(a, k);
  if (g('background-color')) s.background = g('background-color');
  if (g('padding'))          s.padding = g('padding');
  if (g('color'))            s.color = g('color');
  if (g('font-size'))        s.fontSize = g('font-size');
  if (g('font-weight'))      s.fontWeight = g('font-weight') as CSSProperties['fontWeight'];
  if (g('font-family'))      s.fontFamily = g('font-family');
  if (g('line-height'))      s.lineHeight = g('line-height');
  if (g('letter-spacing'))   s.letterSpacing = g('letter-spacing');
  if (g('text-align') || g('align')) s.textAlign = (g('text-align') ?? g('align')) as CSSProperties['textAlign'];
  if (g('border-radius'))    s.borderRadius = g('border-radius');
  return s;
}

function PreviewNode({ node, siblingCount = 1 }: { node: IMjmlNode; siblingCount?: number }): ReactNode {
  const a = node.attributes ?? {};
  const children = node.children ?? [];

  switch (node.tagName) {
    case 'mj-section': {
      return (
        <div style={{ ...styleFromAttrs(a), display: 'flex', alignItems: 'stretch' }}>
          {children.map((c, i) => (
            <PreviewNode key={c._id ?? i} node={c} siblingCount={children.length} />
          ))}
        </div>
      );
    }
    case 'mj-column': {
      // Width default mirrors MJML: columns without a width split the
      // section equally among SIBLING columns (not their own children).
      const width = a.width ?? `${100 / Math.max(1, siblingCount)}%`;
      const vAlign = a['vertical-align'];
      return (
        <div
          style={{
            ...styleFromAttrs(a),
            flex: `0 0 ${width}`,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: vAlign === 'middle' ? 'center' : 'flex-start',
          }}
        >
          {children.map((c, i) => <PreviewNode key={c._id ?? i} node={c} />)}
        </div>
      );
    }
    case 'mj-hero': {
      return (
        <div
          style={{
            ...styleFromAttrs(a),
            minHeight: a.height ? `calc(${a.height} * 0.6)` : undefined,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {children.map((c, i) => <PreviewNode key={c._id ?? i} node={c} />)}
        </div>
      );
    }
    case 'mj-text': {
      return (
        <div
          style={styleFromAttrs(a)}
          // Factory-authored content only — never user input — so this is safe.
          dangerouslySetInnerHTML={{ __html: node.content ?? '' }}
        />
      );
    }
    case 'mj-button': {
      const align = (attr(a, 'align') ?? 'center') as CSSProperties['textAlign'];
      return (
        <div style={{ textAlign: align, padding: attr(a, 'padding') ?? '8px 0 0' }}>
          <span
            style={{
              display: 'inline-block',
              background: attr(a, 'background-color') ?? '#111827',
              color: attr(a, 'color') ?? '#ffffff',
              fontSize: attr(a, 'font-size') ?? '14px',
              fontWeight: 600,
              fontFamily: attr(a, 'font-family'),
              borderRadius: attr(a, 'border-radius') ?? '6px',
              padding: attr(a, 'inner-padding') ?? '12px 28px',
            }}
          >
            {node.content}
          </span>
        </div>
      );
    }
    case 'mj-image': {
      return (
        <div style={{ padding: attr(a, 'padding') ?? 0 }}>
          <img
            src={attr(a, 'src')}
            alt=""
            style={{ width: '100%', display: 'block', borderRadius: attr(a, 'border-radius') }}
          />
        </div>
      );
    }
    case 'mj-divider': {
      return (
        <div style={{ padding: a.padding ?? '12px 0' }}>
          <hr
            style={{
              border: 'none',
              borderTop: `${a['border-width'] ?? '1px'} solid ${a['border-color'] ?? '#E5E7EB'}`,
              margin: 0,
            }}
          />
        </div>
      );
    }
    case 'mj-spacer': {
      return <div style={{ height: a.height ?? '20px' }} />;
    }
    case 'mj-social': {
      return (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: a.padding ?? '8px 0' }}>
          {(children.length ? children : [0, 1, 2]).map((_, i) => (
            <span key={i} className={styles.socialDot} />
          ))}
        </div>
      );
    }
    case 'mj-navbar': {
      return (
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: 13, color: '#6B7280' }}>
          {children.map((c, i) => <span key={c._id ?? i}>{c.content ?? 'Link'}</span>)}
        </div>
      );
    }
    default:
      return <div className={styles.unknownBar} />;
  }
}

interface Props {
  node: IMjmlNode;
  /** Rendered card width in px (the 600px base is scaled to this). */
  width: number;
}

export default function SectionPreview({ node, width }: Props) {
  const scale = width / BASE_W;
  return (
    <div className={styles.clip} style={{ width }}>
      {/* `zoom` (not transform:scale) so the layout box shrinks with the
          content — otherwise every card reserves the unscaled height.
          Baseline-supported in all evergreen browsers since 2024. */}
      <div
        className={styles.stage}
        style={{ width: BASE_W, zoom: scale }}
        aria-hidden="true"
      >
        <PreviewNode node={node} />
      </div>
    </div>
  );
}
