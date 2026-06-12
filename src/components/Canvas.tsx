import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectNode } from '../store/slices/editorSlice';
import { RenderNode } from '../canvas/renderTree';
import styles from '@styles/components/Canvas.module.css';

/* Editor canvas — pure design surface. Subject + preheader inputs that
   used to live above the canvas (in EmailSettingsBar) moved to Campaign
   (Feature 06) per feature-templates PR 2. The canvas just renders the
   tree being edited.

   feature-editor-premium-polish V1:
   - canvasViewport toggles between desktop (full 600px) and mobile
     (clamped to 375px with subtle phone-frame chrome)
   - canvas chrome: dot-pattern backdrop + paper-card shadow around
     the email (cleaner + dramatic per design decision) */
export default function Canvas() {
  const dispatch = useAppDispatch();
  const tree = useAppSelector((s) => s.editor.tree);
  const viewport = useAppSelector((s) => s.editor.canvasViewport);

  return (
    <main className={styles.canvas} onClick={() => dispatch(selectNode(null))}>
      <div
        className={`${styles.column} ${viewport === 'mobile' ? styles.columnMobile : ''}`}
        onClick={(e) => e.stopPropagation()}
        data-viewport={viewport}
      >
        <div className={styles.frame}>
          <RenderNode node={tree} path={[]} />
        </div>
      </div>
    </main>
  );
}
