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

/* Map free-text category to a Tabler icon. New categories fall back to a
   plain mail icon — list of options matches the datalist in
   TemplateFormDialog so users picking common categories get the right glyph. */
function iconForCategory(cat: string | null) {
  switch ((cat ?? '').toLowerCase().trim()) {
    case 'welcome':        return IconConfetti;
    case 'promo':
    case 'promotion':      return IconGift;
    case 'newsletter':     return IconNews;
    case 'transactional':  return IconReceipt;
    case 'cart':
    case 'abandoned cart': return IconShoppingCart;
    case 'birthday':       return IconCake;
    case 'festive':
    case 'holiday':        return IconCalendarEvent;
    case 're-engagement':
    case 'win-back':       return IconHeartHandshake;
    default:               return IconMail;
  }
}

function formatRelative(iso: string): string {
  const now  = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = Math.max(0, now - then);
  const mins   = Math.floor(diffMs / 60_000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 14)  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8)  return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  return new Date(iso).toLocaleDateString();
}

export function TemplateCard({ template, onOpen, onRename, onDuplicate, onArchive }: Props) {
  // Note: react/no-jsx-as-prop / "creating components during render" lints
  // flag local `Icon = iconForCategory(...)` assignment. We pre-resolve to a
  // function call instead and render the JSX inline below.
  const renderIcon = () => {
    const IconCmp = iconForCategory(template.category);
    return <IconCmp size={36} stroke={1.4} />;
  };
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Click-outside to close the kebab menu
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

  return (
    <div
      className={styles.card}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(template)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(template); } }}
    >
      <div className={styles.thumb}>
        {renderIcon()}
      </div>

      <div className={styles.meta}>
        <b className={styles.name}>{template.name}</b>
        <small className={styles.sub}>
          {template.category ? <>{template.category} · </> : null}
          {formatRelative(template.updatedAt)}
        </small>
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
