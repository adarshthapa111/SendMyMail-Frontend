import { useAppDispatch, useAppSelector } from '../store/hooks';
import { redo, togglePreview, undo } from '../store/slices/editorSlice';
import { setView } from '../store/slices/appSlice';
import { selectCanRedo, selectCanUndo } from '../store/selectors';
import ExportDropdown from './integrations/ExportDropdown';
import styles from '@styles/components/Toolbar.module.css';

const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
const META = isMac ? '⌘' : 'Ctrl+';

export default function Toolbar() {
  const dispatch = useAppDispatch();
  const canUndo = useAppSelector(selectCanUndo);
  const canRedo = useAppSelector(selectCanRedo);

  return (
    <div className={styles.toolbar}>
      <div className={styles.brand}>SendMyMail Editor</div>

      <div className={styles.iconGroup}>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={() => dispatch(undo())}
          disabled={!canUndo}
          title={`Undo (${META}Z)`}
          aria-label="Undo"
        >
          ↶
        </button>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={() => dispatch(redo())}
          disabled={!canRedo}
          title={`Redo (${META}⇧Z)`}
          aria-label="Redo"
        >
          ↷
        </button>
      </div>

      <div className={styles.spacer} />

      <button
        type="button"
        className={styles.secondaryBtn}
        onClick={() => dispatch(setView('integrations'))}
        title="Manage integrations"
      >
        <span aria-hidden="true">🔌</span>
        <span>Integrations</span>
      </button>

      <ExportDropdown />

      <button
        type="button"
        className={styles.previewBtn}
        onClick={() => dispatch(togglePreview())}
        title="Open preview"
      >
        <span aria-hidden="true">▢</span>
        <span>Preview</span>
      </button>
    </div>
  );
}
