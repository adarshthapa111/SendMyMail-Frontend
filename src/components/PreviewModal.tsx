import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { togglePreview } from '../store/slices/editorSlice';
import { renderTemplate } from '../api/renderTemplate';
import styles from '@styles/components/PreviewModal.module.css';

type Device = 'desktop' | 'mobile' | 'text' | 'html';

const DEBOUNCE_MS = 400;
const INITIAL_HTML = `<!doctype html><html><body style="font-family:-apple-system,sans-serif;padding:24px;color:#888;text-align:center;">Loading preview…</body></html>`;

/**
 * Full-screen modal preview with Desktop / Mobile / Plain-text tabs.
 * Mounted only while `previewOpen` is true — no backend traffic when closed.
 *
 * Same fetch machinery as the old side-panel: 400ms debounce on tree changes,
 * AbortController cancels stale in-flight requests so the iframe never shows
 * a response from a tree the user has moved past.
 */
export default function PreviewModal() {
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => s.editor.previewVisible);
  const tree = useAppSelector((s) => s.editor.tree);

  const [device, setDevice] = useState<Device>('desktop');
  const [html, setHtml] = useState<string>(INITIAL_HTML);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore focus to whatever opened the modal (likely the toolbar button).
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const firstFetchRef = useRef(true);

  useEffect(() => {
    if (!open) {
      firstFetchRef.current = true;
      return;
    }

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    // Defer focus to next tick so the modal is in the DOM
    requestAnimationFrame(() => closeBtnRef.current?.focus());

    return () => {
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open]);

  // Fetch loop: immediate on open, then 400ms-debounced on tree mutations.
  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    const delay = firstFetchRef.current ? 0 : DEBOUNCE_MS;

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await renderTemplate({
          tree,
          format: 'html',
          operationType: 'preview',
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setHtml(result);
        firstFetchRef.current = false;
      } catch (err: unknown) {
        if (axios.isCancel(err) || controller.signal.aborted) return;
        const message =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Preview compilation failed';
        setError(message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, delay);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, tree]);

  // Esc closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        dispatch(togglePreview());
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, dispatch]);

  // Extract plain text from compiled HTML on demand (cheap; runs only when tab visible)
  const plainText = useMemo(() => {
    if (device !== 'text' || !html) return '';
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return (doc.body.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim();
    } catch {
      return '';
    }
  }, [device, html]);

  if (!open) return null;

  const close = () => dispatch(togglePreview());

  const tabs: Array<{ id: Device; label: string }> = [
    { id: 'desktop', label: 'Desktop' },
    { id: 'mobile', label: 'Mobile' },
    { id: 'html', label: 'HTML' },
    { id: 'text', label: 'Plain text' },
  ];

  const copyHtml = async () => {
    try {
      await navigator.clipboard.writeText(html);
    } catch {
      // Clipboard API can fail in sandboxed contexts; ignore silently for v1.
    }
  };

  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Email preview"
    >
      <div className={styles.modal}>
        <header className={styles.header}>
          <div className={styles.titleGroup}>
            <span className={styles.title}>Preview</span>
            {loading && <span className={styles.status}>Compiling…</span>}
          </div>

          <div className={styles.tabs} role="tablist">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={device === t.id}
                className={`${styles.tab} ${device === t.id ? styles.tabActive : ''}`}
                onClick={() => setDevice(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            className={styles.closeBtn}
            onClick={close}
            aria-label="Close preview"
            title="Close (Esc)"
          >
            ✕
          </button>
        </header>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.body}>
          {device === 'html' ? (
            <div className={styles.htmlView}>
              <button type="button" className={styles.copyBtn} onClick={copyHtml}>
                Copy HTML
              </button>
              <pre className={styles.htmlSource}>{html}</pre>
            </div>
          ) : device === 'text' ? (
            <pre className={styles.plainText}>{plainText || '(no content)'}</pre>
          ) : device === 'mobile' ? (
            <div className={styles.phoneFrame}>
              <div className={styles.phoneNotch} aria-hidden="true" />
              <iframe
                key="mobile"
                srcDoc={html}
                sandbox="allow-same-origin"
                title="Email preview — mobile"
                className={styles.mobileIframe}
              />
            </div>
          ) : (
            <iframe
              key="desktop"
              srcDoc={html}
              sandbox="allow-same-origin"
              title="Email preview — desktop"
              className={styles.desktopIframe}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
