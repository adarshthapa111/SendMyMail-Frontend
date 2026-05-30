import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectPreheader, selectSubject } from '../store/selectors';
import { setPreheader, setSubject } from '../store/slices/editorSlice';
import { useDebouncedCommit } from './inspector/controls/useDebouncedCommit';
import styles from '@styles/components/EmailSettingsBar.module.css';

/**
 * Top-of-canvas strip for email-level metadata: Subject + Preheader.
 *
 * Subject lives in editor state (not the MJML tree — MJML has no subject
 * element; it's an ESP-level concern used at send time).
 * Preheader lives in the tree as mj-preview content (compiles into the HTML
 * head naturally via mjml2html).
 *
 * Both inputs debounce 200ms before committing — preheader edits go through
 * the same history machinery as any other tree mutation.
 */
export default function EmailSettingsBar() {
  const dispatch = useAppDispatch();
  const subject = useAppSelector(selectSubject);
  const preheader = useAppSelector(selectPreheader);

  const [localSubject, onSubject] = useDebouncedCommit(subject, (v) => dispatch(setSubject(v)));
  const [localPreheader, onPreheader] = useDebouncedCommit(preheader, (v) =>
    dispatch(setPreheader(v))
  );

  return (
    <div className={styles.bar}>
      <label className={styles.field}>
        <span className={styles.label}>Subject</span>
        <input
          type="text"
          className={styles.input}
          placeholder="Your email subject"
          value={localSubject}
          onChange={(e) => onSubject(e.target.value)}
        />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Preheader</span>
        <input
          type="text"
          className={styles.input}
          placeholder="Short preview shown in the inbox list"
          value={localPreheader}
          onChange={(e) => onPreheader(e.target.value)}
        />
      </label>
    </div>
  );
}
