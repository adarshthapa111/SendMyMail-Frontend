import { useEffect, useRef, useState } from 'react';

const DEBOUNCE_MS = 200;

/**
 * Tracks a local value that mirrors `external` but only commits via `onCommit`
 * after the user stops typing for DEBOUNCE_MS. External changes (e.g. undo,
 * selection change, programmatic updates) flow back into the local value.
 *
 * Use for text/url/raw-html inputs where each keystroke would otherwise
 * trigger a preview round-trip. Don't use for color/dropdown/stepper inputs —
 * those should commit immediately for instant feedback.
 */
export function useDebouncedCommit(external: string, onCommit: (next: string) => void) {
  const [local, setLocal] = useState(external);
  const timerRef = useRef<number | null>(null);
  const lastCommittedRef = useRef(external);

  // Sync external → local when it changes from outside (and we're not
  // mid-edit waiting to commit our own value).
  useEffect(() => {
    if (external !== lastCommittedRef.current) {
      setLocal(external);
      lastCommittedRef.current = external;
    }
  }, [external]);

  const onChange = (next: string) => {
    setLocal(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      lastCommittedRef.current = next;
      onCommit(next);
    }, DEBOUNCE_MS);
  };

  // Flush on unmount so in-flight edits aren't lost when selection moves away.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        if (local !== lastCommittedRef.current) onCommit(local);
      }
    };
    // We intentionally don't depend on local — only run on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [local, onChange] as const;
}
