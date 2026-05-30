import { useEffect, useRef, type CSSProperties, type KeyboardEvent } from 'react';

interface Props {
  /** Initial HTML/text. Captured once on mount; subsequent prop changes are ignored. */
  initialValue: string;
  /** When false, content commits as plain textContent; Enter exits edit mode. */
  multiline?: boolean;
  onCommit: (next: string) => void;
  onExit: () => void;
  className?: string;
  style?: CSSProperties;
}

const DEBOUNCE_MS = 200;

/**
 * Edit-mode wrapper for contentEditable.
 *
 * The cursor-position trap: if you bind innerHTML/value to props and let React
 * reconcile on every keystroke, the browser repaints the DOM and the cursor
 * jumps to position 0. Fix: set innerHTML EXACTLY ONCE on mount via a ref, then
 * the browser owns the DOM until the component unmounts. We only push back to
 * Redux (via debounced onCommit) — we never pull from props.
 */
export default function ContentEditable({
  initialValue,
  multiline = true,
  onCommit,
  onExit,
  className,
  style,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  // Set initial content + place caret at end + focus, ONCE on mount.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = initialValue;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    // Intentionally don't depend on initialValue — see component comment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Flush any pending debounced commit on unmount so edits aren't lost.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        const el = ref.current;
        if (el) onCommit(multiline ? el.innerHTML : el.textContent ?? '');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flush = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const el = ref.current;
    if (el) onCommit(multiline ? el.innerHTML : el.textContent ?? '');
  };

  const onInput = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(flush, DEBOUNCE_MS);
  };

  const onBlur = () => {
    flush();
    onExit();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      flush();
      onExit();
      return;
    }
    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
      flush();
      onExit();
    }
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className={className}
      style={style}
      onInput={onInput}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      // Stop propagation so the canvas's "click background to deselect"
      // doesn't fire when the user clicks inside the editable.
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      spellCheck
    />
  );
}
