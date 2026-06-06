import { useState, useRef, useEffect } from 'react';
import {
  IconConfetti, IconGift, IconNews, IconReceipt, IconShoppingCart,
  IconCake, IconCalendarEvent, IconHeartHandshake, IconMail,
  IconDots, IconPencil, IconCopy, IconArchive,
} from '@tabler/icons-react';
import type { TemplateSummary } from '../../lib/api/templates';
import styles from '@styles/components/templates/TemplateCard.module.scss';

interface Props {
  template: TemplateSummary;
  onOpen: (template: TemplateSummary) => void;
  onRename: (template: TemplateSummary) => void;
  onDuplicate: (template: TemplateSummary) => void;
  onArchive: (template: TemplateSummary) => void;
}

/**
 * Category → brand color (used for the soft tinted stage background
 * around the phone frame, the faux-preview header bar, and the hover
 * glow). New categories fall back to neutral primary.
 */
function brandFor(cat: string | null): { color: string; tint: string } {
  switch ((cat ?? '').toLowerCase().trim()) {
    case 'welcome':        return { color: '#3B82F6', tint: '#DBEAFE' };
    case 'promo':
    case 'promotion':      return { color: '#EF4444', tint: '#FEE2E2' };
    case 'newsletter':     return { color: '#10B981', tint: '#D1FAE5' };
    case 'transactional':  return { color: '#8B5CF6', tint: '#EDE9FE' };
    case 'cart':
    case 'abandoned cart': return { color: '#F59E0B', tint: '#FEF3C7' };
    case 'birthday':       return { color: '#EC4899', tint: '#FCE7F3' };
    case 'festive':
    case 'holiday':        return { color: '#F97316', tint: '#FFEDD5' };
    case 're-engagement':
    case 'win-back':       return { color: '#06B6D4', tint: '#CFFAFE' };
    default:               return { color: 'var(--color-primary)', tint: 'var(--color-surface)' };
  }
}

function CategoryIcon({ category, size = 18 }: { category: string | null; size?: number }) {
  switch ((category ?? '').toLowerCase().trim()) {
    case 'welcome':        return <IconConfetti       size={size} />;
    case 'promo':
    case 'promotion':      return <IconGift           size={size} />;
    case 'newsletter':     return <IconNews           size={size} />;
    case 'transactional':  return <IconReceipt        size={size} />;
    case 'cart':
    case 'abandoned cart': return <IconShoppingCart   size={size} />;
    case 'birthday':       return <IconCake           size={size} />;
    case 'festive':
    case 'holiday':        return <IconCalendarEvent  size={size} />;
    case 're-engagement':
    case 'win-back':       return <IconHeartHandshake size={size} />;
    default:               return <IconMail           size={size} />;
  }
}

function formatRelative(iso: string): string {
  const now  = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = Math.max(0, now - then);
  const mins   = Math.floor(diffMs / 60_000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14)  return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8)  return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * Template card — phone-frame product-showcase style.
 *
 * Architecture:
 *   ┌─ .card .....................................................┐
 *   │  ┌─ .stage (soft tinted background) ──────────────────────┐ │
 *   │  │   ┌─ .phone (iPhone bezel) ────────────────────┐      │ │
 *   │  │   │  ┌─ .notch ──┐                              │      │ │
 *   │  │   │  └────────────┘                              │      │ │
 *   │  │   │  ┌─ .screen ─────────────────────────────┐  │      │ │
 *   │  │   │  │  <img> or <FauxPreview/>              │  │      │ │
 *   │  │   │  └─────────────────────────────────────────┘  │      │ │
 *   │  │   │  ┌─ .homebar ─┐                              │      │ │
 *   │  │   │  └────────────┘                              │      │ │
 *   │  │   └────────────────────────────────────────────────┘      │ │
 *   │  └──────────────────────────────────────────────────────────┘ │
 *   │  ┌─ .meta ─────────────────────────────────────────────────┐ │
 *   │  │  name + category + relative time + starter pill          │ │
 *   │  └──────────────────────────────────────────────────────────┘ │
 *   └─────────────────────────────────────────────────────────────────┘
 *
 * Hover: phone tilts via 3D transform, multi-layer shadow grows, stage
 * background warms with brand tint.
 */
