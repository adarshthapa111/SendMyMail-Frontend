import { useEffect, useState, type MouseEvent } from 'react';
import { useAppSelector } from '../store/hooks';
import styles from '@styles/canvas/FloatingTextToolbar.module.css';

interface Pos {
  top: number;
  left: number;
}

/**
 * Floating Bold/Italic/Underline/Link toolbar that appears above the user's
 * text selection while in inline edit mode.
 *
 * Uses document.execCommand which is deprecated but still works everywhere and
 * is the simplest cross-browser path. The modern replacement is Selection API
 * + Range manipulation — more code, same outcome. Can swap later.
 *
 * Key detail: button handlers use onMouseDown + preventDefault rather than
 * onClick. Clicking would blur the contentEditable, collapsing the selection
 * before the command can apply. preventDefault on mousedown keeps the
 * selection intact.
 */
export default function FloatingTextToolbar() {
  const editingId = useAppSelector((s) => s.editor.editingTextId);
  const [pos, setPos] = useState<Pos | null>(null);

  useEffect(() => {
    if (!editingId) {
      setPos(null);
      return;
    }

    const onSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setPos(null);
        return;
      }

      // Ensure the selection is inside our active editable.
      const anchor = sel.anchorNode;
      const anchorEl =
        anchor?.nodeType === Node.ELEMENT_NODE
          ? (anchor as Element)
          : anchor?.parentElement;
      const editable = anchorEl?.closest('[contenteditable="true"]');
      if (!editable) {
        setPos(null);
        return;
      }

      const rect = sel.getRangeAt(0).getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setPos(null);
        return;
      }

      // Viewport-relative coordinates; toolbar uses position: fixed.
      setPos({
        top: rect.top - 38,
        left: rect.left + rect.width / 2,
      });
    };

    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [editingId]);

  if (!editingId || !pos) return null;

  const apply =
    (cmd: string, value?: string) =>
    (e: MouseEvent<HTMLButtonElement>) => {
      // Prevent blur of the contentEditable; preserves the selection.
      e.preventDefault();
      e.stopPropagation();
      document.execCommand(cmd, false, value);
    };

  const onLink = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const current = (sel.anchorNode?.parentElement?.closest('a') as HTMLAnchorElement | null)?.href;
    // eslint-disable-next-line no-alert
    const url = window.prompt('Link URL', current ?? 'https://');
    if (url === null) return;
    if (url === '') {
      document.execCommand('unlink');
    } else {
      document.execCommand('createLink', false, url);
    }
  };

  return (
    <div
      className={styles.toolbar}
      style={{ top: pos.top, left: pos.left }}
      // mousedown also prevents blur when clicking on the toolbar background
      onMouseDown={(e) => e.preventDefault()}
      role="toolbar"
      aria-label="Text formatting"
    >
      <button type="button" className={styles.btn} onMouseDown={apply('bold')} title="Bold (⌘B)">
        <b>B</b>
      </button>
      <button type="button" className={styles.btn} onMouseDown={apply('italic')} title="Italic (⌘I)">
        <i>I</i>
      </button>
      <button type="button" className={styles.btn} onMouseDown={apply('underline')} title="Underline (⌘U)">
        <u>U</u>
      </button>
      <button type="button" className={styles.btn} onMouseDown={onLink} title="Link (⌘K)">
        🔗
      </button>
    </div>
  );
}
