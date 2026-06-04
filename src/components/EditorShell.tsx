import Toolbar from './Toolbar';
import EditorBody from './EditorBody';
import styles from '@styles/components/EditorShell.module.css';

interface EditorShellProps {
  /** Slot for context-specific Toolbar actions (e.g. legacy callers that
      want to inject extra buttons into the Toolbar). Forwarded as the
      Toolbar's `extras`. */
  toolbarExtras?: React.ReactNode;
}

/* Legacy editor shell — renders the original Toolbar + the editor body.
   Used by `app.view === 'editor'` (the pre-router original-app entry
   point). The template Builder no longer uses this; it renders
   <BuilderTopBar /> + <EditorBody /> directly. */
export default function EditorShell({ toolbarExtras }: EditorShellProps = {}) {
  return (
    <div className={styles.shell}>
      <Toolbar extras={toolbarExtras} />
      <EditorBody />
    </div>
  );
}