export function TemplateCard({ template, onOpen, onRename, onDuplicate, onArchive }: Props) {
  const brand = brandFor(template.category);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  function stopAndRun(fn: () => void) {
    return (e: React.MouseEvent) => {
      e.stopPropagation();
      setMenuOpen(false);
      fn();
    };
  }

  const previewBlocks = previewBlocksFor(template.category);

  return (
    <div
      className={styles.card}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(template)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(template); } }}
      style={{ ['--brand' as string]: brand.color, ['--brand-tint' as string]: brand.tint }}
    >
      {/* Phone "stage" — soft warm background the phone floats on */}
      <div className={styles.stage}>
        <div className={styles.phone}>
          {/* Dynamic island */}
          <span className={styles.notch} aria-hidden="true" />

          {/* Screen — contains the email preview / thumbnail */}
          <div className={styles.screen}>
            {template.thumbnailUrl ? (
              <img
                src={template.thumbnailUrl}
                alt=""
                className={styles.screenImg}
                loading="lazy"
              />
            ) : (
              <div className={styles.fauxPreview}>
                <div className={styles.previewBar}>
                  <span className={styles.previewLogo} aria-hidden="true">
                    <CategoryIcon category={template.category} size={9} />
                  </span>
                  <span className={styles.previewBarLabel}>
                    {template.category ?? 'Email'}
                  </span>
                </div>
                <div className={styles.previewBody}>
                  {previewBlocks.map((kind, i) => (
                    <PreviewStrip key={i} kind={kind} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Home bar */}
          <span className={styles.homebar} aria-hidden="true" />
        </div>
      </div>

      {/* Footer — name + category + meta + optional starter pill */}
      <div className={styles.meta}>
        <div className={styles.metaTitle}>
          <b className={styles.name} title={template.name}>{template.name}</b>
          {template.isStarter && (
            <span className={styles.starterPill}>Starter</span>
          )}
        </div>
        <div className={styles.metaSub}>
          <span className={styles.categoryDot} aria-hidden="true" />
          <span className={styles.categoryLabel}>{template.category ?? 'Email'}</span>
          <span className={styles.metaSep}>·</span>
          <span>Edited {formatRelative(template.updatedAt)}</span>
        </div>
      </div>

      <div className={styles.menuWrap} ref={menuRef}>
        <button
          type="button"
          className={styles.kebab}
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
          aria-label="More actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <IconDots size={16} />
        </button>
        {menuOpen ? (
          <div className={styles.menu} role="menu">
            <button type="button" className={styles.menuItem} onClick={stopAndRun(() => onRename(template))}>
              <IconPencil size={14} /> Rename
            </button>
            <button type="button" className={styles.menuItem} onClick={stopAndRun(() => onDuplicate(template))}>
              <IconCopy size={14} /> Duplicate
            </button>
            <button
              type="button"
              className={`${styles.menuItem} ${styles.menuItemDanger}`}
              onClick={stopAndRun(() => onArchive(template))}
            >
              <IconArchive size={14} /> Archive
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type StripKind = 'h' | 'p' | 'pShort' | 'b' | 'i' | 'spacer';

function previewBlocksFor(category: string | null): StripKind[] {
  switch ((category ?? '').toLowerCase().trim()) {
    case 'welcome':        return ['i', 'h', 'p', 'p', 'pShort', 'b'];
    case 'promo':
    case 'promotion':      return ['h', 'p', 'i', 'b'];
    case 'newsletter':     return ['h', 'p', 'p', 'pShort', 'h', 'p'];
    case 'transactional':  return ['h', 'p', 'pShort', 'i', 'p', 'b'];
    case 'cart':
    case 'abandoned cart': return ['h', 'i', 'p', 'b'];
    case 'birthday':       return ['i', 'h', 'p', 'b'];
    case 'festive':
    case 'holiday':        return ['i', 'h', 'p', 'pShort', 'b'];
    case 're-engagement':
    case 'win-back':       return ['h', 'p', 'pShort', 'b'];
    default:               return ['h', 'p', 'p', 'pShort', 'b'];
  }
}

function PreviewStrip({ kind }: { kind: StripKind }) {
  const cls =
    kind === 'h'      ? `${styles.strip} ${styles.stripHeader}` :
    kind === 'p'      ? `${styles.strip} ${styles.stripParagraph}` :
    kind === 'pShort' ? `${styles.strip} ${styles.stripParagraphShort}` :
    kind === 'b'      ? `${styles.strip} ${styles.stripButton}` :
    kind === 'i'      ? `${styles.strip} ${styles.stripImage}` :
                        `${styles.strip} ${styles.stripSpacer}`;
  return <div className={cls} aria-hidden="true" />;
}
